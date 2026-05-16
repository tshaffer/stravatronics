import { useEffect, useState, type ReactElement } from 'react';
import { Routes, Route, useSearchParams } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface AuthStatus {
  authenticated: boolean;
  athleteId?: number;
  tokenValid?: boolean;
}

function HomePage(): ReactElement {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [searchParams] = useSearchParams();
  const authResult = searchParams.get('auth');

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json() as Promise<AuthStatus>)
      .then(setAuthStatus)
      .catch(() => setAuthStatus({ authenticated: false }));
  }, []);

  return (
    <Box sx={{ p: 4, maxWidth: 600 }}>
      <Typography variant="h4" gutterBottom>Stravatronics</Typography>

      {authResult === 'success' && (
        <Typography color="success.main" sx={{ mb: 2 }}>
          Successfully connected to Strava!
        </Typography>
      )}
      {authResult === 'denied' && (
        <Typography color="error" sx={{ mb: 2 }}>
          Strava authorization was denied.
        </Typography>
      )}
      {authResult === 'error' && (
        <Typography color="error" sx={{ mb: 2 }}>
          An error occurred during authorization.
        </Typography>
      )}

      {authStatus === null ? (
        <Typography color="text.secondary">Checking connection status…</Typography>
      ) : authStatus.authenticated ? (
        <Typography>
          Connected to Strava (Athlete ID: {authStatus.athleteId}).
          {!authStatus.tokenValid ? ' Token needs refresh.' : ''}
        </Typography>
      ) : (
        <Box>
          <Typography sx={{ mb: 2 }}>Not connected to Strava.</Typography>
          <Button
            variant="contained"
            href="/api/auth/authorize"
            sx={{ backgroundColor: '#fc4c02', '&:hover': { backgroundColor: '#e04400' } }}
          >
            Connect with Strava
          </Button>
        </Box>
      )}
    </Box>
  );
}

export function App(): ReactElement {
  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
    </>
  );
}
