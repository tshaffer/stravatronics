export interface Athlete {
  stravaId: number;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  city?: string;
  state?: string;
  country?: string;
  measurementPreference?: string;
}

export interface Activity {
  stravaId: number;
  athleteId: number;
  name: string;
  type: string;
  sportType?: string;
  startDate: string;
  startDateLocal: string;
  timezone?: string;
  utcOffset?: number;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number;
  averageSpeed: number;
  maxSpeed?: number;
  startLatitude?: number;
  startLongitude?: number;
  summaryPolyline?: string;
  achievementCount?: number;
  prCount: number;
  hasHeartrate?: boolean;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageCadence?: number;
  averageWatts?: number;
  maxWatts?: number;
  weightedAverageWatts?: number;
  kilojoules?: number;
  deviceWatts?: boolean;
  averageTemp?: number;
  elevHigh?: number;
  elevLow?: number;
  sufferScore?: number;
  calories?: number;
}

export async function fetchAthlete(): Promise<Athlete> {
  const res = await fetch('/api/athlete');
  if (!res.ok) throw new Error('Failed to fetch athlete');
  return res.json() as Promise<Athlete>;
}

export async function fetchActivities(): Promise<Activity[]> {
  const res = await fetch('/api/activities');
  if (!res.ok) throw new Error('Failed to fetch activities');
  return res.json() as Promise<Activity[]>;
}

export async function fetchActivity(stravaId: number): Promise<Activity> {
  const res = await fetch(`/api/activities/${stravaId}`);
  if (!res.ok) throw new Error('Failed to fetch activity');
  return res.json() as Promise<Activity>;
}

export interface SegmentSummary {
  stravaId: number;
  name: string;
  distance: number;
  averageGrade: number;
  maximumGrade: number;
  elevationHigh: number;
  elevationLow: number;
  climbCategory: number;
}

export interface SegmentEffort {
  stravaId: number;
  activityStravaId: number;
  name: string;
  elapsedTime: number;
  movingTime: number;
  distance: number;
  averageWatts?: number;
  averageHeartrate?: number;
  maxHeartrate?: number;
  averageCadence?: number;
  prRank?: number;
  komRank?: number;
  normalizedPower?: number;
  intensityFactor?: number;
  trainingStressScore?: number;
  hidden?: boolean;
  segment: SegmentSummary;
}

export async function fetchSegmentEfforts(stravaId: number): Promise<SegmentEffort[]> {
  const res = await fetch(`/api/activities/${stravaId}/efforts`);
  if (!res.ok) throw new Error('Failed to fetch segment efforts');
  return res.json() as Promise<SegmentEffort[]>;
}

export interface StreamChartPoint {
  distance: number;
  time?: number;
  movingTime?: number;
  altitude?: number;
  watts?: number;
  heartrate?: number;
  cadence?: number;
  grade?: number;
}

export interface ActivityStreams {
  normalizedPower: number | null;
  intensityFactor: number | null;
  trainingStressScore: number | null;
  sampleCount: number;
  hasAltitude: boolean;
  hasWatts: boolean;
  hasHeartrate: boolean;
  hasCadence: boolean;
  chart: StreamChartPoint[];
}

export interface MmpCurvePoint {
  duration: number;
  power: number;
}

export async function fetchMmpCurve(stravaId: number): Promise<MmpCurvePoint[]> {
  const res = await fetch(`/api/activities/${stravaId}/mmp`);
  if (!res.ok) throw new Error('MMP data not available');
  const data = await res.json() as { curve: MmpCurvePoint[] };
  return data.curve;
}

export async function fetchActivityStreams(stravaId: number): Promise<ActivityStreams> {
  const res = await fetch(`/api/activities/${stravaId}/streams`);
  if (!res.ok) throw new Error('Failed to fetch streams');
  return res.json() as Promise<ActivityStreams>;
}

export interface LeaderboardEffort {
  stravaId: number;
  activityStravaId: number;
  elapsedTime: number;
  movingTime: number;
  startDate: string;
  startDateLocal: string;
  distance: number;
  averageWatts?: number;
  averageHeartrate?: number;
  prRank?: number;
  komRank?: number;
}

export interface SegmentLeaderboard {
  segment: {
    stravaId: number;
    name: string;
    distance: number | null;
    averageGrade: number | null;
  };
  summary: {
    totalEfforts: number;
    prTime: number | null;
    avgTime: number | null;
  };
  efforts: LeaderboardEffort[];
}

export async function fetchSegmentLeaderboard(segmentId: number): Promise<SegmentLeaderboard> {
  const res = await fetch(`/api/segments/${segmentId}/efforts`);
  if (!res.ok) throw new Error('Failed to fetch segment leaderboard');
  return res.json() as Promise<SegmentLeaderboard>;
}

export async function refreshActivity(stravaId: number): Promise<void> {
  const res = await fetch(`/api/activities/${stravaId}/refresh`, { method: 'POST' });
  if (!res.ok) throw new Error('Refresh failed');
}

export async function syncActivities(): Promise<{ synced: number }> {
  const res = await fetch('/api/activities/sync', { method: 'POST' });
  if (!res.ok) throw new Error('Sync failed');
  return res.json() as Promise<{ synced: number }>;
}
