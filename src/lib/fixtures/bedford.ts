import { predictZone, type PredictionContext } from "../prediction/scorer";

export const bedfordTrip = {
  station: "Bedford Av",
  route: "L",
  direction: "Manhattan-bound",
  destination: "14 St-Union Sq",
  train: {
    label: "L train",
    arrivesIn: 3,
    followingGap: 7,
    tripId: "fixture-l-bedford-001",
  },
};

export const bedfordPredictionContext = {
  stationId: "L08",
  routeId: "L",
  direction: "W",
  destinationStationId: "L03",
  stationDemandIndex: 1.18,
  headwayPressure: 1.35,
  hasRealtimeHeadway: true,
  zoneProfiles: {
    front: {
      entrancePressure: 0.84,
      transferPressure: 0.05,
      profileConfidence: 0.68,
    },
    "front-middle": {
      entrancePressure: 0.7,
      transferPressure: 0.06,
      profileConfidence: 0.68,
    },
    middle: {
      entrancePressure: 0.46,
      transferPressure: 0.1,
      profileConfidence: 0.68,
    },
    "rear-middle": {
      entrancePressure: 0.16,
      transferPressure: 0.04,
      profileConfidence: 0.68,
    },
    rear: {
      entrancePressure: 0.21,
      transferPressure: 0.03,
      profileConfidence: 0.68,
    },
  },
  destinationPressure: {
    front: 0.1,
    "front-middle": 0.08,
    middle: 0.12,
    "rear-middle": 0.03,
    rear: 0.04,
  },
  routeBaseline: {
    front: 0.06,
    "front-middle": 0.05,
    middle: 0.04,
    "rear-middle": 0.01,
    rear: 0.08,
  },
} satisfies PredictionContext;

const prediction = predictZone(bedfordPredictionContext);

export const bedfordRecommendation = {
  ...bedfordTrip,
  ...prediction,
};

export const bedfordTrains = [
  {
    id: bedfordTrip.train.tripId,
    label: "L train",
    direction: bedfordTrip.direction,
    arrivesIn: bedfordTrip.train.arrivesIn,
    followingGap: bedfordTrip.train.followingGap,
    estimate: "medium-high",
    recommendationPreview: prediction.recommendedZone,
  },
  {
    id: "fixture-l-bedford-002",
    label: "L train",
    direction: bedfordTrip.direction,
    arrivesIn: 8,
    followingGap: 5,
    estimate: "medium",
    recommendationPreview: prediction.recommendedZone,
  },
];
