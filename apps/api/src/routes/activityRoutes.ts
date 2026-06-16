import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { fetchStravaActivities, fetchStravaDetailedActivity, type StravaSegmentEffort } from '../strava/activitiesApi.js';
import { fetchStravaStreams } from '../strava/streamsApi.js';
import { upsertActivities, getActivities, getActivity, getLatestActivityDate, markEffortsFetched, markStreamsFetched, updateSufferScore } from '../repositories/activityRepository.js';
import { upsertSegmentEfforts, getSegmentEfforts, updateEffortPowerMetrics, type SegmentEffortDoc } from '../repositories/segmentEffortRepository.js';
import { upsertActivityStreams, getActivityStreams } from '../repositories/activityStreamsRepository.js';
import { computeNormalizedPower, computeIntensityFactor, computeTrainingStressScore, computeMmpCurve, downsample } from '../utilities/power.js';
import { config } from '../config.js';

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
    startIndex: e.start_index ?? null,
    endIndex: e.end_index ?? null,
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

async function computeAndStoreEffortPowerMetrics(activityStravaId: number, watts: number[]): Promise<void> {
  const ftp = config.ftp;
  const efforts = await getSegmentEfforts(activityStravaId);
  for (const effort of efforts) {
    const si = effort.startIndex;
    const ei = effort.endIndex;
    if (si == null || ei == null || ei <= si) continue;
    const slice = watts.slice(si, ei + 1);
    if (slice.length < 30) continue;
    // build a synthetic time array for the slice (1 sample/sec)
    const time = Array.from({ length: slice.length }, (_, i) => i);
    const np = computeNormalizedPower(slice, time);
    if (np == null) continue;
    const IF = computeIntensityFactor(ftp, np);
    const tss = computeTrainingStressScore(ftp, np, IF, slice.length);
    await updateEffortPowerMetrics(effort.stravaId, {
      normalizedPower: np,
      intensityFactor: Math.round(IF * 1000) / 1000,
      trainingStressScore: Math.round(tss * 10) / 10
    });
  }
}

const CHART_POINTS = 500;

activityRouter.get('/:id/streams', async (req: Request, res: Response) => {
  const stravaId = Number(req.params['id']);
  if (isNaN(stravaId)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const activity = await getActivity(stravaId);
  if (!activity) { res.status(404).json({ error: 'Not found' }); return; }

  if (!activity.streamsFetched) {
    const raw = await fetchStravaStreams(stravaId);
    const latlng = raw.latlng?.data ?? [];
    const wattsData = raw.watts?.data ?? [];
    const timeData = raw.time?.data ?? [];
    const ftp = config.ftp;

    const np = wattsData.length > 0 && timeData.length > 0
      ? computeNormalizedPower(wattsData, timeData) ?? null
      : null;
    const IF = np != null ? computeIntensityFactor(ftp, np) : null;
    const tss = np != null && IF != null && timeData.length > 0
      ? computeTrainingStressScore(ftp, np, IF, timeData[timeData.length - 1]! - timeData[0]!)
      : null;
    const mmp = wattsData.length >= 5 ? computeMmpCurve(wattsData) : [];

    const doc = {
      activityStravaId: stravaId,
      time: timeData,
      latitudes: latlng.map((p) => p[0]),
      longitudes: latlng.map((p) => p[1]),
      altitude: raw.altitude?.data ?? [],
      distance: raw.distance?.data ?? [],
      gradeSmooth: raw.grade_smooth?.data ?? [],
      heartrate: raw.heartrate?.data ?? [],
      cadence: raw.cadence?.data ?? [],
      watts: wattsData,
      normalizedPower: np,
      intensityFactor: IF != null ? Math.round(IF * 1000) / 1000 : null,
      trainingStressScore: tss != null ? Math.round(tss * 10) / 10 : null,
      maxPowerAtDurations: mmp
    };
    await upsertActivityStreams(doc);
    await markStreamsFetched(stravaId);

    // Compute per-segment-effort power metrics now that we have watts
    if (wattsData.length > 0) {
      await computeAndStoreEffortPowerMetrics(stravaId, wattsData);
    }
  }

  const stored = await getActivityStreams(stravaId);
  if (!stored) { res.status(404).json({ error: 'Streams not available' }); return; }

  const n = stored.distance.length;
  const indices = n <= CHART_POINTS
    ? Array.from({ length: n }, (_, i) => i)
    : downsample(Array.from({ length: n }, (_, i) => i), CHART_POINTS);

  const hasAlt = stored.altitude.length === n;
  const hasWatts = stored.watts.length === n;
  const hasHR = stored.heartrate.length === n;
  const hasCadence = stored.cadence.length === n;

  const chart = indices.map((i) => ({
    distance: stored.distance[i] ?? 0,
    ...(hasAlt ? { altitude: stored.altitude[i] } : {}),
    ...(hasWatts ? { watts: stored.watts[i] } : {}),
    ...(hasHR ? { heartrate: stored.heartrate[i] } : {}),
    ...(hasCadence ? { cadence: stored.cadence[i] } : {})
  }));

  res.json({
    normalizedPower: stored.normalizedPower ?? null,
    intensityFactor: stored.intensityFactor ?? null,
    trainingStressScore: stored.trainingStressScore ?? null,
    sampleCount: n,
    hasAltitude: hasAlt,
    hasWatts,
    hasHeartrate: hasHR,
    hasCadence,
    chart
  });
});

activityRouter.get('/:id/mmp', async (req: Request, res: Response) => {
  const stravaId = Number(req.params['id']);
  if (isNaN(stravaId)) { res.status(400).json({ error: 'Invalid id' }); return; }

  const stored = await getActivityStreams(stravaId);
  if (!stored) { res.status(404).json({ error: 'Streams not available — load activity detail first' }); return; }

  const mmp = stored.maxPowerAtDurations ?? [];
  // Return as {duration, power} pairs starting at 5s
  const curve = mmp.map((power, i) => ({ duration: i + 5, power }));
  res.json({ curve });
});

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
    if (detailed.suffer_score != null) {
      await updateSufferScore(stravaId, detailed.suffer_score);
    }
    await markEffortsFetched(stravaId);

    // If streams were already fetched, compute per-effort power now
    const streams = await getActivityStreams(stravaId);
    if (streams && streams.watts.length > 0) {
      await computeAndStoreEffortPowerMetrics(stravaId, streams.watts as number[]);
    }
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
