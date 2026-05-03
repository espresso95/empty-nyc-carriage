# Incremental Implementation Plan

This plan turns `DESIGN.md` into a sequence of small, testable releases. The goal is to avoid building the full data platform before proving the core rider value: a useful, explainable recommendation for one selected train at one station.

## Guiding principles

- Build vertical slices, not isolated layers. Each phase should produce something usable in the browser.
- Start with fixtures and hand-authored station profiles, then replace them with imported data.
- Keep the scoring engine pure and deterministic so it can be tested independently of UI, database, and realtime feeds.
- Store every prediction and observation as soon as persistence exists; feedback is the path to future ML.
- Never describe the result as live occupancy. Use "estimated less crowded zone" language throughout.

## Verification notes

- Context7 Next.js docs support using App Router Server Components for server-side data reads, Server Actions for internal mutations, and Route Handlers for explicit request/response endpoints.
- Context7 and DeepWiki both support Drizzle as a lightweight TypeScript-first ORM with schema definitions, typed queries, and Drizzle Kit migrations.
- DeepWiki's `google/transit` reference confirms the static/realtime split: static GTFS is CSV schedule data, while GTFS-RT is protobuf data with `TripUpdate` as the relevant source for arrival predictions.
- The resulting MVP should avoid PostGIS, full GTFS schedule imports, dashboards, account tables, and realtime snapshots until those features are directly needed.

## Target stack

- App: Next.js App Router, React, TypeScript, Tailwind.
- Mutations: Server Actions for internal form submissions.
- API: Next.js route handlers only for JSON endpoints that need client-side fetching, such as station search and train lookup.
- Database: Postgres once persistence begins; add PostGIS only when generated station geometry needs it.
- Data access: Drizzle ORM and Drizzle Kit for schema-first typed queries and migrations.
- Jobs: simple scripts first, then scheduled jobs or a small worker.
- Realtime parsing: Node GTFS-RT parser initially, unless Python scripts become materially simpler for data import.

## Phase 0: Repo scaffold and product shell

Purpose: establish the app structure and visual language before data complexity. Keep this as one vertical slice on one page.

Build:

- Create the Next.js app with TypeScript and Tailwind.
- Add shared zone constants:

```ts
export const ZONES = [
  "front",
  "front-middle",
  "middle",
  "rear-middle",
  "rear",
] as const;
```

- Add a single `/` route with four UI states:
  - trip setup
  - upcoming train selection
  - recommendation detail
  - feedback prompt
- Use local fixture data for one station: Bedford Av, L, Manhattan-bound.
- Add a horizontal five-zone train/platform component.

Exit criteria:

- A user can click through setup, train selection, recommendation, and feedback screens.
- The recommendation page shows zone, confidence, scores, and explanation from static fixture data.
- No database, MTA API, auth, maps, extra routes, or geospatial work yet.

## Phase 1: Pure heuristic engine

Purpose: make the core model testable before connecting it to real data.

Build:

- Add a pure scorer module, for example `src/lib/prediction/scorer.ts`.
- Define typed inputs:
  - station id
  - route id
  - direction
  - optional destination id
  - zone profile
  - station demand index
  - headway pressure
  - route baseline
  - optional destination pressure
- Return:
  - recommended zone
  - confidence
  - score map
  - explanation reasons
  - debug feature contributions
- Add confidence rules based on:
  - gap between best and second-best score
  - profile confidence
  - missing destination
  - missing realtime headway
  - complex station flag

Exit criteria:

- Unit tests cover score ranking, confidence thresholds, missing feature defaults, and explanation generation.
- Fixture recommendation matches the expected `DESIGN.md` example shape.
- UI consumes the scorer output instead of hard-coded recommendation text.

## Phase 2: Static no-login MVP with feedback

Purpose: collect observations before realtime integration.

Build:

- Add Postgres, Drizzle ORM, and Drizzle Kit migrations.
- Implement the minimum tables:
  - `stations`
  - `station_zone_profiles`
  - `prediction_requests`
  - `ride_observations`
- Defer the `users` table. Store `anonymous_id` directly on prediction and observation rows.
- Use anonymous browser identity stored in a cookie.
- Add Server Actions:
  - `createPrediction`
  - `createObservation`
