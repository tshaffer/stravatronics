import mongoose, { type InferSchemaType } from 'mongoose';

const activitySchema = new mongoose.Schema({
  stravaId: { type: Number, required: true, unique: true },
  athleteId: { type: Number, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  sportType: { type: String },
  startDate: { type: String, required: true },
  startDateLocal: { type: String, required: true },
  timezone: { type: String },
  utcOffset: { type: Number },
  distance: { type: Number },
  movingTime: { type: Number },
  elapsedTime: { type: Number },
  totalElevationGain: { type: Number },
  averageSpeed: { type: Number },
  maxSpeed: { type: Number },
  startLatitude: { type: Number },
  startLongitude: { type: Number },
  summaryPolyline: { type: String },
  achievementCount: { type: Number },
  prCount: { type: Number },
  hasHeartrate: { type: Boolean },
  averageHeartrate: { type: Number },
  maxHeartrate: { type: Number },
  averageCadence: { type: Number },
  averageWatts: { type: Number },
  maxWatts: { type: Number },
  weightedAverageWatts: { type: Number },
  kilojoules: { type: Number },
  deviceWatts: { type: Boolean },
  averageTemp: { type: Number },
  elevHigh: { type: Number },
  elevLow: { type: Number },
  effortsFetched: { type: Boolean },
  streamsFetched: { type: Boolean },
  sufferScore: { type: Number }
});

export type ActivityDoc = InferSchemaType<typeof activitySchema>;

const ActivityModel = mongoose.model('Activity', activitySchema);

export async function upsertActivities(activities: ActivityDoc[]): Promise<void> {
  const ops = activities.map((a) => ({
    updateOne: {
      filter: { stravaId: a.stravaId },
      update: { $set: a },
      upsert: true
    }
  }));
  await ActivityModel.bulkWrite(ops);
}

export async function getActivities(): Promise<ActivityDoc[]> {
  return ActivityModel.find().sort({ startDateLocal: -1, stravaId: -1 }).lean();
}

export async function getActivity(stravaId: number): Promise<ActivityDoc | null> {
  return ActivityModel.findOne({ stravaId }).lean();
}

export async function markEffortsFetched(stravaId: number): Promise<void> {
  await ActivityModel.updateOne({ stravaId }, { $set: { effortsFetched: true } });
}

export async function markStreamsFetched(stravaId: number): Promise<void> {
  await ActivityModel.updateOne({ stravaId }, { $set: { streamsFetched: true } });
}

export async function updateSufferScore(stravaId: number, sufferScore: number): Promise<void> {
  await ActivityModel.updateOne({ stravaId }, { $set: { sufferScore } });
}

export async function getLatestActivityDate(): Promise<number> {
  const latest = await ActivityModel.findOne().sort({ startDate: -1 }).lean();
  if (!latest?.startDate) return 0;
  return Math.floor(new Date(latest.startDate).getTime() / 1000);
}
