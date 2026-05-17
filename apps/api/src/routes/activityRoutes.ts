import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { fetchStravaActivities } from '../strava/activitiesApi.js';
import { upsertActivities, getActivities, getLatestActivityDate } from '../repositories/activityRepository.js';

export const activityRouter: RouterType = Router();

activityRouter.get('/', async (_req: Request, res: Response) => {
  const activities = await getActivities();
  res.json(activities);
});

activityRouter.post('/sync', async (_req: Request, res: Response) => {
  const afterEpoch = await getLatestActivityDate();
  const maxActivities = 100; // temporary limit for initial testing
  let page = 1;
  let totalSynced = 0;

  while (totalSynced < maxActivities) {
    const remaining = maxActivities - totalSynced;
    const batch = await fetchStravaActivities(afterEpoch, page, Math.min(remaining, 200));
    if (batch.length === 0) break;

    await upsertActivities(batch.map((a) => ({
      stravaId: a.id,
      athleteId: a.athlete.id,
      name: a.name,
      type: a.type,
      sportType: a.sport_type ?? null,
      startDate: a.start_date,
      startDateLocal: a.start_date_local,
      timezone: a.timezone ?? null,
      utcOffset: a.utc_offset ?? null,
      distance: a.distance,
      movingTime: a.moving_time,
      elapsedTime: a.elapsed_time,
      totalElevationGain: a.total_elevation_gain,
      averageSpeed: a.average_speed,
      maxSpeed: a.max_speed,
      startLatitude: a.start_latitude ?? null,
      startLongitude: a.start_longitude ?? null,
      summaryPolyline: a.map?.summary_polyline ?? null,
      achievementCount: a.achievement_count,
      prCount: a.pr_count,
      hasHeartrate: a.has_heartrate,
      averageHeartrate: a.average_heartrate ?? null,
      maxHeartrate: a.max_heartrate ?? null,
      averageCadence: a.average_cadence ?? null,
      averageWatts: a.average_watts ?? null,
      maxWatts: a.max_watts ?? null,
      weightedAverageWatts: a.weighted_average_watts ?? null,
      kilojoules: a.kilojoules ?? null,
      deviceWatts: a.device_watts ?? null,
      averageTemp: a.average_temp ?? null,
      elevHigh: a.elev_high ?? null,
      elevLow: a.elev_low ?? null
    })));

    totalSynced += batch.length;
    if (batch.length < 200) break;
    page++;
  }

  res.json({ synced: totalSynced });
});
