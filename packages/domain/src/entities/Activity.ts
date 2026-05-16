import type { LatLng, PolylineMap } from './Geo.js';

export interface SummaryActivity {
  id: string;
  stravaId: number;
  athleteId: number;
  name: string;
  type: string;
  startDate: string;
  startDateLocal: string;
  timezone: string;
  utcOffset: number;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number;
  averageSpeed: number;
  maxSpeed: number;
  startLatLng: LatLng | null;
  endLatLng: LatLng | null;
  startLatitude: number | null;
  startLongitude: number | null;
  map: PolylineMap;
  achievementCount: number;
  prCount: number;
  averageCadence?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  hasHeartrate: boolean;
  averageWatts?: number;
  maxWatts?: number;
  weightedAverageWatts?: number;
  kilojoules?: number;
  deviceWatts?: boolean;
  averageTemp?: number;
  elevHigh?: number;
  elevLow?: number;
  resourceState: number;
}

export interface DetailedActivity extends SummaryActivity {
  description?: string;
  calories?: number;
  deviceName?: string;
  normalizedPower?: number;
  intensityFactor?: number;
  trainingStressScore?: number;
}
