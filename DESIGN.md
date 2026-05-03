Below is a full plan for **zero-label heuristic v1**: a web app that predicts the least crowded subway platform zone using public MTA data, while collecting observations for a future ML model.

# 1. Product definition

## Core promise

Show the rider:

> **“For this train at this station, stand in this platform zone for the best chance of a less crowded car.”**

Use the five-zone system:

```text
front | front-middle | middle | rear-middle | rear
```

The app should **not** claim “live occupancy” for NYC Subway. GTFS-Realtime supports vehicle and per-carriage occupancy fields, including `occupancy_status`, `occupancy_percentage`, and `multi_carriage_details`, but agencies must actually publish them. NYC Subway’s public GTFS-RT reference says fields not specified are not used, and its `VehiclePosition` implementation does not document occupancy or carriage-level data. ([General Transit Feed Specification][1])

Recommended wording:

```text
Estimated less crowded zone
Based on station layout, ridership patterns, live headways, and rider feedback.
```

# 2. Data sources

| Data source                                 | Use in v1                                                                                      | Why it matters                                                                                                                                            |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **MTA GTFS-RT subway feeds**                | Upcoming trains, trip updates, stop predictions, route/direction, headway, delay/stall signals | MTA provides subway and railroad realtime feeds in GTFS-RT format. ([MTA][2])                                                                             |
| **MTA Static GTFS**                         | Stops, routes, schedules, trips, stop order, shapes                                            | Static GTFS contains schedules and associated data for NYCT Subway, including station/stop locations, routes, and schedule info. ([State of New York][3]) |
| **MTA Subway Hourly Ridership**             | Station/time boarding pressure                                                                 | Gives subway ridership estimates by station complex and hour. ([State of New York][4])                                                                    |
| **MTA Subway Origin-Destination Ridership** | Likely destination/transfer patterns                                                           | Gives estimated passenger volumes between origin-destination pairs by month, day of week, and hour. ([MTA][5])                                            |
| **MTA Subway Entrances and Exits**          | Which end of station/platform likely gets more boarding pressure                               | Dataset includes subway/SIR entrance and exit locations, coordinates, entry/exit availability, and entrance type. ([State of New York][6])                |
| **User feedback**                           | Future labels                                                                                  | Needed later to measure whether recommendations are actually right.                                                                                       |

## 2.1 Dataset download and repository policy

The app should download and import public datasets. The repo should be reproducible, not data-heavy.

Commit:

```text
dataset_manifest.json
download/import scripts
schema migrations
small test fixtures
```

Do not commit:

```text
full GTFS zips
full CSV exports
GTFS-RT snapshots
local database files
processed Parquet files
```

Raw transit datasets change, can get large, and will bloat Git history. GitHub warns at files above 50 MiB, blocks normal Git pushes above 100 MiB, and recommends keeping repositories small for performance. ([GitHub Docs][7])

Git LFS is an option for large files, but avoid it for this project unless you need to version a frozen training dataset. It stores file contents separately and leaves pointer files in Git, but it adds quota and operational complexity. ([Git LFS][8])

Recommended repo structure:

```text
repo/
  app/
  scripts/
    download-static-gtfs.ts
    download-socrata-dataset.ts
    sync-gtfs-realtime.ts
    import-all.ts
  data/
    raw/          # gitignored
    processed/    # gitignored
    samples/      # tiny committed examples only
  dataset_manifest.json
  .gitignore
```

Recommended `.gitignore` entries:

```gitignore
data/raw/
data/processed/
*.sqlite
*.duckdb
*.parquet
*.csv
*.zip
!data/samples/
!data/samples/**
```

The dataset manifest should make the data pipeline reproducible:

```json
{
  "datasets": [
    {
      "name": "mta_gtfs_static",
      "type": "zip",
      "url": "https://...",
      "refresh": "daily",
      "store": "data/raw/gtfs_static/"
    },
    {
      "name": "subway_entrances_exits",
      "type": "socrata",
      "domain": "data.ny.gov",
      "dataset_id": "i9wp-a4ja",
      "refresh": "monthly"
    },
    {
      "name": "subway_hourly_ridership",
      "type": "socrata",
      "domain": "data.ny.gov",
      "dataset_id": "5wq4-mkjj",
      "refresh": "daily_or_weekly"
    }
  ]
}
```

The importer should fetch:

