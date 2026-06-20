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

export interface StravaEmbeddedSegment {
  id: number;
  name: string;
  distance: number;
  average_grade: number;
  maximum_grade: number;
  elevation_high: number;
  elevation_low: number;
  climb_category: number;
}

export interface StravaSegmentEffort {
  id: number;
  name: string;
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
  start_index?: number;
  end_index?: number;
  hidden?: boolean;
  segment: StravaEmbeddedSegment;
}

export interface StravaDetailedActivity extends StravaSummaryActivity {
  description?: string;
  calories?: number;
  device_name?: string;
  suffer_score?: number | null;
  segment_efforts: StravaSegmentEffort[];
}

export async function fetchStravaDetailedActivity(id: number): Promise<StravaDetailedActivity> {
  return stravaGet<StravaDetailedActivity>(`activities/${id}`, {
    include_all_efforts: 1
  });
}
