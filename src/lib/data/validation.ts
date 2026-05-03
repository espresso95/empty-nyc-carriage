import type { GeneratedZoneProfile } from "./zone-profile-generator";

export type ZoneProfileValidationSummary = {
  stationCount: number;
  routeDirectionCount: number;
  lowConfidenceCount: number;
  profileCount: number;
};

export function summarizeZoneProfiles(
  profiles: GeneratedZoneProfile[],
): ZoneProfileValidationSummary {
  const stations = new Set(profiles.map((profile) => profile.stationId));
  const routeDirections = new Set(
    profiles.map((profile) => `${profile.stationId}:${profile.routeId}:${profile.direction}`),
  );
  const lowConfidenceCount = profiles.filter((profile) => profile.confidence < 0.35).length;

  return {
    stationCount: stations.size,
    routeDirectionCount: routeDirections.size,
    lowConfidenceCount,
    profileCount: profiles.length,
  };
}
