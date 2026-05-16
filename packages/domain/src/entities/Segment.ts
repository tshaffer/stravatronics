import type { LatLng, PolylineMap } from './Geo.js';

export interface Segment {
  id: string;
  stravaId: number;
  name: string;
  activityType: string;
  distance: number;
  averageGrade: number;
  maximumGrade: number;
  elevationHigh: number;
  elevationLow: number;
  totalElevationGain: number;
  climbCategory: number;
  startLatLng: LatLng;
  endLatLng: LatLng;
  map: PolylineMap;
  effortCount: number;
  athleteCount: number;
  starred: boolean;
  hazardous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Achievement {
  achievementType: string;
  rank: number;
  typeId: number;
}

export interface SegmentEffort {
  id: string;
  stravaId: number;
  segmentId: number;
  activityId: number;
  name: string;
  startDate: string;
  startDateLocal: string;
  elapsedTime: number;
  movingTime: number;
  distance: number;
  startIndex?: number;
  endIndex?: number;
  averageCadence?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageWatts?: number;
  deviceWatts?: boolean;
  prRank?: number;
  komRank?: number;
  achievements: Achievement[];
  normalizedPower?: number;
  intensityFactor?: number;
  trainingStressScore?: number;
}
