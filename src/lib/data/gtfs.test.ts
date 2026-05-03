import { describe, expect, it } from "vitest";
import { deriveStationsFromGtfsStops, parseGtfsRoutesCsv, parseGtfsStopsCsv } from "./gtfs";

describe("GTFS import helpers", () => {
  it("parses GTFS routes", () => {
    const routes = parseGtfsRoutesCsv(
      [
        "route_id,agency_id,route_short_name,route_long_name,route_type,route_color,route_text_color",
        "L,MTA NYCT,L,14 St-Canarsie Local,1,A7A9AC,000000",
      ].join("\n"),
    );

    expect(routes).toEqual([
      {
        routeId: "L",
        routeShortName: "L",
        routeLongName: "14 St-Canarsie Local",
        routeColor: "A7A9AC",
        routeTextColor: "000000",
      },
    ]);
  });

  it("parses GTFS stops and derives parent station rows", () => {
    const stops = parseGtfsStopsCsv(
      [
        "stop_id,stop_name,stop_lat,stop_lon,location_type,parent_station",
        "L08,Bedford Av,40.717304,-73.956872,1,",
        "L08N,Bedford Av,40.717304,-73.956872,0,L08",
        "L08S,Bedford Av,40.717304,-73.956872,0,L08",
      ].join("\n"),
    );

    expect(stops).toHaveLength(3);
    expect(stops[0]).toMatchObject({
      stopId: "L08",
      stopName: "Bedford Av",
      locationType: 1,
      parentStation: null,
    });
    expect(deriveStationsFromGtfsStops(stops)).toEqual([
      {
        id: "L08",
        name: "Bedford Av",
        gtfsStopId: "L08",
        complexId: null,
        lat: 40.717304,
        lon: -73.956872,
        routes: [],
      },
    ]);
  });
});