- Add `GET /api/stations/search` only if the station selector needs client-side autocomplete.
- Seed a few manually validated stations and profiles.
- Add the feedback UI with the three-tap flow from `DESIGN.md`.

Exit criteria:

- A real prediction request is stored.
- A feedback observation can be submitted against that prediction.
- The home page can show a small observation count or recent-feedback confirmation from stored data.
- The app still works if no destination is entered.

## Phase 3: Static data import pipeline

Purpose: replace hand-entered station search data with imported MTA data while keeping profile generation conservative.

Build:

- Add `dataset_manifest.json` as the reproducible source of dataset URLs, Socrata IDs, refresh cadence, and local storage paths.
- Add gitignored local data directories:
  - `data/raw/`
  - `data/processed/`
- Add tiny committed fixtures only under `data/samples/`.
- Ensure `.gitignore` excludes raw/processed downloads and local database/export artifacts:
  - `data/raw/`
  - `data/processed/`
  - `*.sqlite`
  - `*.duckdb`
  - `*.parquet`
  - `*.csv`
  - `*.zip`
  - `!data/samples/`
  - `!data/samples/**`
- Add scripts for the minimum useful imports:
  - downloading MTA static GTFS from the manifest
  - downloading Socrata datasets from the manifest
  - importing `stops.txt`
  - importing `routes.txt`
  - importing MTA station entrances/exits
  - running all import steps from one `import-all.ts`
- Normalize station and complex identifiers.
- Keep generated station-zone profiles behind an explicit script command.
- For v1, support two profile modes:
  - `manual`: hand-authored and trusted
  - `generated`: derived from entrance projection and lower confidence
- Add a validation report that prints station profile distributions by route/direction.
- Defer `trips.txt`, `stop_times.txt`, and `shapes.txt` until automatic direction/front-rear mapping needs them.

Exit criteria:

- Static import can be run locally from an empty database with `npm run bootstrap` or equivalent.
- Full public datasets and generated outputs are not committed to Git.
- Bedford Av and several other target stations have generated or manual zone profiles.
- The app can search imported stations, but recommendations are only enabled where a profile exists.
- Low-confidence or missing-profile stations are handled gracefully in UI.

## Phase 4: Live train integration

Purpose: move from station-level recommendations to per-train recommendations.

Build:

- Fetch MTA subway GTFS-RT feeds.
- Parse `TripUpdate` stop-time updates into arrivals by station, route, and direction.
- Do not parse `VehiclePosition` first; arrival predictions are the useful MVP input.
- Cache arrivals in memory for 30-60 seconds.
- Implement:
  - `GET /api/trains?station_id=...&route=...&direction=...`
  - headway before
  - headway after
  - headway pressure
- Store `realtime_snapshots` only when an environment flag enables debugging.
- Update the train-selection state so each train card shows arrival, following gap, and recommendation preview.

Exit criteria:

- Upcoming train cards are backed by GTFS-RT.
- Selecting a train passes `trip_id` and arrival time into the prediction action or optional prediction route handler.
- Missing or stale realtime data falls back to static recommendation with lower confidence.
- UI never implies per-car live occupancy.

## Phase 5: Demand and ridership features

Purpose: add time-aware pressure without changing the user flow.

Build:

- Import MTA Subway Hourly Ridership.
- Compute `station_demand_index` by station complex, day type, and hour.
- Add demand metadata to prediction explanations:
  - normal demand
  - above-normal demand
  - below-normal demand
- Store demand feature values inside `prediction_requests.explanation` or a debug JSON field.

Exit criteria:

- Predictions vary by station/hour where data exists.
- Missing ridership data defaults to neutral demand and reduces confidence slightly.
- Tests cover demand normalization and neutral fallback.

## Phase 6: Destination-aware recommendations

Purpose: improve usefulness for riders willing to enter a destination.

Build:

- Add destination station search to trip setup.
- Import or seed destination exit/transfer pressure for selected stations.
- Optionally import MTA Origin-Destination Ridership once core destination mapping is stable.
- Add destination pressure to the scorer as a separate feature contribution.
- Explain destination influence only when it materially changes scores.

