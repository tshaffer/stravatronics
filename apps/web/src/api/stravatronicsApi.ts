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

export async function syncActivities(): Promise<{ synced: number }> {
  const res = await fetch('/api/activities/sync', { method: 'POST' });
  if (!res.ok) throw new Error('Sync failed');
  return res.json() as Promise<{ synced: number }>;
}