1. GTFS Static zip for schedules, stops, routes, trips, and shapes. MTA publishes static GTFS for subway and other modes. ([State of New York][3])
2. GTFS-RT subway feeds for live arrivals, trip updates, and alerts. MTA provides subway and railroad realtime data in GTFS-RT format. ([MTA][2])
3. Socrata/Open Data datasets for stations, entrances/exits, hourly ridership, and OD ridership. Data.ny.gov exposes datasets through SODA APIs and downloadable JSON/CSV formats. ([Data.NY.gov Developers][9])

Commit only tiny samples for tests and CI:

```text
data/samples/
  gtfs_static_3_stations.zip
  entrances_exits_sample.csv
  hourly_ridership_sample.csv
```

# 3. V1 user flow

## Primary use case

User opens the website near or before a station.

Flow:

1. Select or auto-detect station.
2. Select route and direction.
3. Optionally enter destination.
4. App shows upcoming trains.
5. User taps a train.
6. App recommends a zone:

```text
Recommended: rear-middle
Confidence: medium

Why:
• Main station entrances are weighted toward the front.
• This train is following a longer-than-usual headway.
• Historical ridership is high for this hour.
```

7. After boarding, app asks for feedback:

```text
Which zone did you board?
front | front-middle | middle | rear-middle | rear

How crowded was it?
1 empty | 2 seats available | 3 standing comfortable | 4 packed | 5 could not board

Did another zone look better?
front | middle | rear | unsure
```

# 4. Heuristic model

The v1 model produces a **crowding score** for each of the five zones. Lower score = better.

```text
score(zone) =
  entrance_pressure(zone)
+ live_headway_pressure(zone)
+ station_hourly_demand(zone)
+ downstream_destination_pressure(zone)
+ transfer_pressure(zone)
+ route_baseline_pressure(zone)
- confidence_adjustment(zone)
```

Then rank zones by score.

## 4.1 Zone mapping

For each station + route + direction:

1. Determine the train’s direction of travel using static GTFS stop sequence and shape geometry.
2. Define **front** as the direction the train is moving.
3. Project entrance/exit coordinates onto the approximate station/track axis.
4. Split that axis into five buckets:

```text
0–20%   = rear
20–40%  = rear-middle
40–60%  = middle
60–80%  = front-middle
80–100% = front
```

For the opposite direction, front/rear flips.

This does not need to be perfect for v1. The important thing is to produce a consistent, debuggable mapping.

# 5. Feature design

## Feature group A: entrance pressure

Goal: predict where people entering the station are likely to stand.

For each entrance/exit near a station:

```text
entrance_weight =
  entry_allowed
* entrance_type_weight
* distance_to_platform_weight
* hourly_station_demand
```

Then assign each entrance to one of the five zones.

Example:

```json
{
  "front": 0.42,
  "front_middle": 0.28,
  "middle": 0.15,
  "rear_middle": 0.10,
  "rear": 0.05
}
```

Interpretation: the front side likely receives the most boarding pressure.

## Feature group B: live headway pressure

A train after a long gap is usually more crowded.

For a given station, route, and direction:

```text
headway_before = arrival_time_this_train - arrival_time_previous_train
headway_after = arrival_time_next_train - arrival_time_this_train
```

Then:

```text
headway_pressure = headway_before / typical_headway_for_route_time
```

If the train follows a long gap, increase the score for zones that already have high entrance pressure.

```text
live_headway_pressure(zone) =
  entrance_pressure(zone) * max(0, headway_pressure - 1)
```

## Feature group C: station hourly demand

Use hourly ridership by station complex. For the current station/hour:

```text
station_demand_index =
  current_hour_ridership / median_hourly_ridership_for_station
```

High demand increases all zone scores, but especially zones with high entrance pressure.

## Feature group D: downstream destination pressure

This is optional for v1, but useful.

Using the OD dataset, estimate where riders from this origin/time are likely going. If many riders are headed to a destination where exits/transfers are front-weighted, they may prefer front cars.

For each likely destination:

```text
destination_weight =
  OD_estimated_trips(origin, destination, hour, day)
```

Then map that destination’s exits/transfers to zones. Add pressure to zones that are attractive for those destinations.

This gives you:

```text
“Lots of riders from this station/time are likely headed to Union Sq or Times Sq, and the transfer/exits there favor the middle/front.”
```

## Feature group E: transfer pressure

For major transfer stations, riders often cluster near transfer passageways. This can be built manually first.

Create a small hand-authored table:

