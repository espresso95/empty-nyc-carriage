import { parseCsvRecords, parseOptionalNumber, type CsvRecord } from "./csv";
import type { StationImport } from "./gtfs";

export type EntranceImport = {
  stationId: string;
  stopName: string;
  complexId: string | null;
  gtfsStopId: string | null;
  daytimeRoutes: string[];
  entranceType: string | null;
  entryAllowed: boolean;
  exitAllowed: boolean;
  lat: number;
  lon: number;
};

export function parseEntrancesCsv(content: string): EntranceImport[] {
  return parseCsvRecords(content).map(parseEntranceRecord);
}

export function deriveStationsFromEntrances(entrances: EntranceImport[]): StationImport[] {
  const stationsById = new Map<string, StationImport>();

  for (const entrance of entrances) {
    const existing = stationsById.get(entrance.stationId);

    if (existing) {
      existing.routes = uniqueSorted([...existing.routes, ...entrance.daytimeRoutes]);
      continue;
    }

    stationsById.set(entrance.stationId, {
      id: entrance.gtfsStopId ?? entrance.stationId,
      name: entrance.stopName,
      gtfsStopId: entrance.gtfsStopId ?? entrance.stationId,
      complexId: entrance.complexId,
      lat: entrance.lat,
      lon: entrance.lon,
      routes: entrance.daytimeRoutes,
    });
  }

  return [...stationsById.values()].map((station) => ({
    ...station,
    routes: uniqueSorted(station.routes),
  }));
}

function parseEntranceRecord(record: CsvRecord): EntranceImport {
  const lat = parseOptionalNumber(record.entrance_latitude);
  const lon = parseOptionalNumber(record.entrance_longitude);

  if (lat === null || lon === null) {
    throw new Error(`Entrance ${record.station_id ?? "unknown"} is missing coordinates`);
  }

  return {
    stationId: requireField(record, "station_id"),
    stopName: requireField(record, "stop_name"),
    complexId: record.complex_id || null,
    gtfsStopId: record.gtfs_stop_id || null,
    daytimeRoutes: parseRouteList(record.daytime_routes),
    entranceType: record.entrance_type || null,
    entryAllowed: parseYesNo(record.entry_allowed),
    exitAllowed: parseYesNo(record.exit_allowed),
    lat,
    lon,
  };
}

export function parseRouteList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return uniqueSorted(value.split(/\s+/).filter(Boolean));
}

function parseYesNo(value: string | undefined): boolean {
  return value?.toLowerCase() === "yes";
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function requireField(record: CsvRecord, field: string): string {
  const value = record[field];

  if (!value) {
    throw new Error(`Missing required entrances field: ${field}`);
  }

  return value;
}
