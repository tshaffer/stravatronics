import axios from 'axios';
import { getValidAccessToken } from './auth.js';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

export async function stravaGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const token = await getValidAccessToken();
  const response = await axios.get<T>(`${STRAVA_API_BASE}/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    params
  });
  return response.data;
}