```json
{
  "Times Sq-42 St": {
    "N": {
      "middle": 0.5,
      "front_middle": 0.3,
      "rear_middle": 0.2
    }
  },
  "Union Sq-14 St": {
    "N": {
      "middle": 0.4,
      "rear_middle": 0.4,
      "front_middle": 0.2
    }
  }
}
```

Do this only for your common stations at first.

# 6. Confidence scoring

Every recommendation should include confidence.

Use simple rules:

```text
high confidence:
  strong zone difference
  good entrance mapping
  live GTFS-RT available
  station has enough ridership/OD data
  known route/direction

medium confidence:
  moderate zone difference
  some missing geometry
  no destination entered

low confidence:
  weak difference between zones
  complex station
  no reliable entrance-zone mapping
  reroute/delay/terminal case
```

Example:

```json
{
  "recommended_zone": "rear-middle",
  "confidence": "medium",
  "scores": {
    "front": 0.82,
    "front_middle": 0.74,
    "middle": 0.61,
    "rear_middle": 0.38,
    "rear": 0.44
  }
}
```

# 7. Website UI plan

## Page 1: Home / Trip setup

Components:

* Station search
* Route selector
* Direction selector
* Optional destination field
* “Use current location” button
* Recent trips

Primary CTA:

```text
Find best platform zone
```

## Page 2: Upcoming trains

Show train cards:

```text
L train → Manhattan
Arrives in 3 min
Following gap: 7 min
Crowding estimate: medium-high
Recommended zone: rear-middle
```

Each card opens the recommendation page.

## Page 3: Recommendation

Main visual: horizontal train/platform diagram.

```text
REAR          FRONT
[rear] [rear-middle] [middle] [front-middle] [front]
          ↑
 Recommended
```

Show:

```text
Best zone: rear-middle
Confidence: medium
Reason:
• Most entrances are closer to the front.
• This train is after a longer gap.
• This station is above normal ridership for this hour.
```

Add secondary suggestions:

```text
Also okay: rear
Avoid: front, front-middle
```

## Page 4: Feedback collection

After a few minutes, or when the user taps “I boarded”:

```text
Where did you board?
front | front-middle | middle | rear-middle | rear

How crowded was it?
1 Empty
2 Seats available
3 Standing but comfortable
4 Packed
5 Could not board

Did another part look better?
front | middle | rear | unsure
```

Keep this extremely fast. The best feedback UI is under 10 seconds.

## Page 5: Personal dashboard

Show:

```text
Your observations: 47
Most common route: L
Best-performing recommendation: rear-middle
Average crowding when following recommendation: 2.6 / 5
Average crowding otherwise: 3.3 / 5
```

Also show data quality:

```text
Prediction mode: heuristic
Training labels collected: 47
ML readiness: early
```

# 8. Database schema

