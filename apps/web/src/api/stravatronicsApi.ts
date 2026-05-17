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
  name: string;
  type: string;
  sportType?: string;
  startDate: string;
  startDateLocal: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  totalElevationGain: number;
  averageSpeed: number;
  averageHeartrate?: number;
  averageWatts?: number;
  weightedAverageWatts?: number;
  kilojoules?: number;
  prCount: number;
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

export async function syncActivities(): Promise<{ synced: number }> {
  const res = await fetch('/api/activities/sync', { method: 'POST' });
  if (!res.ok) throw new Error('Sync failed');
  return res.json() as Promise<{ synced: number }>;
}
