import { predictZone, ZONES, type PredictionContext, type Zone } from "../prediction/scorer";

export type PredictionInsert = {
  anonymousId: string;
  stationId: string;
  routeId: string;
  direction: string;
  destinationStationId?: string | null;
  trainTripId?: string | null;
  trainArrivalTime?: Date | null;
  recommendedZone: Zone;
  confidence: "low" | "medium" | "high";
  scores: ReturnType<typeof predictZone>["scores"];
  explanation: {
    why: string[];
    contributions: ReturnType<typeof predictZone>["contributions"];
  };
};

export type ObservationInsert = {
  predictionRequestId: string;
  anonymousId: string;
  boardedZone: Zone;
  crowdingRating: number;
  seatAvailable?: boolean | null;
  couldBoard?: boolean;
  betterZoneObserved?: Zone | "unsure" | null;
  notes?: string | null;
};

export type PredictionRepository = {
  createPrediction(input: PredictionInsert): Promise<{ id: string }>;
  createObservation(input: ObservationInsert): Promise<{ id: string }>;
};

export type CreatePredictionInput = {
  anonymousId: string;
  context: PredictionContext;
  trainTripId?: string | null;
  trainArrivalTime?: Date | null;
  repository: PredictionRepository;
};

export type CreateObservationInput = {
  anonymousId: string;
  predictionRequestId: string;
  boardedZone: Zone;
  crowdingRating: number;
  seatAvailable?: boolean | null;
  couldBoard?: boolean;
  betterZoneObserved?: Zone | "unsure" | null;
  notes?: string | null;
  repository: PredictionRepository;
};

export async function createPrediction(input: CreatePredictionInput): Promise<{ id: string }> {
  const prediction = buildPredictionInsert(input);

  return input.repository.createPrediction(prediction);
}

export function buildPredictionInsert(input: Omit<CreatePredictionInput, "repository">): PredictionInsert {
  const result = predictZone(input.context);

  return {
    anonymousId: input.anonymousId,
    stationId: input.context.stationId,
    routeId: input.context.routeId,
    direction: input.context.direction,
    destinationStationId: input.context.destinationStationId ?? null,
    trainTripId: input.trainTripId ?? null,
    trainArrivalTime: input.trainArrivalTime ?? null,
    recommendedZone: result.recommendedZone,
    confidence: result.confidence,
    scores: result.scores,
    explanation: {
      why: result.why,
      contributions: result.contributions,
    },
  };
}

export async function createObservation(input: CreateObservationInput): Promise<{ id: string }> {
  validateObservation(input);

  return input.repository.createObservation({
    predictionRequestId: input.predictionRequestId,
    anonymousId: input.anonymousId,
    boardedZone: input.boardedZone,
    crowdingRating: input.crowdingRating,
    seatAvailable: input.seatAvailable ?? null,
    couldBoard: input.couldBoard ?? true,
    betterZoneObserved: input.betterZoneObserved ?? null,
    notes: input.notes ?? null,
  });
}

function validateObservation(input: CreateObservationInput): void {
  if (!input.predictionRequestId) {
    throw new Error("predictionRequestId is required");
  }

  if (!isZone(input.boardedZone)) {
    throw new Error("boardedZone is invalid");
  }

  if (!Number.isInteger(input.crowdingRating) || input.crowdingRating < 1 || input.crowdingRating > 5) {
    throw new Error("crowdingRating must be an integer from 1 to 5");
  }
}

function isZone(value: string): value is Zone {
  return ZONES.includes(value as Zone);
}
