import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env['PORT'] ?? 4000),
  webAppUrl: process.env['WEB_APP_URL'] ?? 'http://localhost:3000',
  mongoUri: requireEnv('MONGODB_URI'),
  strava: {
    clientId: requireEnv('STRAVA_CLIENT_ID'),
    clientSecret: requireEnv('STRAVA_CLIENT_SECRET'),
    redirectUri: process.env['STRAVA_REDIRECT_URI'] ?? 'http://localhost:4000/api/auth/callback'
  }
};
