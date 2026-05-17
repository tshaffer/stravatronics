import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { fetchStravaActivities } from '../strava/activitiesApi.js';
import { upsertActivities, getActivities, getActivity, getLatestActivityDate } from '../repositories/activityRepository.js';

export const activityRouter: RouterType = Router();

activityRouter.get('/', async (_req: Request, res: Response) => {
  const activities = await getActivities();
  res.json(activities);
});

function mapActivity(a: Awaited<ReturnType<typeof fetchStravaActivities>>[number]) {
  return {
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
  };
}

activityRouter.get('/:id', async (req: Request, res: Response) => {
  const stravaId = Number(req.params['id']);
  if (isNaN(stravaId)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const activity = await getActivity(stravaId);
  if (!activity) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(activity);
});

activityRouter.post('/sync', async (_req: Request, res: Response) => {
  const afterEpoch = await getLatestActivityDate();
  const batch = await fetchStravaActivities(afterEpoch, 1, 200);
  if (batch.length > 0) {
    await upsertActivities(batch.map(mapActivity));
  }
  res.json({ synced: batch.length });
});
