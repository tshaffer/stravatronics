import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import polylineDecode from '@mapbox/polyline';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import type { Activity } from '../api/stravatronicsApi';
import { fetchActivity } from '../api/stravatronicsApi';

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

interface ActivityDetailPageProps {
  imperial: boolean;
}

export function ActivityDetailPage({ imperial }: ActivityDetailPageProps): ReactElement {
  const { stravaId } = useParams<{ stravaId: string }>();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stravaId) return;
    fetchActivity(Number(stravaId))
      .then(setActivity)
      .catch(() => setError('Failed to load activity.'))
      .finally(() => setLoading(false));
  }, [stravaId]);

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
    <Box sx={{ p: 3, maxWidth: 960, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <IconButton onClick={() => navigate(-1)} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight={700}>{activity.name}</Typography>
          <Typography variant="body2" color="text.secondary">{date}</Typography>
        </Box>
        <Box sx={{ ml: 1 }}>
          <Chip label={activity.sportType ?? activity.type} size="small" />
        </Box>
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
          </StatRow>
        </>
      )}

      {(activity.averageWatts != null || activity.weightedAverageWatts != null) && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>POWER</Typography>
          <StatRow>
            {activity.averageWatts != null && <Stat label="Avg Watts" value={`${Math.round(activity.averageWatts)} W`} />}
            {activity.weightedAverageWatts != null && <Stat label="Normalized Power" value={`${Math.round(activity.weightedAverageWatts)} W`} />}
            {activity.maxWatts != null && <Stat label="Max Watts" value={`${Math.round(activity.maxWatts)} W`} />}
            {activity.kilojoules != null && <Stat label="Energy" value={`${Math.round(activity.kilojoules)} kJ`} />}
          </StatRow>
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
    </Box>
  );
}
