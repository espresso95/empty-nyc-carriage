import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { predictionRequests, rideObservations, stations } from "../../db/schema";
import type { DashboardObservation } from "./summary";

export type DashboardRepository = {
  listObservations(anonymousId: string, limit?: number): Promise<DashboardObservation[]>;
};

export function getDashboardRepository(): DashboardRepository | null {
  const db = getDb();

  if (!db) {
    return null;
  }

  return {
    async listObservations(anonymousId: string, limit = 500) {
      const rows = await db
        .select({
          observedAt: rideObservations.observedAt,
          stationId: predictionRequests.stationId,
          stationName: stations.name,
          routeId: predictionRequests.routeId,
          direction: predictionRequests.direction,
          recommendedZone: predictionRequests.recommendedZone,
          boardedZone: rideObservations.boardedZone,
          crowdingRating: rideObservations.crowdingRating,
          couldBoard: rideObservations.couldBoard,
        })
        .from(rideObservations)
        .innerJoin(
          predictionRequests,
          eq(rideObservations.predictionRequestId, predictionRequests.id),
        )
        .leftJoin(stations, eq(predictionRequests.stationId, stations.id))
        .where(eq(rideObservations.anonymousId, anonymousId))
        .orderBy(desc(rideObservations.observedAt))
        .limit(limit);

      return rows.map((row) => ({
        observedAt: row.observedAt.toISOString(),
        stationId: row.stationId,
        stationName: row.stationName,
        routeId: row.routeId,
        direction: row.direction,
        recommendedZone: row.recommendedZone,
        boardedZone: row.boardedZone,
        crowdingRating: row.crowdingRating,
        couldBoard: row.couldBoard,
      }));
    },
  };
}
