import mongoose, { type InferSchemaType } from 'mongoose';

const segmentSchema = new mongoose.Schema({
  stravaId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  distance: { type: Number },
  averageGrade: { type: Number },
  allEffortsFetched: { type: Boolean }
});

const leaderboardEffortSchema = new mongoose.Schema({
  stravaId: { type: Number, required: true, unique: true },
  segmentStravaId: { type: Number, required: true, index: true },
  activityStravaId: { type: Number },
  elapsedTime: { type: Number },
  movingTime: { type: Number },
  startDate: { type: String },
  startDateLocal: { type: String },
  distance: { type: Number },
  averageWatts: { type: Number },
  averageHeartrate: { type: Number },
  maxHeartrate: { type: Number },
  averageCadence: { type: Number },
  prRank: { type: Number },
  komRank: { type: Number }
});

export type SegmentDoc = InferSchemaType<typeof segmentSchema>;
export type LeaderboardEffortDoc = InferSchemaType<typeof leaderboardEffortSchema>;

const SegmentModel = mongoose.model('Segment', segmentSchema);
const LeaderboardEffortModel = mongoose.model('LeaderboardEffort', leaderboardEffortSchema);

export async function upsertSegment(data: SegmentDoc): Promise<void> {
  await SegmentModel.updateOne(
    { stravaId: data.stravaId },
    { $set: data },
    { upsert: true }
  );
}

export async function getSegment(stravaId: number): Promise<SegmentDoc | null> {
  return SegmentModel.findOne({ stravaId }).lean();
}

export async function markAllEffortsFetched(segmentStravaId: number): Promise<void> {
  await SegmentModel.updateOne({ stravaId: segmentStravaId }, { $set: { allEffortsFetched: true } });
}

export async function upsertLeaderboardEfforts(efforts: LeaderboardEffortDoc[]): Promise<void> {
  if (efforts.length === 0) return;
  const ops = efforts.map((e) => ({
    updateOne: {
      filter: { stravaId: e.stravaId },
      update: { $set: e },
      upsert: true
    }
  }));
  await LeaderboardEffortModel.bulkWrite(ops);
}

export async function getLeaderboardEfforts(segmentStravaId: number): Promise<LeaderboardEffortDoc[]> {
  return LeaderboardEffortModel.find({ segmentStravaId }).sort({ elapsedTime: 1 }).lean();
}
