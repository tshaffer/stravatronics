import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { fetchStravaActivities, fetchStravaDetailedActivity, type StravaSegmentEffort } from '../strava/activitiesApi.js';
import { upsertActivities, getActivities, getActivity, getLatestActivityDate, markEffortsFetched } from '../repositories/activityRepository.js';
import { upsertSegmentEfforts, getSegmentEfforts, type SegmentEffortDoc } from '../repositories/segmentEffortRepository.js';

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

function mapSegmentEffort(e: StravaSegmentEffort, activityStravaId: number): SegmentEffortDoc {
  return {
    stravaId: e.id,
    activityStravaId,
    name: e.name,
    elapsedTime: e.elapsed_time,
    movingTime: e.moving_time,
    startDate: e.start_date,
    distance: e.distance,
    averageWatts: e.average_watts ?? null,
    averageHeartrate: e.average_heartrate ?? null,
    maxHeartrate: e.max_heartrate ?? null,
    averageCadence: e.average_cadence ?? null,
    prRank: e.pr_rank ?? null,
    komRank: e.kom_rank ?? null,
    segment: {
      stravaId: e.segment.id,
      name: e.segment.name,
      distance: e.segment.distance,
      averageGrade: e.segment.average_grade,
      maximumGrade: e.segment.maximum_grade,
      elevationHigh: e.segment.elevation_high,
      elevationLow: e.segment.elevation_low,
      climbCategory: e.segment.climb_category
    }
  };
}

activityRouter.get('/:id/efforts', async (req: Request, res: Response) => {
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
  if (!activity.effortsFetched) {
    const detailed = await fetchStravaDetailedActivity(stravaId);
    const efforts = detailed.segment_efforts.map((e) => mapSegmentEffort(e, stravaId));
    await upsertSegmentEfforts(efforts);
    await markEffortsFetched(stravaId);
  }
  const efforts = await getSegmentEfforts(stravaId);
  res.json(efforts);
});

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
