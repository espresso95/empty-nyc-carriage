import { PLATFORM_DISPLAY_ZONES, type Zone } from "../prediction/scorer";

export type DashboardObservation = {
  observedAt: string;
  stationId: string;
  stationName: string | null;
  routeId: string;
  direction: string;
  recommendedZone: Zone;
  boardedZone: Zone;
  crowdingRating: number;
  couldBoard: boolean;
};

export type ZoneCrowdingSummary = {
  zone: Zone;
  observationCount: number;
  averageCrowding: number | null;
};

export type RouteCrowdingSummary = {
  routeId: string;
  observationCount: number;
  averageCrowding: number;
};

export type DashboardSummary = {
  observationCount: number;
  mostCommonRoute: string | null;
  averageCrowdingWhenFollowing: number | null;
  averageCrowdingOtherwise: number | null;
  recommendationFollowRate: number | null;
  bestPerformingRecommendation: Zone | null;
  crowdingByBoardedZone: ZoneCrowdingSummary[];
  routePatterns: RouteCrowdingSummary[];
  recentObservations: DashboardObservation[];
};

export function buildDashboardSummary(observations: DashboardObservation[]): DashboardSummary {
  const followed = observations.filter((observation) => didFollowRecommendation(observation));
  const otherwise = observations.filter((observation) => !didFollowRecommendation(observation));
  const recommendationGroups = groupByZone(observations, (observation) => observation.recommendedZone);

  return {
    observationCount: observations.length,
    mostCommonRoute: mostCommonRoute(observations),
    averageCrowdingWhenFollowing: averageCrowding(followed),
    averageCrowdingOtherwise: averageCrowding(otherwise),
    recommendationFollowRate:
      observations.length > 0 ? round(followed.length / observations.length) : null,
    bestPerformingRecommendation: bestPerformingRecommendation(recommendationGroups),
    crowdingByBoardedZone: PLATFORM_DISPLAY_ZONES.map((zone) => {
      const zoneObservations = observations.filter((observation) => observation.boardedZone === zone);

      return {
        zone,
        observationCount: zoneObservations.length,
        averageCrowding: averageCrowding(zoneObservations),
      };
    }),
    routePatterns: routePatterns(observations),
    recentObservations: [...observations].slice(0, 5),
  };
}

function didFollowRecommendation(observation: DashboardObservation): boolean {
  return observation.boardedZone === observation.recommendedZone;
}

function averageCrowding(observations: DashboardObservation[]): number | null {
  if (observations.length === 0) {
    return null;
  }

  const total = observations.reduce((sum, observation) => sum + observation.crowdingRating, 0);

  return round(total / observations.length);
}

function mostCommonRoute(observations: DashboardObservation[]): string | null {
  const counts = new Map<string, number>();

  for (const observation of observations) {
    counts.set(observation.routeId, (counts.get(observation.routeId) ?? 0) + 1);
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;
}

function groupByZone<T>(
  observations: DashboardObservation[],
  selector: (observation: DashboardObservation) => Zone,
): Map<Zone, DashboardObservation[]> {
  const groups = new Map<Zone, DashboardObservation[]>();

  for (const observation of observations) {
    const zone = selector(observation);
    groups.set(zone, [...(groups.get(zone) ?? []), observation]);
  }

  return groups;
}

function bestPerformingRecommendation(groups: Map<Zone, DashboardObservation[]>): Zone | null {
  return [...groups.entries()]
    .map(([zone, observations]) => ({
      zone,
      average: averageCrowding(observations),
      count: observations.length,
    }))
    .filter((summary): summary is { zone: Zone; average: number; count: number } => summary.average !== null)
    .sort((left, right) => left.average - right.average || right.count - left.count)[0]?.zone ?? null;
}

function routePatterns(observations: DashboardObservation[]): RouteCrowdingSummary[] {
  const grouped = new Map<string, DashboardObservation[]>();

  for (const observation of observations) {
    grouped.set(observation.routeId, [...(grouped.get(observation.routeId) ?? []), observation]);
  }

  return [...grouped.entries()]
    .map(([routeId, routeObservations]) => ({
      routeId,
      observationCount: routeObservations.length,
      averageCrowding: averageCrowding(routeObservations) ?? 0,
    }))
    .sort((left, right) => right.observationCount - left.observationCount || left.routeId.localeCompare(right.routeId))
    .slice(0, 5);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
