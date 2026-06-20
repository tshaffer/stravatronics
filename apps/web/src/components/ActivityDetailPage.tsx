import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import polylineDecode from '@mapbox/polyline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import type { Activity, SegmentEffort, ActivityStreams, MmpCurvePoint } from '../api/stravatronicsApi';
import { fetchActivity, fetchSegmentEfforts, fetchActivityStreams, fetchMmpCurve, refreshActivity } from '../api/stravatronicsApi';

// Fix Leaflet default marker icon paths when bundled with webpack
L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

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

function formatSpeed(mps: number, imperial: boolean): string {
  if (imperial) return `${(mps * 2.23694).toFixed(1)} mph`;
  return `${(mps * 3.6).toFixed(1)} km/h`;
}

function formatElevation(meters: number, imperial: boolean): string {
  if (imperial) return `${Math.round(meters * 3.28084)} ft`;
  return `${Math.round(meters)} m`;
}

interface StatProps {
  label: string;
  value: string | number;
}

function Stat({ label, value }: StatProps): ReactElement {
  return (
    <Box sx={{ minWidth: 120 }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography variant="body1" fontWeight={600}>{value}</Typography>
    </Box>
  );
}

function StatRow({ children }: { children: ReactNode }): ReactElement {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 2 }}>
      {children}
    </Box>
  );
}

function FitBounds({ positions }: { positions: [number, number][] }): null {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [20, 20] });
    }
  }, [map, positions]);
  return null;
}

interface ActivityChartProps {
  streams: ActivityStreams;
  imperial: boolean;
}

