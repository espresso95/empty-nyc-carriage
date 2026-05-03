import { describe, expect, it } from "vitest";
import type { DashboardObservation } from "../dashboard/summary";
import { buildMlReadiness } from "./readiness";

describe("buildMlReadiness", () => {
  it("marks early data collection before baseline comparison is useful", () => {
    const readiness = buildMlReadiness([
      makeObservation({
        recommendedZone: "rear-middle",
        boardedZone: "rear-middle",
        crowdingRating: 2,
      }),
      makeObservation({
        recommendedZone: "rear-middle",
        boardedZone: "middle",
        crowdingRating: 4,
      }),
      makeObservation({
        recommendedZone: "front",
        boardedZone: "rear",
        crowdingRating: 3,
      }),
    ]);

    expect(readiness.stage).toBe("collecting-labels");
    expect(readiness.nextMilestone).toBe(100);
    expect(readiness.baselineComparisons).toEqual([
      {
        label: "heuristic-followed",
        observationCount: 1,
        averageCrowding: 2,
        comfortableRideRate: 1,
      },
      {
        label: "always-middle",
        observationCount: 1,
        averageCrowding: 4,
        comfortableRideRate: 0,
      },
      {
        label: "always-rear",
        observationCount: 1,
        averageCrowding: 3,
        comfortableRideRate: 1,
      },
    ]);
  });

  it("moves to baseline comparison at 100 labels", () => {
    const observations = Array.from({ length: 100 }, () => makeObservation());

    expect(buildMlReadiness(observations)).toMatchObject({
      labelsCollected: 100,
      stage: "compare-baselines",
      nextMilestone: 300,
    });
  });

  it("moves to small-model readiness at 300 labels", () => {
    const observations = Array.from({ length: 300 }, () => makeObservation());

    expect(buildMlReadiness(observations)).toMatchObject({
      labelsCollected: 300,
      stage: "train-small-model",
      nextMilestone: null,
      nextMilestoneLabel: null,
    });
  });
});

function makeObservation(
  overrides: Partial<DashboardObservation> = {},
): DashboardObservation {
  return {
    observedAt: "2026-05-03T12:00:00.000Z",
    stationId: "L08",
    stationName: "Bedford Av",
    routeId: "L",
    direction: "W",
    recommendedZone: "rear-middle",
    boardedZone: "rear-middle",
    crowdingRating: 2,
    couldBoard: true,
    ...overrides,
  };
}
