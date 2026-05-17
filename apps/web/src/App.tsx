import { useEffect, useState, type ReactElement } from 'react';
import { Routes, Route, useSearchParams, useNavigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import type { Athlete, Activity } from './api/stravatronicsApi';
import { fetchAthlete, fetchActivities, syncActivities } from './api/stravatronicsApi';
import { ActivityDetailPage } from './components/ActivityDetailPage';

interface AuthStatus {
  authenticated: boolean;
  athleteId?: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDistance(meters: number, imperial: boolean): string {
  if (imperial) return `${(meters / 1609.344).toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatElevation(meters: number, imperial: boolean): string {
  if (imperial) return `${Math.round(meters * 3.28084)} ft`;
  return `${Math.round(meters)} m`;
}

function AthleteCard({ athlete }: { athlete: Athlete }): ReactElement {
  const location = [athlete.city, athlete.state, athlete.country].filter(Boolean).join(', ');
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
      {athlete.profileImageUrl && (
        <Avatar src={athlete.profileImageUrl} sx={{ width: 56, height: 56 }} />
      )}
      <Box>
        <Typography variant="h6">{athlete.firstName} {athlete.lastName}</Typography>
        {location && <Typography variant="body2" color="text.secondary">{location}</Typography>}
      </Box>
    </Box>
  );
}

function ActivitiesPage({ athlete }: { athlete: Athlete }): ReactElement {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const imperial = athlete.measurementPreference !== 'meters';
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivities()
      .then(setActivities)
      .finally(() => setLoading(false));
  }, []);

  async function handleSync(): Promise<void> {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const result = await syncActivities();
      setSyncMessage(`Synced ${result.synced} new ${result.synced === 1 ? 'activity' : 'activities'}.`);
      const updated = await fetchActivities();
      setActivities(updated);
    } catch {
      setSyncMessage('Sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <AthleteCard athlete={athlete} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5">Activities ({activities.length})</Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={() => void handleSync()}
          disabled={syncing}
          startIcon={syncing ? <CircularProgress size={14} /> : undefined}
        >
          {syncing ? 'Syncing…' : 'Sync'}
        </Button>
        {syncMessage && (
          <Typography variant="body2" color="text.secondary">{syncMessage}</Typography>
        )}
      </Box>

      {loading ? (
        <CircularProgress />
      ) : activities.length === 0 ? (
        <Typography color="text.secondary">No activities yet. Click Sync to fetch from Strava.</Typography>
      ) : (
        <Paper variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Distance</TableCell>
                <TableCell align="right">Moving Time</TableCell>
                <TableCell align="right">Elevation</TableCell>
                <TableCell align="right">Avg HR</TableCell>
                <TableCell align="right">Watts (NP)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activities.map((a) => (
                <TableRow
                  key={a.stravaId}
                  hover
                  onClick={() => navigate(`/activities/${a.stravaId}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(a.startDateLocal).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{a.name}</TableCell>
                  <TableCell>
                    <Chip label={a.sportType ?? a.type} size="small" />
                  </TableCell>
                  <TableCell align="right">{formatDistance(a.distance, imperial)}</TableCell>
                  <TableCell align="right">{formatDuration(a.movingTime)}</TableCell>
                  <TableCell align="right">{formatElevation(a.totalElevationGain, imperial)}</TableCell>
                  <TableCell align="right">{a.averageHeartrate ? Math.round(a.averageHeartrate) : '—'}</TableCell>
                  <TableCell align="right">{a.weightedAverageWatts ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

function HomePage(): ReactElement {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [searchParams] = useSearchParams();
  const authResult = searchParams.get('auth');

  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json() as Promise<AuthStatus>)
      .then((status) => {
        setAuthStatus(status);
        if (status.authenticated) {
          return fetchAthlete().then(setAthlete);
        }
      })
      .catch(() => setAuthStatus({ authenticated: false }));
  }, []);

  if (authStatus === null) {
    return <Box sx={{ p: 4 }}><CircularProgress /></Box>;
  }

  if (!authStatus.authenticated) {
    return (
      <Box sx={{ p: 4 }}>
        {authResult === 'denied' && <Typography color="error" sx={{ mb: 2 }}>Authorization denied.</Typography>}
        {authResult === 'error' && <Typography color="error" sx={{ mb: 2 }}>Authorization error.</Typography>}
        <Typography sx={{ mb: 2 }}>Not connected to Strava.</Typography>
        <Button
          variant="contained"
          href="/api/auth/authorize"
          sx={{ backgroundColor: '#fc4c02', '&:hover': { backgroundColor: '#e04400' } }}
        >
          Connect with Strava
        </Button>
      </Box>
    );
  }

  if (!athlete) {
    return <Box sx={{ p: 4 }}><CircularProgress /></Box>;
  }

  return (
    <>
      {authResult === 'success' && (
        <Box sx={{ px: 3, pt: 2 }}>
          <Typography color="success.main">Successfully connected to Strava!</Typography>
        </Box>
      )}
      <ActivitiesPage athlete={athlete} />
    </>
  );
}

function ActivityDetailWrapper(): ReactElement {
  const [athlete, setAthlete] = useState<Athlete | null>(null);

  useEffect(() => {
    fetchAthlete().then(setAthlete).catch(() => undefined);
  }, []);

  const imperial = athlete ? athlete.measurementPreference !== 'meters' : true;
  return <ActivityDetailPage imperial={imperial} />;
}

export function App(): ReactElement {
  return (
    <>
      <CssBaseline />
      <AppBar position="static" sx={{ backgroundColor: '#fc4c02' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Stravatronics</Typography>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/activities/:stravaId" element={<ActivityDetailWrapper />} />
      </Routes>
    </>
  );
}
