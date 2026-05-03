import "dotenv/config";
import { getDb } from "./client";
import { stationZoneProfiles, stations } from "./schema";
import { bedfordPredictionContext, bedfordTrip } from "../lib/fixtures/bedford";
import { ZONES } from "../lib/prediction/scorer";

async function main() {
  const db = getDb();

  if (!db) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  await db
    .insert(stations)
    .values({
      id: bedfordPredictionContext.stationId,
      name: bedfordTrip.station,
      gtfsStopId: bedfordPredictionContext.stationId,
      complexId: "bedford-av-fixture",
      lat: 40.717304,
      lon: -73.956872,
      routes: [bedfordPredictionContext.routeId],
    })
    .onConflictDoUpdate({
      target: stations.id,
      set: {
        name: bedfordTrip.station,
        gtfsStopId: bedfordPredictionContext.stationId,
        complexId: "bedford-av-fixture",
        lat: 40.717304,
        lon: -73.956872,
        routes: [bedfordPredictionContext.routeId],
      },
    });

  for (const zone of ZONES) {
    const profile = bedfordPredictionContext.zoneProfiles[zone];

    await db
      .insert(stationZoneProfiles)
      .values({
        stationId: bedfordPredictionContext.stationId,
        routeId: bedfordPredictionContext.routeId,
        direction: bedfordPredictionContext.direction,
        zone,
        entrancePressure: profile.entrancePressure,
        transferPressure: profile.transferPressure ?? 0,
        confidence: profile.profileConfidence ?? 0.5,
        source: "manual",
      })
      .onConflictDoUpdate({
        target: [
          stationZoneProfiles.stationId,
          stationZoneProfiles.routeId,
          stationZoneProfiles.direction,
          stationZoneProfiles.zone,
        ],
        set: {
          entrancePressure: profile.entrancePressure,
          transferPressure: profile.transferPressure ?? 0,
          confidence: profile.profileConfidence ?? 0.5,
          source: "manual",
          updatedAt: new Date(),
        },
      });
  }
}

main()
  .then(() => {
    console.log("Seeded Bedford Av fixture data.");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
