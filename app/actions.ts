"use server";

import { cookies } from "next/headers";
import { bedfordPredictionContext, bedfordTrip } from "@/src/lib/fixtures/bedford";
import { createObservation, createPrediction } from "@/src/lib/persistence/prediction-service";
import { getPredictionRepository } from "@/src/lib/persistence/drizzle-repository";
import type { Zone } from "@/src/lib/prediction/scorer";

const anonymousCookieName = "empty_carriage_anon_id";
const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;

type ActionResult =
  | {
      ok: true;
      id: string;
      persisted: true;
    }
  | {
      ok: false;
      persisted: false;
      error: string;
    };

export async function createPredictionAction(): Promise<ActionResult> {
  const repository = getPredictionRepository();

  if (!repository) {
    return missingDatabaseResult();
  }

  try {
    const anonymousId = await getOrCreateAnonymousId();
    const result = await createPrediction({
      anonymousId,
      context: bedfordPredictionContext,
      trainTripId: bedfordTrip.train.tripId,
      trainArrivalTime: new Date(Date.now() + bedfordTrip.train.arrivesIn * 60 * 1000),
      repository,
    });

    return {
      ok: true,
      id: result.id,
      persisted: true,
    };
  } catch (error) {
    return persistenceErrorResult(error);
  }
}

export async function createObservationAction(input: {
  predictionRequestId: string | null;
  boardedZone: Zone;
  crowdingRating: number;
  seatAvailable?: boolean | null;
  betterZoneObserved?: Zone | "unsure" | null;
}): Promise<ActionResult> {
  const repository = getPredictionRepository();

  if (!repository) {
    return missingDatabaseResult();
  }

  if (!input.predictionRequestId) {
    return {
      ok: false,
      persisted: false,
      error: "Prediction was not persisted, so feedback cannot be stored yet.",
    };
  }

  try {
    const anonymousId = await getOrCreateAnonymousId();
    const result = await createObservation({
      anonymousId,
      predictionRequestId: input.predictionRequestId,
      boardedZone: input.boardedZone,
      crowdingRating: input.crowdingRating,
      seatAvailable: input.seatAvailable,
      betterZoneObserved: input.betterZoneObserved,
      repository,
    });

    return {
      ok: true,
      id: result.id,
      persisted: true,
    };
  } catch (error) {
    return persistenceErrorResult(error);
  }
}

async function getOrCreateAnonymousId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(anonymousCookieName)?.value;

  if (existing) {
    return existing;
  }

  const anonymousId = crypto.randomUUID();

  cookieStore.set(anonymousCookieName, anonymousId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: cookieMaxAgeSeconds,
  });

  return anonymousId;
}

function missingDatabaseResult(): ActionResult {
  return {
    ok: false,
    persisted: false,
    error: "Set DATABASE_URL and run migrations to enable persistence.",
  };
}

function persistenceErrorResult(error: unknown): ActionResult {
  return {
    ok: false,
    persisted: false,
    error: error instanceof Error ? error.message : "Persistence failed.",
  };
}
