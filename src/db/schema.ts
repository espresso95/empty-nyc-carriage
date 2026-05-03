import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Confidence, FeatureContributions, Zone, ZoneScoreMap } from "@/src/lib/prediction/scorer";

export const stations = pgTable(
  "stations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    gtfsStopId: text("gtfs_stop_id"),
    complexId: text("complex_id"),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    routes: jsonb("routes").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  },
  (table) => [index("stations_name_idx").on(table.name)],
);

export const stationZoneProfiles = pgTable(
  "station_zone_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stationId: text("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "cascade" }),
    routeId: text("route_id").notNull(),
    direction: text("direction").notNull(),
    zone: text("zone").$type<Zone>().notNull(),
    entrancePressure: doublePrecision("entrance_pressure").notNull(),
    transferPressure: doublePrecision("transfer_pressure").notNull().default(0),
    exitPressure: doublePrecision("exit_pressure").notNull().default(0),
    confidence: doublePrecision("confidence").notNull().default(0.5),
    source: text("source").notNull().default("manual"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("station_zone_profiles_lookup_idx").on(
      table.stationId,
      table.routeId,
      table.direction,
      table.zone,
    ),
    check(
      "station_zone_profiles_zone_check",
      sql`${table.zone} in ('front', 'front-middle', 'middle', 'rear-middle', 'rear')`,
    ),
  ],
);

export const predictionRequests = pgTable(
  "prediction_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    anonymousId: text("anonymous_id").notNull(),
    stationId: text("station_id")
      .notNull()
      .references(() => stations.id, { onDelete: "restrict" }),
    routeId: text("route_id").notNull(),
    direction: text("direction").notNull(),
    destinationStationId: text("destination_station_id"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    trainTripId: text("train_trip_id"),
    trainArrivalTime: timestamp("train_arrival_time", { withTimezone: true }),
    recommendedZone: text("recommended_zone").$type<Zone>().notNull(),
    confidence: text("confidence").$type<Confidence>().notNull(),
    scores: jsonb("scores").$type<ZoneScoreMap>().notNull(),
    explanation: jsonb("explanation").$type<{
      why: string[];
      contributions: FeatureContributions;
    }>(),
  },
  (table) => [
    index("prediction_requests_anonymous_id_idx").on(table.anonymousId),
    index("prediction_requests_trip_lookup_idx").on(table.stationId, table.routeId, table.direction),
    check(
      "prediction_requests_recommended_zone_check",
      sql`${table.recommendedZone} in ('front', 'front-middle', 'middle', 'rear-middle', 'rear')`,
    ),
    check("prediction_requests_confidence_check", sql`${table.confidence} in ('low', 'medium', 'high')`),
  ],
);

export const rideObservations = pgTable(
  "ride_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    predictionRequestId: uuid("prediction_request_id")
      .notNull()
      .references(() => predictionRequests.id, { onDelete: "cascade" }),
    anonymousId: text("anonymous_id").notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    boardedZone: text("boarded_zone").$type<Zone>().notNull(),
    crowdingRating: integer("crowding_rating").notNull(),
    seatAvailable: boolean("seat_available"),
    couldBoard: boolean("could_board").notNull().default(true),
    betterZoneObserved: text("better_zone_observed"),
    notes: text("notes"),
  },
  (table) => [
    index("ride_observations_prediction_request_id_idx").on(table.predictionRequestId),
    index("ride_observations_anonymous_id_idx").on(table.anonymousId),
    check(
      "ride_observations_boarded_zone_check",
      sql`${table.boardedZone} in ('front', 'front-middle', 'middle', 'rear-middle', 'rear')`,
    ),
    check("ride_observations_crowding_rating_check", sql`${table.crowdingRating} between 1 and 5`),
  ],
);
