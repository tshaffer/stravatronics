import { stravaGet } from './client.js';

export interface StravaLatLng {
  latlng: number[];
}

export interface StravaPolylineMap {
  id: string;
  summary_polyline: string;
}

export interface StravaSummaryActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  start_latlng: StravaLatLng | null;
  end_latlng: StravaLatLng | null;
  start_latitude?: number;
  start_longitude?: number;
  map: StravaPolylineMap;
  achievement_count: number;
  pr_count: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  average_temp?: number;
  elev_high?: number;
  elev_low?: number;
  athlete: { id: number };
}

export async function fetchStravaActivities(afterEpoch = 0, page = 1, perPage = 200): Promise<StravaSummaryActivity[]> {
  return stravaGet<StravaSummaryActivity[]>('athlete/activities', {
    after: afterEpoch,
    per_page: perPage,
    page
  });
}
