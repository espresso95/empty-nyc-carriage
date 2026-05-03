import { describe, expect, it } from "vitest";
import { deriveStationsFromEntrances, parseEntrancesCsv, parseRouteList } from "./entrances";

describe("entrances import helpers", () => {
  it("parses route lists", () => {
    expect(parseRouteList("2 3 4 5 B D N Q R")).toEqual(["2", "3", "4", "5", "B", "D", "N", "Q", "R"]);
  });

  it("parses entrances CSV rows", () => {
    const entrances = parseEntrancesCsv(
      [
        "station_id,stop_name,complex_id,gtfs_stop_id,daytime_routes,entrance_type,entry_allowed,exit_allowed,entrance_latitude,entrance_longitude",
        "27,Atlantic Av-Barclays Ctr,617,R31,2 3 4 5 B D N Q R,Stair,YES,YES,40.683905,-73.978879",
      ].join("\n"),
    );

    expect(entrances).toEqual([
      {
        stationId: "27",
        stopName: "Atlantic Av-Barclays Ctr",
        complexId: "617",
        gtfsStopId: "R31",
        daytimeRoutes: ["2", "3", "4", "5", "B", "D", "N", "Q", "R"],
        entranceType: "Stair",
        entryAllowed: true,
        exitAllowed: true,
        lat: 40.683905,
        lon: -73.978879,
      },
    ]);
  });

  it("derives app station rows from entrances", () => {
    const entrances = parseEntrancesCsv(
      [
        "station_id,stop_name,complex_id,gtfs_stop_id,daytime_routes,entrance_type,entry_allowed,exit_allowed,entrance_latitude,entrance_longitude",
        "135,Bedford Av,635,L08,L,Stair,YES,YES,40.7171,-73.9571",
        "135,Bedford Av,635,L08,L,Stair,YES,YES,40.7175,-73.9566",
      ].join("\n"),
    );

    expect(deriveStationsFromEntrances(entrances)).toEqual([
      {
        id: "L08",
        name: "Bedford Av",
        gtfsStopId: "L08",
        complexId: "635",
        lat: 40.7171,
        lon: -73.9571,
        routes: ["L"],
      },
    ]);
  });
});
