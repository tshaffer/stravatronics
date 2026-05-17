import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/authRoutes.js';
import { athleteRouter } from './routes/athleteRoutes.js';
import { activityRouter } from './routes/activityRoutes.js';
import { segmentRouter } from './routes/segmentRoutes.js';

export function createServer(): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/athlete', athleteRouter);
  app.use('/api/activities', activityRouter);
  app.use('/api/segments', segmentRouter);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
