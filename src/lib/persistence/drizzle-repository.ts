import { getDb } from "@/src/db/client";
import { predictionRequests, rideObservations } from "@/src/db/schema";
import type {
  ObservationInsert,
  PredictionInsert,
  PredictionRepository,
} from "./prediction-service";

export function getPredictionRepository(): PredictionRepository | null {
  const db = getDb();

  if (!db) {
    return null;
  }

  return {
    async createPrediction(input: PredictionInsert) {
      const [row] = await db
        .insert(predictionRequests)
        .values({
          anonymousId: input.anonymousId,
          stationId: input.stationId,
          routeId: input.routeId,
          direction: input.direction,
          destinationStationId: input.destinationStationId,
          trainTripId: input.trainTripId,
          trainArrivalTime: input.trainArrivalTime,
          recommendedZone: input.recommendedZone,
          confidence: input.confidence,
          scores: input.scores,
          explanation: input.explanation,
        })
        .returning({ id: predictionRequests.id });

      return row;
    },

    async createObservation(input: ObservationInsert) {
      const [row] = await db
        .insert(rideObservations)
        .values({
          predictionRequestId: input.predictionRequestId,
          anonymousId: input.anonymousId,
          boardedZone: input.boardedZone,
          crowdingRating: input.crowdingRating,
          seatAvailable: input.seatAvailable,
          couldBoard: input.couldBoard,
          betterZoneObserved: input.betterZoneObserved,
          notes: input.notes,
        })
        .returning({ id: rideObservations.id });

      return row;
    },
  };
}
