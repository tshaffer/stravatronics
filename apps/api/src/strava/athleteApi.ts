import { stravaGet } from './client.js';

export interface StravaDetailedAthlete {
  id: number;
  firstname: string;
  lastname: string;
  profile: string;
  profile_medium: string;
  city?: string;
  state?: string;
  country?: string;
  sex?: string;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  follower_count: number;
  friend_count: number;
  measurement_preference: string;
  ftp?: number;
  weight?: number;
}

export function fetchStravaAthlete(): Promise<StravaDetailedAthlete> {
  return stravaGet<StravaDetailedAthlete>('athlete');
}
