import { parseCsvRecords, parseOptionalNumber, type CsvRecord } from "./csv";

export type GtfsRouteImport = {
  routeId: string;
  routeShortName: string;
  routeLongName: string | null;
  routeColor: string | null;
  routeTextColor: string | null;
};

export type GtfsStopImport = {
  stopId: string;
  stopName: string;
  stopLat: number | null;
  stopLon: number | null;
  locationType: number;
  parentStation: string | null;
};

export type StationImport = {
  id: string;
  name: string;
  gtfsStopId: string;
  complexId: string | null;
  lat: number | null;
  lon: number | null;
  routes: string[];
};

export function parseGtfsRoutesCsv(content: string): GtfsRouteImport[] {
  return parseCsvRecords(content).map(parseRouteRecord);
}

export function parseGtfsStopsCsv(content: string): GtfsStopImport[] {
  return parseCsvRecords(content).map(parseStopRecord);
}

export function deriveStationsFromGtfsStops(stops: GtfsStopImport[]): StationImport[] {
  const parentStops = stops.filter((stop) => stop.locationType === 1);
  const stationStops = parentStops.length > 0 ? parentStops : stops.filter((stop) => !stop.parentStation);

  return stationStops.map((stop) => ({
    id: stop.stopId,
    name: stop.stopName,
    gtfsStopId: stop.stopId,
    complexId: null,
    lat: stop.stopLat,
    lon: stop.stopLon,
    routes: [],
  }));
}

function parseRouteRecord(record: CsvRecord): GtfsRouteImport {
  return {
    routeId: requireField(record, "route_id"),
    routeShortName: record.route_short_name || requireField(record, "route_id"),
    routeLongName: record.route_long_name || null,
    routeColor: record.route_color || null,
    routeTextColor: record.route_text_color || null,
  };
}

function parseStopRecord(record: CsvRecord): GtfsStopImport {
  return {
    stopId: requireField(record, "stop_id"),
    stopName: requireField(record, "stop_name"),
    stopLat: parseOptionalNumber(record.stop_lat),
    stopLon: parseOptionalNumber(record.stop_lon),
    locationType: parseOptionalNumber(record.location_type) ?? 0,
    parentStation: record.parent_station || null,
  };
}

function requireField(record: CsvRecord, field: string): string {
  const value = record[field];

  if (!value) {
    throw new Error(`Missing required GTFS field: ${field}`);
  }

  return value;
}
