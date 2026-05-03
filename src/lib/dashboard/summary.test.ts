import { describe, expect, it } from "vitest";
import { buildDashboardSummary, type DashboardObservation } from "./summary";

describe("buildDashboardSummary", () => {
  it("summarizes personal observation performance", () => {
    const summary = buildDashboardSummary([
      makeObservation({
        routeId: "L",
        recommendedZone: "rear-middle",
        boardedZone: "rear-middle",
        crowdingRating: 2,
      }),
      makeObservation({
        routeId: "L",
        recommendedZone: "rear-middle",
        boardedZone: "middle",
        crowdingRating: 4,
      }),
      makeObservation({
        routeId: "G",
        recommendedZone: "front",
        boardedZone: "front",
        crowdingRating: 3,
      }),
    ]);

    expect(summary.observationCount).toBe(3);
    expect(summary.mostCommonRoute).toBe("L");
    expect(summary.averageCrowdingWhenFollowing).toBe(2.5);
    expect(summary.averageCrowdingOtherwise).toBe(4);
    expect(summary.recommendationFollowRate).toBe(0.67);
    expect(summary.bestPerformingRecommendation).toBe("rear-middle");
    expect(summary.routePatterns).toEqual([
      {
        routeId: "L",
        observationCount: 2,
        averageCrowding: 3,
      },
      {
        routeId: "G",
        observationCount: 1,
        averageCrowding: 3,
      },
    ]);
    expect(summary.crowdingByBoardedZone.find((zone) => zone.zone === "rear-middle")).toEqual({
      zone: "rear-middle",
      observationCount: 1,
      averageCrowding: 2,
    });
  });

  it("handles an empty dashboard", () => {
    expect(buildDashboardSummary([])).toMatchObject({
      observationCount: 0,
      mostCommonRoute: null,
      averageCrowdingWhenFollowing: null,
      averageCrowdingOtherwise: null,
      recommendationFollowRate: null,
      bestPerformingRecommendation: null,
      routePatterns: [],
      recentObservations: [],
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
