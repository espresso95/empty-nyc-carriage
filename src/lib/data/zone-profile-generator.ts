import type { Zone } from "../prediction/scorer";
import { ZONES } from "../prediction/scorer";
import type { EntranceImport } from "./entrances";

export type GeneratedZoneProfile = {
  stationId: string;
  routeId: string;
  direction: "N" | "S" | "E" | "W";
  zone: Zone;
  entrancePressure: number;
  confidence: number;
};

const routeDirections: Record<string, Array<GeneratedZoneProfile["direction"]>> = {
  "7": ["E", "W"],
  L: ["E", "W"],
  S: ["N", "S"],
};

export function generateZoneProfilesFromEntrances(
  stationId: string,
  entrances: EntranceImport[],
): GeneratedZoneProfile[] {
  const stationEntrances = entrances.filter((entrance) => entrance.gtfsStopId === stationId);
  const routes = [...new Set(stationEntrances.flatMap((entrance) => entrance.daytimeRoutes))].sort();

  return routes.flatMap((routeId) =>
    directionsForRoute(routeId).flatMap((direction) =>
      buildDirectionProfiles(stationId, routeId, direction, stationEntrances),
    ),
  );
}

function buildDirectionProfiles(
  stationId: string,
  routeId: string,
  direction: GeneratedZoneProfile["direction"],
  entrances: EntranceImport[],
): GeneratedZoneProfile[] {
  const buckets = Object.fromEntries(ZONES.map((zone) => [zone, 0])) as Record<Zone, number>;
  const axis = chooseAxis(entrances);
  const coordinates = entrances.map((entrance) => (axis === "lat" ? entrance.lat : entrance.lon));
  const min = Math.min(...coordinates);
  const max = Math.max(...coordinates);
  const span = max - min;

  for (const entrance of entrances) {
    const coordinate = axis === "lat" ? entrance.lat : entrance.lon;
    const normalized = span === 0 ? 0.5 : (coordinate - min) / span;
    const directionNormalized = direction === "S" || direction === "W" ? 1 - normalized : normalized;
    const zone = normalizedToZone(directionNormalized);
    const weight = entranceWeight(entrance);

    buckets[zone] += weight;
  }

  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  const confidence = entrances.length >= 2 ? 0.45 : 0.25;

  return ZONES.map((zone) => ({
    stationId,
    routeId,
    direction,
    zone,
    entrancePressure: total > 0 ? round(buckets[zone] / total) : 0,
    confidence,
  }));
}

function directionsForRoute(routeId: string): Array<GeneratedZoneProfile["direction"]> {
  return routeDirections[routeId] ?? ["N", "S"];
}

function chooseAxis(entrances: EntranceImport[]): "lat" | "lon" {
  const lats = entrances.map((entrance) => entrance.lat);
  const lons = entrances.map((entrance) => entrance.lon);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lonSpan = Math.max(...lons) - Math.min(...lons);

  return latSpan >= lonSpan ? "lat" : "lon";
}

function normalizedToZone(value: number): Zone {
  if (value < 0.2) {
    return "rear";
  }

  if (value < 0.4) {
    return "rear-middle";
  }

  if (value < 0.6) {
    return "middle";
  }

  if (value < 0.8) {
    return "front-middle";
  }

  return "front";
}

function entranceWeight(entrance: EntranceImport): number {
  const accessWeight = entrance.entryAllowed ? 1 : 0.35;
  const typeWeight = entrance.entranceType?.toLowerCase().includes("elevator") ? 0.75 : 1;

  return accessWeight * typeWeight;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
