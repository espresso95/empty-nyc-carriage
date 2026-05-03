export const ZONES = ["front", "front-middle", "middle", "rear-middle", "rear"] as const;

export const PLATFORM_DISPLAY_ZONES = [
  "rear",
  "rear-middle",
  "middle",
  "front-middle",
  "front",
] as const satisfies readonly Zone[];

export type Zone = (typeof ZONES)[number];
export type Confidence = "low" | "medium" | "high";
export type ZoneScoreMap = Record<Zone, number>;

export type ZoneProfile = {
  entrancePressure: number;
  transferPressure?: number;
  profileConfidence?: number;
};

export type PredictionWeights = {
  entrance: number;
  headway: number;
  transfer: number;
  destination: number;
  routeBaseline: number;
};

export type FeatureContributions = Record<
  Zone,
  {
    entrance: number;
    headway: number;
    transfer: number;
    destination: number;
    routeBaseline: number;
    total: number;
  }
>;

export type PredictionContext = {
  stationId: string;
  routeId: string;
  direction: string;
  destinationStationId?: string;
  zoneProfiles: Record<Zone, ZoneProfile>;
  stationDemandIndex?: number;
  headwayPressure?: number;
  hasRealtimeHeadway?: boolean;
  destinationPressure?: Partial<ZoneScoreMap>;
  routeBaseline?: Partial<ZoneScoreMap>;
  complexStation?: boolean;
  weights?: Partial<PredictionWeights>;
};

export type PredictionResult = {
  recommendedZone: Zone;
  confidence: Confidence;
  scores: ZoneScoreMap;
  why: string[];
  contributions: FeatureContributions;
};

const DEFAULT_WEIGHTS: PredictionWeights = {
  entrance: 0.4,
  headway: 0.2,
  transfer: 0.15,
  destination: 0.15,
  routeBaseline: 0.1,
};

export function predictZone(context: PredictionContext): PredictionResult {
  const weights = { ...DEFAULT_WEIGHTS, ...context.weights };
  const stationDemandIndex = context.stationDemandIndex ?? 1;
  const headwayPressure = context.headwayPressure ?? 1;
  const headwayGapFactor = Math.max(0, headwayPressure - 1);
  const contributions = {} as FeatureContributions;
  const scores = {} as ZoneScoreMap;

  for (const zone of ZONES) {
    const zoneProfile = context.zoneProfiles[zone];
    const entrance = weights.entrance * zoneProfile.entrancePressure * stationDemandIndex;
    const headway = weights.headway * zoneProfile.entrancePressure * headwayGapFactor;
    const transfer = weights.transfer * (zoneProfile.transferPressure ?? 0);
    const destination = weights.destination * (context.destinationPressure?.[zone] ?? 0);
    const routeBaseline = weights.routeBaseline * (context.routeBaseline?.[zone] ?? 0);
    const total = roundScore(entrance + headway + transfer + destination + routeBaseline);

    contributions[zone] = {
      entrance: roundScore(entrance),
      headway: roundScore(headway),
      transfer: roundScore(transfer),
      destination: roundScore(destination),
      routeBaseline: roundScore(routeBaseline),
      total,
    };
    scores[zone] = total;
  }

  const rankedZones = rankZones(scores);
  const recommendedZone = rankedZones[0];

  return {
    recommendedZone,
    confidence: computeConfidence(scores, context),
    scores,
    why: explainPrediction(context, recommendedZone),
    contributions,
  };
}

export function rankZones(scores: ZoneScoreMap): Zone[] {
  return [...ZONES].sort((left, right) => scores[left] - scores[right]);
}

export function computeConfidence(scores: ZoneScoreMap, context: PredictionContext): Confidence {
  const rankedZones = rankZones(scores);
  const best = scores[rankedZones[0]];
  const secondBest = scores[rankedZones[1]];
  const bestGap = secondBest - best;
  const profileConfidence = averageProfileConfidence(context.zoneProfiles);
  const hasDestinationContext = Boolean(context.destinationStationId);

  if (context.complexStation || profileConfidence < 0.35 || bestGap < 0.025) {
    return "low";
  }

  if (
    bestGap >= 0.12 &&
    profileConfidence >= 0.75 &&
    context.hasRealtimeHeadway &&
    hasDestinationContext
  ) {
    return "high";
  }

  return "medium";
}

function explainPrediction(context: PredictionContext, recommendedZone: Zone): string[] {
  const reasons: string[] = [];
  const entranceSkew = getEntranceSkew(context.zoneProfiles);

  if (entranceSkew === "front") {
    reasons.push("Main entrances are weighted toward the front of the platform.");
  } else if (entranceSkew === "rear") {
    reasons.push("Main entrances are weighted toward the rear of the platform.");
  } else {
    reasons.push("Entrance pressure is fairly balanced across the platform.");
  }

  if (context.hasRealtimeHeadway && (context.headwayPressure ?? 1) >= 1.2) {
    reasons.push("This train is following a longer-than-usual gap.");
  }

  if ((context.stationDemandIndex ?? 1) >= 1.1) {
    reasons.push("This hour is above normal demand for the station.");
  } else if ((context.stationDemandIndex ?? 1) <= 0.9) {
    reasons.push("This hour is below normal demand for the station.");
  }

  const destinationZone = getLargestZone(context.destinationPressure);
  if (context.destinationStationId && destinationZone) {
    reasons.push(`Destination patterns add pressure near ${destinationZone}.`);
  }

  reasons.push(`The lowest computed crowding score is ${recommendedZone}.`);

  return reasons;
}

function getEntranceSkew(zoneProfiles: Record<Zone, ZoneProfile>): "front" | "rear" | "balanced" {
  const frontPressure =
    zoneProfiles.front.entrancePressure + zoneProfiles["front-middle"].entrancePressure;
  const rearPressure =
    zoneProfiles.rear.entrancePressure + zoneProfiles["rear-middle"].entrancePressure;
  const difference = frontPressure - rearPressure;

  if (difference > 0.15) {
    return "front";
  }

  if (difference < -0.15) {
    return "rear";
  }

  return "balanced";
}

function getLargestZone(values: Partial<ZoneScoreMap> | undefined): Zone | null {
  if (!values) {
    return null;
  }

  let largestZone: Zone | null = null;
  let largestValue = 0;

  for (const zone of ZONES) {
    const value = values[zone] ?? 0;

    if (value > largestValue) {
      largestZone = zone;
      largestValue = value;
    }
  }

  return largestValue > 0 ? largestZone : null;
}

function averageProfileConfidence(zoneProfiles: Record<Zone, ZoneProfile>): number {
  const total = ZONES.reduce(
    (sum, zone) => sum + (zoneProfiles[zone].profileConfidence ?? 0.5),
    0,
  );

  return total / ZONES.length;
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}
