import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { fetchStravaAthlete } from '../strava/athleteApi.js';
import { upsertAthlete, getAthlete } from '../repositories/athleteRepository.js';

export const athleteRouter: RouterType = Router();

athleteRouter.get('/', async (_req: Request, res: Response) => {
  const cached = await getAthlete();
  if (cached) {
    res.json(cached);
    return;
  }

  const stravaAthlete = await fetchStravaAthlete();
  const athlete = await upsertAthlete({
    stravaId: stravaAthlete.id,
    firstName: stravaAthlete.firstname,
    lastName: stravaAthlete.lastname,
    profileImageUrl: stravaAthlete.profile_medium,
    city: stravaAthlete.city ?? null,
    state: stravaAthlete.state ?? null,
    country: stravaAthlete.country ?? null,
    measurementPreference: stravaAthlete.measurement_preference,
    syncedAt: new Date().toISOString()
  });
  res.json(athlete);
});
