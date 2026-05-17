import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { fetchAllSegmentEfforts } from '../strava/segmentsApi.js';
import { getAthlete } from '../repositories/athleteRepository.js';
import {
  upsertSegment, getSegment, markAllEffortsFetched,
  upsertLeaderboardEfforts, getLeaderboardEfforts,
  type LeaderboardEffortDoc
} from '../repositories/segmentLeaderboardRepository.js';
import type { StravaSegmentEffortLeaderboard } from '../strava/segmentsApi.js';

export const segmentRouter: RouterType = Router();

function mapEffort(e: StravaSegmentEffortLeaderboard): LeaderboardEffortDoc {
  return {
    stravaId: e.id,
    segmentStravaId: e.segment.id,
    activityStravaId: e.activity.id,
    elapsedTime: e.elapsed_time,
    movingTime: e.moving_time,
    startDate: e.start_date,
    startDateLocal: e.start_date_local,
    distance: e.distance,
    averageWatts: e.average_watts ?? null,
    averageHeartrate: e.average_heartrate ?? null,
    maxHeartrate: e.max_heartrate ?? null,
    averageCadence: e.average_cadence ?? null,
    prRank: e.pr_rank ?? null,
    komRank: e.kom_rank ?? null
  };
}

segmentRouter.get('/:segmentId/efforts', async (req: Request, res: Response) => {
  const segmentId = Number(req.params['segmentId']);
  if (isNaN(segmentId)) { res.status(400).json({ error: 'Invalid segment id' }); return; }

  let segment = await getSegment(segmentId);

  if (!segment?.allEffortsFetched) {
    const athlete = await getAthlete();
    if (!athlete) { res.status(503).json({ error: 'Athlete not synced yet' }); return; }

    const raw = await fetchAllSegmentEfforts(segmentId, athlete.stravaId);
    if (raw.length > 0) {
      const first = raw[0]!;
      await upsertSegment({
        stravaId: first.segment.id,
        name: first.segment.name,
        distance: first.segment.distance,
        averageGrade: first.segment.average_grade,
        allEffortsFetched: true
      });
      await upsertLeaderboardEfforts(raw.map(mapEffort));
    }
    await markAllEffortsFetched(segmentId);
    segment = await getSegment(segmentId);
  }

  const efforts = await getLeaderboardEfforts(segmentId);

  const times = efforts.map((e) => e.elapsedTime ?? 0).filter((t) => t > 0);
  const summary = {
    totalEfforts: efforts.length,
    prTime: times.length > 0 ? Math.min(...times) : null,
    avgTime: times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null
  };

  res.json({
    segment: segment
      ? { stravaId: segment.stravaId, name: segment.name, distance: segment.distance, averageGrade: segment.averageGrade }
      : { stravaId: segmentId, name: 'Segment', distance: null, averageGrade: null },
    summary,
    efforts
  });
});
