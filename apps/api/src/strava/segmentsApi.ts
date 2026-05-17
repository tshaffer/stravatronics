import { stravaGet } from './client.js';

export interface StravaSegmentEffortLeaderboard {
  id: number;
  elapsed_time: number;
  moving_time: number;
  start_date: string;
  start_date_local: string;
  distance: number;
  average_watts?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  pr_rank?: number | null;
  kom_rank?: number | null;
  activity: { id: number };
  segment: {
    id: number;
    name: string;
    distance: number;
    average_grade: number;
  };
}

export async function fetchAllSegmentEfforts(
  segmentId: number,
  athleteId: number
): Promise<StravaSegmentEffortLeaderboard[]> {
  return stravaGet<StravaSegmentEffortLeaderboard[]>(
    `segments/${segmentId}/all_efforts`,
    { athlete_id: athleteId, per_page: 200 }
  );
}
