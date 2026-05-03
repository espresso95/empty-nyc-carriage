import { describe, expect, it } from "vitest";
import { parseEntrancesCsv } from "./entrances";
import { generateZoneProfilesFromEntrances } from "./zone-profile-generator";

describe("zone profile generator", () => {
  it("generates per-route direction profiles from entrance positions", () => {
    const entrances = parseEntrancesCsv(
      [
        "station_id,stop_name,complex_id,gtfs_stop_id,daytime_routes,entrance_type,entry_allowed,exit_allowed,entrance_latitude,entrance_longitude",
        "135,Bedford Av,635,L08,L,Stair,YES,YES,40.7171,-73.9580",
        "135,Bedford Av,635,L08,L,Stair,YES,YES,40.7172,-73.9570",
        "135,Bedford Av,635,L08,L,Stair,YES,YES,40.7173,-73.9560",
      ].join("\n"),
    );

    const profiles = generateZoneProfilesFromEntrances("L08", entrances);
    const westProfiles = profiles.filter((profile) => profile.routeId === "L" && profile.direction === "W");

    expect(profiles).toHaveLength(10);
    expect(westProfiles).toHaveLength(5);
    expect(westProfiles.reduce((sum, profile) => sum + profile.entrancePressure, 0)).toBeCloseTo(1);
    expect(westProfiles.find((profile) => profile.zone === "front")?.entrancePressure).toBeGreaterThan(0);
  });

  it("uses low confidence for stations with a single entrance", () => {
    const entrances = parseEntrancesCsv(
      [
        "station_id,stop_name,complex_id,gtfs_stop_id,daytime_routes,entrance_type,entry_allowed,exit_allowed,entrance_latitude,entrance_longitude",
        "135,Bedford Av,635,L08,L,Stair,YES,YES,40.7171,-73.9580",
      ].join("\n"),
    );

    const profiles = generateZoneProfilesFromEntrances("L08", entrances);

    expect(profiles.every((profile) => profile.confidence === 0.25)).toBe(true);
  });
});
