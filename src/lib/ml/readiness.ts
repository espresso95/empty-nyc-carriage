import type { DashboardObservation } from "../dashboard/summary";
import type { Zone } from "../prediction/scorer";

export type MlReadinessStage = "collecting-labels" | "compare-baselines" | "train-small-model";

export type BaselineComparison = {
  label: "heuristic-followed" | "always-middle" | "always-rear";
  observationCount: number;
  averageCrowding: number | null;
  comfortableRideRate: number | null;
};

export type MlReadinessSummary = {
  labelsCollected: number;
  stage: MlReadinessStage;
  nextMilestone: number | null;
  nextMilestoneLabel: string | null;
  baselineComparisons: BaselineComparison[];
};

const BASELINES: Array<{ label: BaselineComparison["label"]; zone?: Zone }> = [
  { label: "heuristic-followed" },
  { label: "always-middle", zone: "middle" },
  { label: "always-rear", zone: "rear" },
];

export function buildMlReadiness(observations: DashboardObservation[]): MlReadinessSummary {
  return {
    labelsCollected: observations.length,
    stage: readinessStage(observations.length),
    nextMilestone: nextMilestone(observations.length),
    nextMilestoneLabel: nextMilestoneLabel(observations.length),
    baselineComparisons: BASELINES.map((baseline) =>
      compareBaseline(observations, baseline.label, baseline.zone),
    ),
  };
}

function readinessStage(labelsCollected: number): MlReadinessStage {
  if (labelsCollected >= 300) {
    return "train-small-model";
  }

  if (labelsCollected >= 100) {
    return "compare-baselines";
  }

  return "collecting-labels";
}

function nextMilestone(labelsCollected: number): number | null {
  if (labelsCollected < 100) {
    return 100;
  }

  if (labelsCollected < 300) {
    return 300;
  }

  return null;
}

function nextMilestoneLabel(labelsCollected: number): string | null {
  if (labelsCollected < 100) {
    return "Start comparing heuristic vs simple baselines.";
  }

  if (labelsCollected < 300) {
    return "Start training a small personal model.";
  }

  return null;
}

function compareBaseline(
  observations: DashboardObservation[],
  label: BaselineComparison["label"],
  zone?: Zone,
): BaselineComparison {
  const matchingObservations =
    label === "heuristic-followed"
      ? observations.filter((observation) => observation.boardedZone === observation.recommendedZone)
      : observations.filter((observation) => observation.boardedZone === zone);

  return {
    label,
    observationCount: matchingObservations.length,
    averageCrowding: averageCrowding(matchingObservations),
    comfortableRideRate: comfortableRideRate(matchingObservations),
  };
}

function averageCrowding(observations: DashboardObservation[]): number | null {
  if (observations.length === 0) {
    return null;
  }

  const total = observations.reduce((sum, observation) => sum + observation.crowdingRating, 0);

  return round(total / observations.length);
}

function comfortableRideRate(observations: DashboardObservation[]): number | null {
  if (observations.length === 0) {
    return null;
  }

  const comfortableCount = observations.filter(
    (observation) => observation.couldBoard && observation.crowdingRating <= 3,
  ).length;

  return round(comfortableCount / observations.length);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