Exit criteria:

- Entering a destination can change the recommended zone.
- The recommendation page distinguishes "least crowded" from "near exit" pressure.
- Destination absence remains a first-class path, not an error state.

## Phase 7: Personal dashboard and evaluation

Purpose: measure whether the heuristic beats simple baselines.

Build:

- Add dashboard metrics:
  - observation count
  - average crowding when following recommendation
  - average crowding when not following recommendation
  - average crowding by route/station/zone
  - ratings 1-2 and 4-5 percentages
- Add baseline comparison jobs:
  - always front
  - always middle
  - always rear
  - nearest entrance zone
  - random zone
- Add confidence calibration view.

Exit criteria:

- The app can answer whether recommendations are currently better than always-middle for the user's rides.
- Baseline metrics are computed from stored observations without needing ML.

## Phase 8: ML-ready dataset export

Purpose: prepare for model training without prematurely adding a model.

Build:

- Add an export that produces one row per prediction-zone candidate:
  - prediction id
  - station
  - route
  - direction
  - hour
  - day of week
  - zone
  - entrance pressure
  - headway pressure
  - station demand index
  - destination pressure
  - transfer pressure
  - was recommended
  - observed crowding rating
- Add data quality checks:
  - missing labels
  - sparse stations
  - sparse routes
  - recommendation-followed rate
  - class/rating imbalance

Exit criteria:

- Export can be generated repeatably.
- The heuristic can be evaluated against the same rows that a future model will consume.
- No model is trained until there are enough observations to compare against baselines meaningfully.

## API evolution

Start with stable request/response shapes and add optional fields over time. Use these contracts from Server Actions first; expose route handlers only when client-side fetching or external access requires them.

### Prediction request

Phase 2 request:

```json
{
  "station_id": "L08",
  "route_id": "L",
  "direction": "W",
  "destination_station_id": null
}
```

Phase 4 adds train context:

```json
{
  "trip_id": "123",
  "arrival_time": "2026-05-03T08:42:00-04:00",
  "headway_before_minutes": 7,
  "headway_after_minutes": 4
}
```

Response should stay stable whether it comes from a Server Action or route handler:

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
    "This train is following a longer-than-usual gap."
  ]
}
```

## Database evolution

Do not create every table on day one if it slows iteration. Add tables when the phase needs them.

- Phase 2: app tables for predictions, observations, stations, and zone profiles.
- Phase 3: minimum GTFS static import tables for station search plus entrance data.
- Phase 3 or later: PostGIS only when generated profile geometry requires projection or distance queries.
- Phase 4: optional realtime snapshots only when debugging; prefer in-memory cache first.
- Phase 5: hourly ridership tables.
- Phase 6: OD and destination pressure tables.
- Phase 8: export views or materialized views for analysis.

## Testing strategy

- Unit tests for scorer math, confidence, and explanation generation.
- API tests for request validation and persistence.
- Import tests using tiny fixture CSV/GTFS samples.
- CI should use `data/samples/` only, never full downloaded MTA datasets.
- Contract tests for zone names so API, DB, and UI cannot drift.
- E2E smoke test for setup -> recommendation -> feedback.

## Deployment sequence

1. Local-only prototype with fixtures.
2. Preview deployment with seeded data and no external MTA calls.
3. Preview deployment with database persistence.
4. Production-like deployment with GTFS-RT enabled and cache limits.
5. Scheduled import jobs after static pipeline is repeatable.

## Main risks

- Station geometry quality can stall the project. Mitigation: support manual profiles from the start and mark generated profiles lower confidence.
- Realtime feeds can be stale or incomplete. Mitigation: fallback to static recommendations and surface reduced confidence.
- Feedback volume will be low. Mitigation: make feedback one-tap possible and show personal dashboard value early.
- The app can overstate precision. Mitigation: recommend zones only, show confidence, and avoid occupancy wording.

## First build target

The first meaningful release should be:

```text
Bedford Av
L
Manhattan-bound
time: now
destination: optional

Output:
recommended zone
confidence
score breakdown
short explanation
feedback form
```

It should use fixtures plus the pure scorer, then persist predictions and observations in the next phase.
