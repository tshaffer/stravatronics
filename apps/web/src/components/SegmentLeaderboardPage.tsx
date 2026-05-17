import { useEffect, useState, type ReactElement } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, CartesianGrid
} from 'recharts';
import type { SegmentLeaderboard, LeaderboardEffort } from '../api/stravatronicsApi';
import { fetchSegmentLeaderboard } from '../api/stravatronicsApi';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatDistance(meters: number | null, imperial: boolean): string {
  if (meters == null) return '—';
  if (imperial) return `${(meters / 1609.344).toFixed(2)} mi`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatSpeed(meters: number, seconds: number, imperial: boolean): string {
  if (seconds === 0) return '—';
  const mps = meters / seconds;
  if (imperial) return `${(mps * 2.23694).toFixed(1)} mph`;
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

interface StatBoxProps { label: string; value: string }
function StatBox({ label, value }: StatBoxProps): ReactElement {
  return (
    <Box sx={{ textAlign: 'center', px: 3 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="h6" fontWeight={700}>{value}</Typography>
    </Box>
  );
}

interface TrendChartProps {
  efforts: LeaderboardEffort[];
  prTime: number | null;
}

function TrendChart({ efforts, prTime }: TrendChartProps): ReactElement {
  const byDate = [...efforts]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((e) => ({
      date: new Date(e.startDateLocal).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' }),
      time: e.elapsedTime,
      isPR: e.elapsedTime === prTime
    }));

  interface DotProps {
    cx?: number;
    cy?: number;
    payload?: { isPR: boolean };
  }

  function CustomDot({ cx, cy, payload }: DotProps): ReactElement {
    if (cx == null || cy == null) return <g />;
    const isPR = payload?.isPR ?? false;
    return (
      <circle
        cx={cx} cy={cy} r={isPR ? 6 : 4}
        fill={isPR ? '#d4af37' : '#fc4c02'}
        stroke={isPR ? '#b8860b' : '#c73d00'}
        strokeWidth={1.5}
      />
    );
  }

  const times = byDate.map((d) => d.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const pad = Math.max(10, Math.round((maxTime - minTime) * 0.1));

  return (
    <Box sx={{ mt: 3, mb: 1 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        ELAPSED TIME TREND
      </Typography>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={byDate} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            domain={[minTime - pad, maxTime + pad]}
            tickFormatter={(v: number) => formatDuration(v)}
            tick={{ fontSize: 11 }}
            width={56}
            reversed
          />
          <Tooltip
            formatter={(v) => [formatDuration(typeof v === 'number' ? v : Number(v)), 'Time']}
            labelFormatter={(l) => String(l)}
          />
          {prTime != null && (
            <ReferenceLine
              y={prTime}
              stroke="#d4af37"
              strokeDasharray="4 4"
              label={{ value: 'PR', position: 'right', fontSize: 11, fill: '#b8860b' }}
            />
          )}
          <Line
            type="monotone"
            dataKey="time"
            stroke="#fc4c02"
            strokeWidth={2}
            dot={<CustomDot />}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
        Y-axis inverted — lower on chart = faster time
      </Typography>
    </Box>
  );
}

interface SegmentLeaderboardPageProps {
  imperial: boolean;
}

export function SegmentLeaderboardPage({ imperial }: SegmentLeaderboardPageProps): ReactElement {
  const { segmentId } = useParams<{ segmentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SegmentLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!segmentId) return;
    fetchSegmentLeaderboard(Number(segmentId))
      .then(setData)
      .catch(() => setError('Failed to load segment efforts.'))
      .finally(() => setLoading(false));
  }, [segmentId]);

  if (loading) return <Box sx={{ p: 4 }}><CircularProgress /></Box>;
  if (error || !data) return <Box sx={{ p: 4 }}><Typography color="error">{error ?? 'Not found.'}</Typography></Box>;

  const { segment, summary, efforts } = data;
  const hasWatts = efforts.some((e) => e.averageWatts != null);
  const hasHR = efforts.some((e) => e.averageHeartrate != null);
  const prTime = summary.prTime;

  return (
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>{segment.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {formatDistance(segment.distance, imperial)}
            {segment.averageGrade != null && ` · ${segment.averageGrade.toFixed(1)}% avg grade`}
          </Typography>
        </Box>
      </Box>

      {/* Summary bar */}
      <Paper variant="outlined" sx={{ display: 'flex', justifyContent: 'center', py: 2, mb: 3 }}>
        <StatBox label="Total Efforts" value={String(summary.totalEfforts)} />
        <Divider orientation="vertical" flexItem />
        <StatBox label="PR" value={prTime != null ? formatDuration(prTime) : '—'} />
        <Divider orientation="vertical" flexItem />
        <StatBox label="Average" value={summary.avgTime != null ? formatDuration(summary.avgTime) : '—'} />
      </Paper>

      {/* Trend chart */}
      {efforts.length > 1 && <TrendChart efforts={efforts} prTime={prTime} />}

      {/* Leaderboard table */}
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        ALL EFFORTS — BEST TO WORST
      </Typography>
      <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center" sx={{ width: 48 }}>#</TableCell>
              <TableCell>Date</TableCell>
              <TableCell align="right">Time</TableCell>
              <TableCell align="right">Speed</TableCell>
              {hasWatts && <TableCell align="right">Avg W</TableCell>}
              {hasHR && <TableCell align="right">Avg HR</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {efforts.map((e, i) => {
              const isPR = e.elapsedTime === prTime && i === 0;
              return (
                <TableRow
                  key={e.stravaId}
                  hover
                  onClick={() => navigate(`/activities/${e.activityStravaId}`)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: isPR ? 'rgba(212,175,55,0.08)' : undefined
                  }}
                >
                  <TableCell align="center" sx={{ px: 1 }}>
                    {isPR
                      ? <EmojiEventsIcon fontSize="small" sx={{ color: '#d4af37', verticalAlign: 'middle' }} />
                      : <Typography variant="body2" color="text.secondary">{i + 1}</Typography>
                    }
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {new Date(e.startDateLocal).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: isPR ? 700 : undefined }}>
                    {formatDuration(e.elapsedTime)}
                  </TableCell>
                  <TableCell align="right">
                    {formatSpeed(e.distance, e.elapsedTime, imperial)}
                  </TableCell>
                  {hasWatts && (
                    <TableCell align="right">
                      {e.averageWatts != null ? `${Math.round(e.averageWatts)} W` : '—'}
                    </TableCell>
                  )}
                  {hasHR && (
                    <TableCell align="right">
                      {e.averageHeartrate != null ? `${Math.round(e.averageHeartrate)}` : '—'}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