function ActivityChart({ streams, imperial }: ActivityChartProps): ReactElement | null {
  const { chart, hasAltitude, hasWatts, hasHeartrate } = streams;
  if (!hasAltitude && !hasWatts && !hasHeartrate) return null;

  const [showElevation, setShowElevation] = useState(() => localStorage.getItem('chart.showElevation') !== 'false');
  const [showHeartrate, setShowHeartrate] = useState(() => localStorage.getItem('chart.showHeartrate') !== 'false');
  const [showWatts, setShowWatts] = useState(() => localStorage.getItem('chart.showWatts') !== 'false');

  const distUnit = imperial ? 'mi' : 'km';
  const distFactor = imperial ? 1 / 1609.344 : 1 / 1000;
  const altFactor = imperial ? 3.28084 : 1;
  const altUnit = imperial ? 'ft' : 'm';

  let accumElev = 0;
  let prevAlt: number | null = null;
  const data = chart.map((p) => {
    if (hasAltitude && p.altitude != null) {
      if (prevAlt != null && p.altitude > prevAlt) accumElev += p.altitude - prevAlt;
      prevAlt = p.altitude;
    }
    return {
      dist: +(p.distance * distFactor).toFixed(2),
      ...(p.time != null ? { time: p.time, movingTime: p.movingTime } : {}),
      ...(hasAltitude && p.altitude != null ? { altitude: +(p.altitude * altFactor).toFixed(1) } : {}),
      ...(hasAltitude ? { elevGain: Math.round(accumElev * altFactor) } : {}),
      ...(hasWatts && p.watts != null ? { watts: p.watts } : {}),
      ...(hasHeartrate && p.heartrate != null ? { heartrate: p.heartrate } : {}),
      ...(p.grade != null ? { grade: +p.grade.toFixed(1) } : {})
    };
  });

  function fmtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }): ReactElement | null {
    if (!active || !payload?.length) return null;
    const point = Object.fromEntries(payload.map((p) => [p.name, p.value]));
    return (
      <Box sx={{ bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', p: 1.5, borderRadius: 1, fontSize: 13 }}>
        {point['movingTime'] != null && <Box><b>Moving Time:</b> {fmtTime(point['movingTime'] as number)}</Box>}
        {point['time'] != null && <Box><b>Elapsed Time:</b> {fmtTime(point['time'] as number)}</Box>}
        {point['dist'] != null && <Box><b>Dist:</b> {(point['dist'] as number).toFixed(2)} {distUnit}</Box>}
        {point['altitude'] != null && <Box><b>Elevation:</b> {point['altitude']} {altUnit}</Box>}
        {point['elevGain'] != null && <Box><b>Elev Gain:</b> {point['elevGain']} {altUnit}</Box>}
        {point['heartrate'] != null && <Box sx={{ color: '#e53935' }}><b>Heart Rate:</b> {point['heartrate']} bpm</Box>}
        {point['grade'] != null && <Box><b>Grade:</b> {point['grade']}%</Box>}
        {point['watts'] != null && <Box sx={{ color: '#fc4c02' }}><b>Power:</b> {point['watts']} W</Box>}
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 3, mb: 1 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>ACTIVITY CHART</Typography>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="dist"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => `${v.toFixed(1)} ${distUnit}`}
            tick={{ fontSize: 11 }}
          />
          {hasAltitude && showElevation && (
            <YAxis
              yAxisId="alt"
              orientation="left"
              tickFormatter={(v: number) => `${v} ${altUnit}`}
              tick={{ fontSize: 11 }}
              width={56}
            />
          )}
          {((hasWatts && showWatts) || (hasHeartrate && showHeartrate)) && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11 }}
              width={40}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          <Legend formatter={(value: string) => {
            if (value === 'altitude') return `Elevation (${altUnit})`;
            if (value === 'watts') return 'Power (W)';
            if (value === 'heartrate') return 'Heart Rate (bpm)';
            return value;
          }} />
          <YAxis yAxisId="hidden" hide={true} />
          <Line yAxisId="hidden" dataKey="dist" stroke="none" dot={false} isAnimationActive={false} legendType="none" />
          <Line yAxisId="hidden" dataKey="time" stroke="none" dot={false} isAnimationActive={false} legendType="none" />
          <Line yAxisId="hidden" dataKey="movingTime" stroke="none" dot={false} isAnimationActive={false} legendType="none" />
          <Line yAxisId="hidden" dataKey="grade" stroke="none" dot={false} isAnimationActive={false} legendType="none" />
          {hasAltitude && showElevation && (
            <Area
              yAxisId="alt"
              type="monotone"
              dataKey="altitude"
              fill="#e0e0e0"
              stroke="#9e9e9e"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          )}
          {hasAltitude && showElevation && (
            <Line
              yAxisId="alt"
              dataKey="elevGain"
              stroke="none"
              dot={false}
              isAnimationActive={false}
              legendType="none"
            />
          )}
          {hasWatts && showWatts && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="watts"
              stroke="#fc4c02"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
          {hasHeartrate && showHeartrate && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="heartrate"
              stroke="#e53935"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        {hasAltitude && (
          <FormControlLabel
            control={<Checkbox size="small" checked={showElevation} onChange={(e) => { setShowElevation(e.target.checked); localStorage.setItem('chart.showElevation', String(e.target.checked)); }} sx={{ color: '#9e9e9e', '&.Mui-checked': { color: '#9e9e9e' } }} />}
            label={<Typography variant="body2">Elevation</Typography>}
          />
        )}
        {hasWatts && (
          <FormControlLabel
            control={<Checkbox size="small" checked={showWatts} onChange={(e) => { setShowWatts(e.target.checked); localStorage.setItem('chart.showWatts', String(e.target.checked)); }} sx={{ color: '#fc4c02', '&.Mui-checked': { color: '#fc4c02' } }} />}
            label={<Typography variant="body2">Power</Typography>}
          />
        )}
        {hasHeartrate && (
          <FormControlLabel
            control={<Checkbox size="small" checked={showHeartrate} onChange={(e) => { setShowHeartrate(e.target.checked); localStorage.setItem('chart.showHeartrate', String(e.target.checked)); }} sx={{ color: '#e53935', '&.Mui-checked': { color: '#e53935' } }} />}
            label={<Typography variant="body2">Heart Rate</Typography>}
          />
        )}
      </Box>
    </Box>
  );
}

function MmpChart({ curve }: { curve: MmpCurvePoint[] }): ReactElement | null {
  if (curve.length === 0) return null;

  // Downsample to ~200 points for chart performance
  const step = Math.max(1, Math.floor(curve.length / 200));
  const data = curve.filter((_, i) => i % step === 0).map((p) => ({
    dur: p.duration,
    power: p.power
  }));

  function fmtDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
  }

  return (
    <Box sx={{ mt: 3, mb: 1 }}>
      <Divider sx={{ mb: 2 }} />
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>MEAN MAXIMAL POWER</Typography>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="dur"
            type="number"
            scale="log"
            domain={['dataMin', 'dataMax']}
            tickFormatter={fmtDuration}
            tick={{ fontSize: 11 }}
          />
          <YAxis
            yAxisId="power"
            orientation="left"
            tickFormatter={(v: number) => `${v}W`}
            tick={{ fontSize: 11 }}
            width={50}
          />
          <Tooltip
            formatter={(v) => [`${String(v)} W`, 'Power']}
            labelFormatter={(v) => fmtDuration(Number(v))}
          />
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="power"
            stroke="#fc4c02"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </Box>
  );
}

const CLIMB_CATEGORIES: Record<number, string> = {
  1: 'Cat 4', 2: 'Cat 3', 3: 'Cat 2', 4: 'Cat 1', 5: 'HC'
};

function AchievementBadge({ effort }: { effort: SegmentEffort }): ReactElement | null {
  if (effort.komRank === 1) {
    return <EmojiEventsIcon fontSize="small" sx={{ color: '#6a0dad' }} titleAccess="KOM" />;
  }
  if (effort.prRank === 1) {
    return <EmojiEventsIcon fontSize="small" sx={{ color: '#d4af37' }} titleAccess="PR" />;
  }
  if (effort.prRank != null && effort.prRank <= 3) {
    return <EmojiEventsIcon fontSize="small" sx={{ color: '#cd7f32' }} titleAccess={`Top ${effort.prRank}`} />;
  }
  return null;
}

interface SegmentEffortsTableProps {
  efforts: SegmentEffort[];
  imperial: boolean;
  loading: boolean;
}

function SegmentEffortsTable({ efforts, imperial, loading }: SegmentEffortsTableProps): ReactElement {
  const navigate = useNavigate();
  const hasWatts = efforts.some((e) => e.averageWatts != null);
  const hasHR = efforts.some((e) => e.averageHeartrate != null);
  const hasMaxHR = efforts.some((e) => e.maxHeartrate != null);
  const hasNP = efforts.some((e) => e.normalizedPower != null);

  return (
    <>
      <Divider sx={{ my: 2 }} />
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        SEGMENT EFFORTS {!loading && `(${efforts.length})`}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">Loading from Strava…</Typography>
        </Box>
      ) : efforts.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No segment efforts recorded.</Typography>
      ) : (
        <Paper variant="outlined" sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 28, px: 1 }} />
                <TableCell>Segment</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell align="right">Distance</TableCell>
                <TableCell align="right">Avg Speed</TableCell>
                <TableCell align="right">Grade</TableCell>
                <TableCell align="right">Elev Δ</TableCell>
                {hasWatts && <TableCell align="right">Avg W</TableCell>}
                {hasNP && <TableCell align="right">NP</TableCell>}
                {hasNP && <TableCell align="right">IF</TableCell>}
                {hasNP && <TableCell align="right">TSS</TableCell>}
                {hasHR && <TableCell align="right">Avg HR</TableCell>}
                {hasMaxHR && <TableCell align="right">Max HR</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {efforts.map((e) => {
                const speedMps = e.elapsedTime > 0 ? e.distance / e.elapsedTime : 0;
                const elevDelta = e.segment.elevationHigh - e.segment.elevationLow;
                const cat = CLIMB_CATEGORIES[e.segment.climbCategory];
                return (
                  <TableRow key={e.stravaId} hover>
                    <TableCell sx={{ px: 1, py: 0.5 }}>
                      <AchievementBadge effort={e} />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography
                          variant="body2"
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline', color: 'primary.main' } }}
                          onClick={(ev) => { ev.stopPropagation(); navigate(`/segments/${e.segment.stravaId}`); }}
                        >
                          {e.segment.name}
                        </Typography>
                        {cat && (
                          <Chip label={cat} size="small" sx={{ height: 16, fontSize: 10 }} />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {formatDuration(e.elapsedTime)}
                    </TableCell>
                    <TableCell align="right">
                      {formatDistance(e.distance, imperial)}
                    </TableCell>
                    <TableCell align="right">
                      {formatSpeed(speedMps, imperial)}
                    </TableCell>
                    <TableCell align="right">
                      {e.segment.averageGrade.toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {formatElevation(elevDelta, imperial)}
                    </TableCell>
                    {hasWatts && (
                      <TableCell align="right">
                        {e.averageWatts != null ? `${Math.round(e.averageWatts)} W` : '—'}
                      </TableCell>
                    )}
                    {hasNP && (
                      <TableCell align="right">
                        {e.normalizedPower != null ? `${e.normalizedPower} W` : '—'}
                      </TableCell>
                    )}
                    {hasNP && (
                      <TableCell align="right">
                        {e.intensityFactor != null ? e.intensityFactor.toFixed(3) : '—'}
                      </TableCell>
                    )}
                    {hasNP && (
                      <TableCell align="right">
                        {e.trainingStressScore != null ? e.trainingStressScore.toFixed(1) : '—'}
                      </TableCell>
                    )}
                    {hasHR && (
                      <TableCell align="right">
                        {e.averageHeartrate != null ? `${Math.round(e.averageHeartrate)}` : '—'}
                      </TableCell>
                    )}
                    {hasMaxHR && (
                      <TableCell align="right">
                        {e.maxHeartrate != null ? `${Math.round(e.maxHeartrate)}` : '—'}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Paper>
      )}
    </>
  );
}

interface ActivityDetailPageProps {
  imperial: boolean;
}

export function ActivityDetailPage({ imperial }: ActivityDetailPageProps): ReactElement {
  const { stravaId } = useParams<{ stravaId: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [efforts, setEfforts] = useState<SegmentEffort[]>([]);
  const [effortsLoading, setEffortsLoading] = useState(true);
  const [streams, setStreams] = useState<ActivityStreams | null>(null);
  const [streamsLoading, setStreamsLoading] = useState(true);
  const [mmpCurve, setMmpCurve] = useState<MmpCurvePoint[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  function loadAll(id: number): void {
    setLoading(true);
    setEffortsLoading(true);
    setStreamsLoading(true);
    fetchActivity(id)
      .then(setActivity)
      .catch(() => setError('Failed to load activity.'))
      .finally(() => setLoading(false));
    fetchSegmentEfforts(id)
      .then((efforts) => {
        setEfforts(efforts);
        // Re-fetch activity to pick up sufferScore written during effort fetch
        return fetchActivity(id).then(setActivity).catch(() => undefined);
      })
      .catch(() => setEfforts([]))
      .finally(() => setEffortsLoading(false));
    fetchActivityStreams(id)
      .then((s) => {
        setStreams(s);
        return fetchMmpCurve(id);
      })
      .then(setMmpCurve)
      .catch(() => setStreams(null))
      .finally(() => setStreamsLoading(false));
  }

  useEffect(() => {
    if (!stravaId) return;
    loadAll(Number(stravaId));
  }, [stravaId]);

  async function handleRefresh(): Promise<void> {
    if (!stravaId) return;
    const id = Number(stravaId);
    setRefreshing(true);
    try {
      await refreshActivity(id);
      loadAll(id);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return <Box sx={{ p: 4 }}><CircularProgress /></Box>;
  }

  if (error || !activity) {
    return <Box sx={{ p: 4 }}><Typography color="error">{error ?? 'Activity not found.'}</Typography></Box>;
  }

  const decodedPositions: [number, number][] = activity.summaryPolyline
    ? polylineDecode.decode(activity.summaryPolyline)
    : [];

  const mapCenter: [number, number] =
    decodedPositions.length > 0
      ? decodedPositions[Math.floor(decodedPositions.length / 2)]!
      : [activity.startLatitude ?? 0, activity.startLongitude ?? 0];

  const date = new Date(activity.startDateLocal).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>{activity.name}</Typography>
          <Typography variant="body2" color="text.secondary">{date}</Typography>
        </Box>
        <Chip label={activity.sportType ?? activity.type} size="small" />
        <Button
          size="small"
          variant="outlined"
          startIcon={<DownloadIcon />}
          href={`/api/activities/${activity.stravaId}/gpx`}
          disabled={!streams}
          title={streams ? 'Download GPX' : 'Load activity streams first'}
        >
          GPX
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={14} /> : <RefreshIcon />}
          onClick={() => void handleRefresh()}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </Box>

      {decodedPositions.length > 0 && (
        <Box sx={{ height: 360, borderRadius: 2, overflow: 'hidden', mb: 3 }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <Polyline positions={decodedPositions} color="#fc4c02" weight={3} />
            <FitBounds positions={decodedPositions} />
          </MapContainer>
        </Box>
      )}

      {streamsLoading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={14} />
          <Typography variant="body2" color="text.secondary">Loading streams…</Typography>
        </Box>
      ) : streams && (
        <ActivityChart streams={streams} imperial={imperial} />
      )}

      <Typography variant="subtitle2" color="text.secondary" gutterBottom>PERFORMANCE</Typography>
      <StatRow>
        <Stat label="Distance" value={formatDistance(activity.distance, imperial)} />
        <Stat label="Moving Time" value={formatDuration(activity.movingTime)} />
        <Stat label="Elapsed Time" value={formatDuration(activity.elapsedTime)} />
        <Stat label="Elevation Gain" value={formatElevation(activity.totalElevationGain, imperial)} />
        <Stat label="Avg Speed" value={formatSpeed(activity.averageSpeed, imperial)} />
        {activity.maxSpeed != null && (
          <Stat label="Max Speed" value={formatSpeed(activity.maxSpeed, imperial)} />
        )}
      </StatRow>

      {(activity.elevHigh != null || activity.elevLow != null) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>ELEVATION</Typography>
          <StatRow>
            {activity.elevHigh != null && <Stat label="High" value={formatElevation(activity.elevHigh, imperial)} />}
            {activity.elevLow != null && <Stat label="Low" value={formatElevation(activity.elevLow, imperial)} />}
          </StatRow>
        </>
      )}

      {activity.hasHeartrate && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>HEART RATE</Typography>
          <StatRow>
            {activity.averageHeartrate != null && <Stat label="Avg HR" value={`${Math.round(activity.averageHeartrate)} bpm`} />}
            {activity.maxHeartrate != null && <Stat label="Max HR" value={`${Math.round(activity.maxHeartrate)} bpm`} />}
            {activity.sufferScore != null && <Stat label="Relative Effort" value={activity.sufferScore} />}
          </StatRow>
        </>
      )}

      {(activity.averageWatts != null || activity.weightedAverageWatts != null || streams?.normalizedPower != null) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>POWER</Typography>
          <StatRow>
            {activity.averageWatts != null && <Stat label="Avg Watts" value={`${Math.round(activity.averageWatts)} W`} />}
            {streams?.normalizedPower != null
              ? <Stat label="Normalized Power" value={`${streams.normalizedPower} W`} />
              : activity.weightedAverageWatts != null && <Stat label="Normalized Power" value={`${Math.round(activity.weightedAverageWatts)} W`} />
            }
            {activity.maxWatts != null && <Stat label="Max Watts" value={`${Math.round(activity.maxWatts)} W`} />}
            {activity.kilojoules != null && <Stat label="Energy" value={`${Math.round(activity.kilojoules)} kJ`} />}
            {activity.calories != null && <Stat label="Calories" value={`${Math.round(activity.calories)} kcal`} />}
            {streams?.intensityFactor != null && <Stat label="Intensity Factor" value={streams.intensityFactor.toFixed(3)} />}
            {streams?.trainingStressScore != null && <Stat label="TSS" value={streams.trainingStressScore.toFixed(1)} />}
          </StatRow>
          {mmpCurve.length > 0 && <MmpChart curve={mmpCurve} />}
        </>
      )}

      {(activity.averageCadence != null || activity.averageTemp != null) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>OTHER</Typography>
          <StatRow>
            {activity.averageCadence != null && <Stat label="Avg Cadence" value={`${Math.round(activity.averageCadence)} rpm`} />}
            {activity.averageTemp != null && <Stat label="Avg Temp" value={`${activity.averageTemp}°C`} />}
          </StatRow>
        </>
      )}

      <Divider sx={{ my: 2 }} />
      <StatRow>
        {activity.achievementCount != null && <Stat label="Achievements" value={activity.achievementCount} />}
        <Stat label="PRs" value={activity.prCount} />
      </StatRow>

      <SegmentEffortsTable efforts={efforts} imperial={imperial} loading={effortsLoading} />
    </Box>
  );
}
