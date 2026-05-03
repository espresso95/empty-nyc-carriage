import {
  entrancesExits,
  gtfsRoutes,
  gtfsStops,
  stationZoneProfiles,
  stations,
} from "../../db/schema";
import { getDb } from "../../db/client";
import type { EntranceImport } from "./entrances";
import type { GtfsRouteImport, GtfsStopImport, StationImport } from "./gtfs";
import type { GeneratedZoneProfile } from "./zone-profile-generator";

export function getImportRepository() {
  const db = getDb();

  if (!db) {
    return null;
  }

  return {
    async upsertGtfsRoutes(routes: GtfsRouteImport[]) {
      for (const route of routes) {
        await db
          .insert(gtfsRoutes)
          .values(route)
          .onConflictDoUpdate({
            target: gtfsRoutes.routeId,
            set: {
              routeShortName: route.routeShortName,
              routeLongName: route.routeLongName,
              routeColor: route.routeColor,
              routeTextColor: route.routeTextColor,
            },
          });
      }
    },

    async upsertGtfsStops(stops: GtfsStopImport[]) {
      for (const stop of stops) {
        await db
          .insert(gtfsStops)
          .values(stop)
          .onConflictDoUpdate({
            target: gtfsStops.stopId,
            set: {
              stopName: stop.stopName,
              stopLat: stop.stopLat,
              stopLon: stop.stopLon,
              locationType: stop.locationType,
              parentStation: stop.parentStation,
            },
          });
      }
    },

    async upsertStations(stationImports: StationImport[]) {
      for (const station of stationImports) {
        await db
          .insert(stations)
          .values(station)
          .onConflictDoUpdate({
            target: stations.id,
            set: {
              name: station.name,
              gtfsStopId: station.gtfsStopId,
              complexId: station.complexId,
              lat: station.lat,
              lon: station.lon,
              routes: station.routes,
            },
          });
      }
    },

    async upsertEntrances(entrances: EntranceImport[]) {
      for (const entrance of entrances) {
        await db
          .insert(entrancesExits)
          .values({
            stationId: entrance.stationId,
            stopName: entrance.stopName,
            complexId: entrance.complexId,
            gtfsStopId: entrance.gtfsStopId,
            daytimeRoutes: entrance.daytimeRoutes,
            entranceType: entrance.entranceType,
            entryAllowed: entrance.entryAllowed,
            exitAllowed: entrance.exitAllowed,
            lat: entrance.lat,
            lon: entrance.lon,
          })
          .onConflictDoUpdate({
            target: [
              entrancesExits.stationId,
              entrancesExits.lat,
              entrancesExits.lon,
              entrancesExits.entranceType,
            ],
            set: {
              stopName: entrance.stopName,
              complexId: entrance.complexId,
              gtfsStopId: entrance.gtfsStopId,
              daytimeRoutes: entrance.daytimeRoutes,
              entryAllowed: entrance.entryAllowed,
              exitAllowed: entrance.exitAllowed,
            },
          });
      }
    },

    async upsertGeneratedZoneProfiles(profiles: GeneratedZoneProfile[]) {
      for (const profile of profiles) {
        await db
          .insert(stationZoneProfiles)
          .values({
            stationId: profile.stationId,
            routeId: profile.routeId,
            direction: profile.direction,
            zone: profile.zone,
            entrancePressure: profile.entrancePressure,
            confidence: profile.confidence,
            source: "generated",
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
              confidence: profile.confidence,
              source: "generated",
              updatedAt: new Date(),
            },
          });
      }
    },

    async listEntrances(): Promise<EntranceImport[]> {
      const rows = await db.select().from(entrancesExits);

      return rows.map((row) => ({
        stationId: row.stationId,
        stopName: row.stopName,
        complexId: row.complexId,
        gtfsStopId: row.gtfsStopId,
        daytimeRoutes: row.daytimeRoutes,
        entranceType: row.entranceType,
        entryAllowed: row.entryAllowed,
        exitAllowed: row.exitAllowed,
        lat: row.lat,
        lon: row.lon,
      }));
    },

    async listGeneratedZoneProfiles(): Promise<GeneratedZoneProfile[]> {
      const rows = await db.select().from(stationZoneProfiles);

      return rows
        .filter((row) => row.source === "generated")
        .map((row) => ({
          stationId: row.stationId,
          routeId: row.routeId,
          direction: row.direction as GeneratedZoneProfile["direction"],
          zone: row.zone,
          entrancePressure: row.entrancePressure,
          confidence: row.confidence,
        }));
    },
  };
}
