import { describe, expect, it } from "vitest";
import { summarizeZoneProfiles } from "./validation";

describe("zone profile validation", () => {
  it("summarizes generated profile coverage", () => {
    expect(
      summarizeZoneProfiles([
        {
          stationId: "L08",
          routeId: "L",
          direction: "W",
          zone: "front",
          entrancePressure: 0.5,
          confidence: 0.45,
        },
        {
          stationId: "L08",
          routeId: "L",
          direction: "W",
          zone: "rear",
          entrancePressure: 0.5,
          confidence: 0.25,
        },
      ]),
    ).toEqual({
      stationCount: 1,
      routeDirectionCount: 1,
      lowConfidenceCount: 1,
      profileCount: 2,
    });
  });
});
