import axios from 'axios';
import { config } from '../config.js';
import { getAppVariables, upsertAppVariables } from '../repositories/appVariablesRepository.js';

const TOKEN_ENDPOINT = 'https://www.strava.com/oauth/token';

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  athlete?: { id: number };
}

export function buildAuthorizationUrl(): string {
  const params = new URLSearchParams({
    client_id: config.strava.clientId,
    redirect_uri: config.strava.redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'read,activity:read_all',
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const response = await axios.post<StravaTokenResponse>(TOKEN_ENDPOINT, {
    client_id: config.strava.clientId,
    client_secret: config.strava.clientSecret,
    code,
    grant_type: 'authorization_code',
  });

  const { access_token, refresh_token, expires_at, athlete } = response.data;
  if (!athlete) throw new Error('No athlete in token response');

  await upsertAppVariables({
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenExpiresAt: expires_at,
    athleteId: athlete.id,
  });
}

export async function getValidAccessToken(): Promise<string> {
  const vars = await getAppVariables();
  if (!vars) throw new Error('Not authenticated — complete OAuth flow first');

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (vars.tokenExpiresAt > nowSeconds + 60) {
    return vars.accessToken;
  }

  // Token expired (or expiring within 60s) — refresh it
  const response = await axios.post<StravaTokenResponse>(TOKEN_ENDPOINT, {
    client_id: config.strava.clientId,
    client_secret: config.strava.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: vars.refreshToken,
  });

  const { access_token, refresh_token, expires_at } = response.data;
  await upsertAppVariables({
    ...vars,
    accessToken: access_token,
    refreshToken: refresh_token,
    tokenExpiresAt: expires_at,
  });

  return access_token;
}
