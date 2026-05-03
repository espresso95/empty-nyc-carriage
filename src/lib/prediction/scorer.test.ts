import { describe, expect, it } from "vitest";
import {
  ZONES,
  computeConfidence,
  predictZone,
  type PredictionContext,
  type Zone,
  type ZoneProfile,
} from "./scorer";
import { bedfordPredictionContext } from "../fixtures/bedford";

describe("predictZone", () => {
  it("recommends rear-middle for the Bedford Av fixture", () => {
    const result = predictZone(bedfordPredictionContext);

    expect(result.recommendedZone).toBe("rear-middle");
    expect(result.confidence).toBe("medium");
    expect(result.scores["rear-middle"]).toBeLessThan(result.scores.rear);
    expect(result.scores.rear).toBeLessThan(result.scores.middle);
    expect(result.why).toContain("Main entrances are weighted toward the front of the platform.");
    expect(result.why).toContain("This train is following a longer-than-usual gap.");
  });

  it("records feature contributions that add up to each score", () => {
    const result = predictZone(bedfordPredictionContext);

    for (const zone of ZONES) {
      expect(result.contributions[zone].total).toBe(result.scores[zone]);
    }
  });

  it("uses neutral defaults for missing live and destination inputs", () => {
    const context = makeContext({
      zoneProfiles: {
        front: makeProfile(0.8),
        "front-middle": makeProfile(0.7),
        middle: makeProfile(0.45),
        "rear-middle": makeProfile(0.2),
        rear: makeProfile(0.1),
      },
      hasRealtimeHeadway: false,
      destinationStationId: undefined,
      destinationPressure: undefined,
      headwayPressure: undefined,
      stationDemandIndex: undefined,
    });

    const result = predictZone(context);

    expect(result.recommendedZone).toBe("rear");
    expect(result.confidence).toBe("medium");
    expect(result.contributions.front.headway).toBe(0);
    expect(result.contributions.front.destination).toBe(0);
  });

  it("returns low confidence when the best zones are too close", () => {
    const context = makeContext({
      zoneProfiles: {
        front: makeProfile(0.5),
        "front-middle": makeProfile(0.5),
        middle: makeProfile(0.5),
        "rear-middle": makeProfile(0.5),
        rear: makeProfile(0.5),
      },
    });

    const result = predictZone(context);

    expect(result.confidence).toBe("low");
  });

  it("allows high confidence when the difference is strong and inputs are complete", () => {
    const context = makeContext({
      destinationStationId: "A27",
      hasRealtimeHeadway: true,
      zoneProfiles: {
        front: makeProfile(1, 0, 0.95),
        "front-middle": makeProfile(0.8, 0, 0.95),
        middle: makeProfile(0.6, 0, 0.95),
        "rear-middle": makeProfile(0.3, 0, 0.95),
        rear: makeProfile(0.05, 0, 0.95),
      },
    });

    expect(computeConfidence(predictZone(context).scores, context)).toBe("high");
  });

  it("marks complex station cases as low confidence", () => {
    const context = makeContext({
      complexStation: true,
    });

    expect(predictZone(context).confidence).toBe("low");
  });
});

function makeContext(overrides: Partial<PredictionContext> = {}): PredictionContext {
  return {
    stationId: "fixture-station",
    routeId: "L",
    direction: "W",
    destinationStationId: "fixture-destination",
    stationDemandIndex: 1.2,
    headwayPressure: 1.4,
    hasRealtimeHeadway: true,
    zoneProfiles: makeProfiles(),
    destinationPressure: {
      front: 0.1,
      "front-middle": 0.08,
      middle: 0.06,
      "rear-middle": 0.03,
      rear: 0.02,
    },
    routeBaseline: {},
    ...overrides,
  };
}

function makeProfiles(): Record<Zone, ZoneProfile> {
  return {
    front: makeProfile(0.8),
    "front-middle": makeProfile(0.7),
    middle: makeProfile(0.5),
    "rear-middle": makeProfile(0.25),
    rear: makeProfile(0.15),
  };
}

function makeProfile(
  entrancePressure: number,
  transferPressure = 0,
  profileConfidence = 0.8,
): ZoneProfile {
  return {
    entrancePressure,
    transferPressure,
    profileConfidence,
  };
}
