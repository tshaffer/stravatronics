import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { buildAuthorizationUrl, exchangeCodeForTokens } from '../strava/auth.js';
import { getAppVariables } from '../repositories/appVariablesRepository.js';
import { config } from '../config.js';

export const authRouter: RouterType = Router();

// Redirect user to Strava authorization page
authRouter.get('/authorize', (_req: Request, res: Response) => {
  res.redirect(buildAuthorizationUrl());
});

// Strava redirects here after user approves
authRouter.get('/callback', async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error || typeof code !== 'string') {
    res.redirect(`${config.webAppUrl}/?auth=denied`);
    return;
  }

  try {
    await exchangeCodeForTokens(code);
    res.redirect(`${config.webAppUrl}/?auth=success`);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.redirect(`${config.webAppUrl}/?auth=error`);
  }
});

// Returns current auth status for the frontend
authRouter.get('/status', async (_req: Request, res: Response) => {
  const vars = await getAppVariables();
  if (!vars) {
    res.json({ authenticated: false });
    return;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  res.json({
    authenticated: true,
    athleteId: vars.athleteId,
    tokenExpiresAt: vars.tokenExpiresAt,
    tokenValid: vars.tokenExpiresAt > nowSeconds,
  });
});