## users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  anonymous_id TEXT,
  home_station_id TEXT,
  privacy_mode TEXT DEFAULT 'anonymous'
);
```

## stations

```sql
CREATE TABLE stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gtfs_stop_id TEXT,
  complex_id TEXT,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION
);
```

## station_zone_profiles

Precomputed entrance/exit pressure per station, route, direction.

```sql
CREATE TABLE station_zone_profiles (
  id UUID PRIMARY KEY,
  station_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  zone TEXT NOT NULL,
  entrance_pressure DOUBLE PRECISION NOT NULL,
  transfer_pressure DOUBLE PRECISION DEFAULT 0,
  exit_pressure DOUBLE PRECISION DEFAULT 0,
  confidence DOUBLE PRECISION DEFAULT 0.5,
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
```

## prediction_requests

Every time the app makes a recommendation.

```sql
CREATE TABLE prediction_requests (
  id UUID PRIMARY KEY,
  user_id UUID,
  station_id TEXT NOT NULL,
  route_id TEXT NOT NULL,
  direction TEXT NOT NULL,
  destination_station_id TEXT,
  requested_at TIMESTAMP NOT NULL DEFAULT now(),
  train_trip_id TEXT,
  train_arrival_time TIMESTAMP,
  recommended_zone TEXT NOT NULL,
  confidence TEXT NOT NULL,
  scores JSONB NOT NULL,
  explanation JSONB
);
```

## ride_observations

The future ML goldmine.

```sql
CREATE TABLE ride_observations (
  id UUID PRIMARY KEY,
  prediction_request_id UUID REFERENCES prediction_requests(id),
  user_id UUID,
  observed_at TIMESTAMP NOT NULL DEFAULT now(),
  boarded_zone TEXT NOT NULL,
  crowding_rating INTEGER CHECK (crowding_rating BETWEEN 1 AND 5),
  seat_available BOOLEAN,
  could_board BOOLEAN DEFAULT true,
  better_zone_observed TEXT,
  notes TEXT
);
```

## realtime_snapshots

Optional, for debugging and future model training.

```sql
CREATE TABLE realtime_snapshots (
  id UUID PRIMARY KEY,
  captured_at TIMESTAMP NOT NULL DEFAULT now(),
  station_id TEXT,
  route_id TEXT,
  direction TEXT,
  feed_timestamp TIMESTAMP,
  arrivals JSONB NOT NULL
);
```

# 9. API design

## `GET /api/stations/search?q=bedford`

Returns station candidates.

```json
[
  {
    "station_id": "L08",
    "name": "Bedford Av",
    "routes": ["L"]
  }
]
```

## `GET /api/trains?station_id=L08&route=L&direction=W`

Returns upcoming trains.

```json
{
  "station": "Bedford Av",
  "route": "L",
  "direction": "Manhattan-bound",
  "trains": [
    {
      "trip_id": "123",
      "arrival_time": "2026-05-03T08:42:00-04:00",
      "minutes_away": 3,
      "headway_before_minutes": 7,
      "headway_after_minutes": 4
    }
  ]
}
```

## `POST /api/predict`

Request:

```json
{
  "station_id": "L08",
  "route_id": "L",
  "direction": "W",
  "destination_station_id": "A27",
  "trip_id": "123"
}
```

Response:

```json
{
  "prediction_id": "uuid",
  "recommended_zone": "rear-middle",
  "confidence": "medium",
  "scores": {
    "front": 0.82,
    "front-middle": 0.74,
    "middle": 0.61,
    "rear-middle": 0.38,
    "rear": 0.44
  },
  "why": [
    "Main entrances are concentrated toward the front.",
    "This train is following a longer-than-usual gap.",
    "Current hour has above-average station demand."
  ]
}
```

## `POST /api/observations`

Request:

```json
{
  "prediction_id": "uuid",
  "boarded_zone": "rear-middle",
  "crowding_rating": 2,
  "seat_available": true,
  "better_zone_observed": "rear"
}
```

# 10. Heuristic scoring pseudocode

```python
ZONES = ["front", "front-middle", "middle", "rear-middle", "rear"]

def predict_zone(context):
    scores = {}

    for zone in ZONES:
        entrance = context.zone_profile[zone].entrance_pressure
        transfer = context.zone_profile[zone].transfer_pressure
        exit_pressure = context.destination_exit_pressure.get(zone, 0)
        route_base = context.route_baseline.get(zone, 0)

        demand = context.station_demand_index
        headway = context.headway_pressure

        score = 0
        score += 0.40 * entrance * demand
        score += 0.20 * entrance * headway
        score += 0.15 * transfer
        score += 0.15 * exit_pressure
        score += 0.10 * route_base

        scores[zone] = score

    recommended = min(scores, key=scores.get)
    confidence = compute_confidence(scores, context)

    return {
        "recommended_zone": recommended,
        "scores": scores,
        "confidence": confidence
    }
```

Initial weights are hand-tuned. Later, real observations can learn these weights.

# 11. Tech stack

## Simple, fast stack

* **Frontend:** Next.js + React + Tailwind
* **Backend:** Next.js API routes/Server Actions first; FastAPI only if data processing outgrows Next.js
* **Database:** Postgres for the app; add PostGIS when generated station geometry needs it
* **Local data work:** SQLite or DuckDB is acceptable for importer prototyping and analysis
* **Jobs:** scripts first, then cron or background worker for static data sync
* **Realtime parsing:** Python or Node GTFS-RT protobuf parser
* **Maps:** Mapbox, MapLibre, or Google Maps
* **Auth:** anonymous-first, optional login later

## Why PostGIS matters

PostGIS should be added when generated station-zone profiles need geospatial operations:

* entrance-to-station distance,
* projecting entrance coordinates onto station axis,
* grouping entrances by zone,
* finding nearby station entrances,
* mapping route shapes.

# 12. Data pipeline

Use three data layers.

## Raw cache

Downloaded source files go in:

```text
data/raw/
```

This layer is local-only, gitignored, and disposable. It can be deleted and rebuilt from `dataset_manifest.json`.

## Processed database

Imported and normalized data goes into Postgres/PostGIS for the real app. SQLite or DuckDB can be used locally for importer development and analysis.

Candidate tables:

```text
stations
stops
routes
trips
stop_times
shapes
entrances_exits
hourly_ridership
od_ridership
station_zone_profiles
```

Do not require every table on day one. Start with stations, routes, entrances/exits, predictions, observations, and zone profiles. Add full GTFS schedule tables when automatic direction/front-rear mapping needs them.

## Generated feature tables

The app should mostly read from precomputed tables:

```text
station_zone_profiles
station_hourly_demand
od_destination_pressure
```

That keeps runtime prediction fast and makes the heuristic easy to debug.

## Download/import scripts

Scripts should be manifest-driven:

```text
scripts/
  download-static-gtfs.ts
  download-socrata-dataset.ts
  sync-gtfs-realtime.ts
  import-all.ts
```

Developer commands:

```bash
npm run data:download
npm run data:import
npm run data:build-zone-profiles
npm run dev
```

One-command bootstrap:

```bash
npm run bootstrap
```

`bootstrap` should do:

```text
download -> validate -> import -> precompute zone profiles -> start app
```

## Static import jobs

1. Download/refresh static GTFS.
2. Import stops, routes, trips, stop_times, shapes.
3. Import station entrances/exits.
4. Import hourly ridership.
5. Import OD ridership.
6. Recompute station-zone profiles.

## Realtime jobs

Every 30-60 seconds while the app/server is running:

1. Fetch GTFS-RT feeds.
2. Parse upcoming train arrivals.
3. Cache arrivals by station/route/direction.
4. Compute live headways.
5. Store snapshots only when debugging is explicitly enabled.

Poll alerts every 1-5 minutes.

## Refresh schedule

| Data              | Download behavior                                    |
| ----------------- | ---------------------------------------------------- |
| GTFS Static       | Daily or weekly                                      |
| GTFS-RT arrivals  | Poll every 30-60 seconds while app/server is running |
| Alerts            | Poll every 1-5 minutes                               |
| Entrances/exits   | Monthly/manual refresh                               |
| Hourly ridership  | Daily or weekly                                      |
| OD ridership      | Monthly                                              |
| User observations | Write continuously                                   |

MTA says its developer feeds provide subway and railroad realtime data in GTFS-RT format, and custom extensions may require the relevant protobuf files. ([MTA][2])

# 13. MVP build sequence

## Phase 0: offline notebook

Goal: prove the heuristic works on a few stations.

Build:

* Load static GTFS.
* Load entrances/exits.
* Pick 5–10 stations you use.
* Manually map station direction/front/rear.
* Compute entrance pressure by zone.
* Print recommended zone for sample routes.

Output:

```text
Bedford Av, L Manhattan-bound, 8 AM → rear-middle
Union Sq, 6 Uptown, 6 PM → front-middle
```

## Phase 1: no-login web app

Build:

* Station search
* Route/direction selector
* Static heuristic recommendation
* Feedback form
* Store predictions and observations

Do not integrate GTFS-RT yet.

## Phase 2: live train integration

Add:

* Upcoming trains
* Headway calculation
* Delay/gap pressure
* Per-train recommendations

## Phase 3: destination-aware recommendations

Add:

* Optional destination station
* OD-based downstream pressure
* Exit/transfer-aware recommendation

## Phase 4: personal dashboard

Add:

* Your observations
* Accuracy proxy
* Average crowding by zone
* Route/station patterns
* “Your best zones” table

## Phase 5: ML readiness

When you reach about 100–150 personal observations, start comparing:

* heuristic recommendation,
* always-middle baseline,
* always-rear baseline,
* your reported crowding.

At 300–1,000 observations, train a small model.

# 14. What to build first

The first useful version should support:

```text
Station: Bedford Av
Route: L
Direction: Manhattan-bound
Time: now
Destination: optional

Output:
Recommended zone: rear-middle
Confidence: medium
Reason:
- entrances skew front
- current hour has high demand
- train follows a long gap
```

Skip these at first:

* exact car numbers,
* live per-car occupancy wording,
* account system,
* complex station rendering,
* ML training,
* every station in the subway.

# 15. Data collection strategy

Because you only ride about twice a day, optimize for **low-friction, high-quality feedback**.

## Minimum feedback

One tap:

```text
How crowded was your car?
1 | 2 | 3 | 4 | 5
```

## Better feedback

Three taps:

```text
Zone boarded:
front | front-middle | middle | rear-middle | rear

Crowding:
1 empty | 2 seats | 3 standing | 4 packed | 5 could not board

Did another zone look better?
front | middle | rear | unsure
```

## Optional passive context

Store automatically:

* station,
* route,
* direction,
* time,
* train trip ID if available,
* predicted zone,
* all zone scores,
* headway,
* station demand index,
* whether destination was provided.

Do **not** collect precise location history unless necessary. For privacy, you can keep GPS use local to station detection and store only the selected station.

# 16. Evaluation plan

Even before ML, evaluate v1.

## Baselines

Compare your recommendation against:

```text
always front
always middle
always rear
random zone
nearest entrance zone
```

## Metrics

Track:

```text
average reported crowding rating
% rides with seat available
% rides rated 1–2
% rides rated 4–5
recommendation followed rate
confidence calibration
```

A good early goal:

```text
When user follows recommendation, average crowding rating is lower than always-middle by 0.3–0.5 points.
```

# 17. Risks and mitigations

| Risk                                            | Mitigation                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| Station geometry is messy                       | Start with manually validated stations you use often              |
| Entrances do not equal platform stair locations | Add manual station overrides                                      |
| Complex transfer stations are hard              | Mark low confidence                                               |
| User feedback is sparse                         | Make feedback one-tap and personal-value-driven                   |
| Model overclaims precision                      | Recommend zones, not exact car counts                             |
| Live GTFS identifiers are unstable              | Use trip/route/direction/arrival-time grouping, not only train ID |
| Recommendations conflict with “near my exit”    | Add preference toggle: “least crowded” vs “near exit”             |

# 18. Future ML upgrade path

Once enough observations exist, train one row per candidate zone:

```text
prediction_id
station_id
route_id
direction
hour
day_of_week
zone
entrance_pressure
headway_pressure
station_demand_index
destination_pressure
transfer_pressure
was_recommended
reported_crowding
```

First model:

```text
Gradient boosted trees or logistic regression
Target: expected crowding rating by zone
Recommendation: zone with lowest expected rating
```

Later model:

```text
Learning-to-rank model
Target: rank zones from least to most crowded
```

Do not start by predicting exact passengers per car. Start by predicting:

```text
Which of the five zones is likely least crowded?
```

# 19. Final v1 spec

## Product

A mobile-friendly website that recommends:

```text
front | front-middle | middle | rear-middle | rear
```

for a selected subway train.

## Input

* station,
* route,
* direction,
* optional destination,
* live upcoming train,
* current time.

## Output

* recommended zone,
* confidence,
* score breakdown,
* short explanation,
* feedback prompt.

## Backend

* Postgres/PostGIS,
* static GTFS importer,
* entrances/exits importer,
* ridership importer,
* GTFS-RT parser,
* heuristic scorer,
* feedback logger.

## Success criterion

The app is successful if, for your own rides, following the recommendation produces lower reported crowding than a simple baseline like “always stand in the middle.”

[1]: https://gtfs.org/documentation/realtime/reference/?utm_source=chatgpt.com "GTFS Realtime Reference"
[2]: https://www.mta.info/developers?utm_source=chatgpt.com "Developer Resources"
[3]: https://data.ny.gov/Transportation/MTA-General-Transit-Feed-Specification-GTFS-Static/fgm6-ccue?utm_source=chatgpt.com "MTA General Transit Feed Specification (GTFS) Static Data"
[4]: https://data.ny.gov/Transportation/MTA-Subway-Hourly-Ridership-Beginning-2025/5wq4-mkjj?utm_source=chatgpt.com "MTA Subway Hourly Ridership: Beginning 2025 | State of New ..."
[5]: https://www.mta.info/article/introducing-subway-origin-destination-ridership-dataset?utm_source=chatgpt.com "Introducing the Subway Origin-Destination Ridership dataset"
[6]: https://data.ny.gov/Transportation/MTA-Subway-Entrances-and-Exits-2024/i9wp-a4ja?utm_source=chatgpt.com "MTA Subway Entrances and Exits: 2024 | State of New York"
[7]: https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github "About large files on GitHub"
[8]: https://git-lfs.com/ "Git Large File Storage"
[9]: https://data.ny.gov/developers "Data.NY.gov Developers"
