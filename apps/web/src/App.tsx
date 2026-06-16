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
import TableFooter from '@mui/material/TableFooter';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import type { Athlete, Activity } from './api/stravatronicsApi';
import { fetchAthlete, fetchActivities, syncActivities } from './api/stravatronicsApi';
import { ActivityDetailPage } from './components/ActivityDetailPage';
import { SegmentLeaderboardPage } from './components/SegmentLeaderboardPage';

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

type SortKey = 'startDateLocal' | 'name' | 'sufferScore' | 'distance' | 'movingTime' | 'elapsedTime' | 'totalElevationGain' | 'maxHeartrate' | 'averageHeartrate' | 'weightedAverageWatts';

function sortActivities(activities: Activity[], key: SortKey, dir: 'asc' | 'desc'): Activity[] {
  return [...activities].sort((a, b) => {
    const nullSentinel = dir === 'asc' ? Infinity : -Infinity;
    const aVal = (a[key] ?? nullSentinel) as string | number;
    const bVal = (b[key] ?? nullSentinel) as string | number;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return dir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return dir === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });
}

function ActivitiesPage({ athlete }: { athlete: Athlete }): ReactElement {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('startDateLocal');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [hideVirtual, setHideVirtual] = useState(false);
  const imperial = athlete.measurementPreference !== 'meters';
  const navigate = useNavigate();

  useEffect(() => {
    fetchActivities()
      .then(setActivities)
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key: SortKey): void {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'startDateLocal' ? 'desc' : 'asc');
    }
    setPage(0);
  }

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

  const VIRTUAL_TYPES = new Set(['VirtualRide', 'VirtualRun']);
  const filtered = hideVirtual
    ? activities.filter((a) => !VIRTUAL_TYPES.has(a.sportType ?? a.type))
    : activities;
  const sorted = sortActivities(filtered, sortKey, sortDir);
  const pageRows = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  function SortCell({ label, colKey, align = 'left' }: { label: string; colKey: SortKey; align?: 'left' | 'right' }): ReactElement {
    return (
      <TableCell align={align} sortDirection={sortKey === colKey ? sortDir : false}>
        <TableSortLabel
          active={sortKey === colKey}
          direction={sortKey === colKey ? sortDir : 'asc'}
          onClick={() => handleSort(colKey)}
        >
          {label}
        </TableSortLabel>
      </TableCell>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <AthleteCard athlete={athlete} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h5">Activities ({filtered.length}{filtered.length !== activities.length ? ` / ${activities.length}` : ''})</Typography>
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
        <FormControlLabel
          control={<Switch size="small" checked={hideVirtual} onChange={(e) => { setHideVirtual(e.target.checked); setPage(0); }} />}
          label={<Typography variant="body2">Hide Zwift / Virtual</Typography>}
          sx={{ ml: 'auto' }}
        />
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
                <SortCell label="Date" colKey="startDateLocal" />
                <SortCell label="Name" colKey="name" />
                <SortCell label="Effort" colKey="sufferScore" align="right" />
                <SortCell label="Elevation" colKey="totalElevationGain" align="right" />
                <SortCell label="Moving Time" colKey="movingTime" align="right" />
                <SortCell label="Elapsed Time" colKey="elapsedTime" align="right" />
                <SortCell label="Distance" colKey="distance" align="right" />
                <SortCell label="Max HR" colKey="maxHeartrate" align="right" />
                <SortCell label="Avg HR" colKey="averageHeartrate" align="right" />
                <TableCell sx={{ width: 66, whiteSpace: 'nowrap' }}>Type</TableCell>
                <SortCell label="Watts (NP)" colKey="weightedAverageWatts" align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {pageRows.map((a) => (
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
                  <TableCell align="right">{a.sufferScore ?? '—'}</TableCell>
                  <TableCell align="right">{formatElevation(a.totalElevationGain, imperial)}</TableCell>
                  <TableCell align="right">{formatDuration(a.movingTime)}</TableCell>
                  <TableCell align="right">{formatDuration(a.elapsedTime)}</TableCell>
                  <TableCell align="right">{formatDistance(a.distance, imperial)}</TableCell>
                  <TableCell align="right">{a.maxHeartrate ? Math.round(a.maxHeartrate) : '—'}</TableCell>
                  <TableCell align="right">{a.averageHeartrate ? Math.round(a.averageHeartrate) : '—'}</TableCell>
                  <TableCell sx={{ width: 66, whiteSpace: 'nowrap' }}>
                    <Chip label={a.sportType ?? a.type} size="small" />
                  </TableCell>
                  <TableCell align="right">{a.weightedAverageWatts ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TablePagination
                  rowsPerPageOptions={[10, 25, 50, 100]}
                  count={filtered.length}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={(_e, p) => setPage(p)}
                  onRowsPerPageChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setPage(0);
                  }}
                />
              </TableRow>
            </TableFooter>
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

function ImperialWrapper({ children }: { children: (imperial: boolean) => ReactElement }): ReactElement {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  useEffect(() => { fetchAthlete().then(setAthlete).catch(() => undefined); }, []);
  return children(athlete ? athlete.measurementPreference !== 'meters' : true);
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
        <Route path="/activities/:stravaId" element={
          <ImperialWrapper>{(imperial) => <ActivityDetailPage imperial={imperial} />}</ImperialWrapper>
        } />
        <Route path="/segments/:segmentId" element={
          <ImperialWrapper>{(imperial) => <SegmentLeaderboardPage imperial={imperial} />}</ImperialWrapper>
        } />
      </Routes>
    </>
  );
}
