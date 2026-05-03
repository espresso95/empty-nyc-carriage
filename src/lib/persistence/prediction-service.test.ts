import { describe, expect, it } from "vitest";
import { bedfordPredictionContext } from "../fixtures/bedford";
import {
  buildPredictionInsert,
  createObservation,
  createPrediction,
  type ObservationInsert,
  type PredictionInsert,
  type PredictionRepository,
} from "./prediction-service";

describe("prediction persistence service", () => {
  it("builds a prediction insert from scorer output", () => {
    const insert = buildPredictionInsert({
      anonymousId: "anon-1",
      context: bedfordPredictionContext,
      trainTripId: "trip-1",
      trainArrivalTime: new Date("2026-05-03T12:00:00.000Z"),
    });

    expect(insert.anonymousId).toBe("anon-1");
    expect(insert.stationId).toBe("L08");
    expect(insert.routeId).toBe("L");
    expect(insert.recommendedZone).toBe("rear-middle");
    expect(insert.confidence).toBe("medium");
    expect(insert.scores["rear-middle"]).toBeLessThan(insert.scores.rear);
    expect(insert.explanation.why.length).toBeGreaterThan(0);
  });

  it("writes predictions through the repository boundary", async () => {
    const repository = new FakePredictionRepository();

    const result = await createPrediction({
      anonymousId: "anon-1",
      context: bedfordPredictionContext,
      trainTripId: "trip-1",
      repository,
    });

    expect(result.id).toBe("prediction-1");
    expect(repository.predictions).toHaveLength(1);
    expect(repository.predictions[0].recommendedZone).toBe("rear-middle");
  });

  it("writes observations through the repository boundary", async () => {
    const repository = new FakePredictionRepository();

    const result = await createObservation({
      anonymousId: "anon-1",
      predictionRequestId: "prediction-1",
      boardedZone: "rear-middle",
      crowdingRating: 2,
      seatAvailable: true,
      betterZoneObserved: "rear",
      repository,
    });

    expect(result.id).toBe("observation-1");
    expect(repository.observations).toEqual([
      {
        anonymousId: "anon-1",
        predictionRequestId: "prediction-1",
        boardedZone: "rear-middle",
        crowdingRating: 2,
        seatAvailable: true,
        couldBoard: true,
        betterZoneObserved: "rear",
        notes: null,
      },
    ]);
  });

  it("rejects invalid crowding ratings", async () => {
    const repository = new FakePredictionRepository();

    await expect(() =>
      createObservation({
        anonymousId: "anon-1",
        predictionRequestId: "prediction-1",
        boardedZone: "rear-middle",
        crowdingRating: 6,
        repository,
      }),
    ).rejects.toThrow("crowdingRating must be an integer from 1 to 5");
  });

  it("requires a persisted prediction id for observations", async () => {
    const repository = new FakePredictionRepository();

    await expect(() =>
      createObservation({
        anonymousId: "anon-1",
        predictionRequestId: "",
        boardedZone: "rear-middle",
        crowdingRating: 2,
        repository,
      }),
    ).rejects.toThrow("predictionRequestId is required");
  });
});

class FakePredictionRepository implements PredictionRepository {
  predictions: PredictionInsert[] = [];
  observations: ObservationInsert[] = [];

  async createPrediction(input: PredictionInsert): Promise<{ id: string }> {
    this.predictions.push(input);

    return { id: `prediction-${this.predictions.length}` };
  }

  async createObservation(input: ObservationInsert): Promise<{ id: string }> {
    this.observations.push(input);

    return { id: `observation-${this.observations.length}` };
  }
}
