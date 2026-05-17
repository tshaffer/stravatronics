import { stravaGet } from './client.js';

const STREAM_KEYS = 'time,latlng,altitude,distance,grade_smooth,heartrate,cadence,watts';

interface StravaStreamData<T> {
  data: T[];
  series_type: string;
  resolution: string;
}

export interface StravaStreams {
  time?: StravaStreamData<number>;
  latlng?: StravaStreamData<[number, number]>;
  altitude?: StravaStreamData<number>;
  distance?: StravaStreamData<number>;
  grade_smooth?: StravaStreamData<number>;
  heartrate?: StravaStreamData<number>;
  cadence?: StravaStreamData<number>;
  watts?: StravaStreamData<number>;
}

export async function fetchStravaStreams(activityId: number): Promise<StravaStreams> {
  return stravaGet<StravaStreams>(`activities/${activityId}/streams`, {
    keys: STREAM_KEYS,
    key_by_type: 1
  });
}
