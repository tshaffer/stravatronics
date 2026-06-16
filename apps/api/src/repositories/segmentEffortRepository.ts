import mongoose, { type InferSchemaType } from 'mongoose';

const embeddedSegmentSchema = new mongoose.Schema({
  stravaId: { type: Number, required: true },
  name: { type: String, required: true },
  distance: { type: Number },
  averageGrade: { type: Number },
  maximumGrade: { type: Number },
  elevationHigh: { type: Number },
  elevationLow: { type: Number },
  climbCategory: { type: Number }
}, { _id: false });

const segmentEffortSchema = new mongoose.Schema({
  stravaId: { type: Number, required: true, unique: true },
  activityStravaId: { type: Number, required: true, index: true },
  name: { type: String, required: true },
  elapsedTime: { type: Number },
  movingTime: { type: Number },
  startDate: { type: String },
  distance: { type: Number },
  averageWatts: { type: Number },
  averageHeartrate: { type: Number },
  maxHeartrate: { type: Number },
  averageCadence: { type: Number },
  prRank: { type: Number },
  komRank: { type: Number },
  startIndex: { type: Number },
  endIndex: { type: Number },
  normalizedPower: { type: Number },
  intensityFactor: { type: Number },
  trainingStressScore: { type: Number },
  segment: { type: embeddedSegmentSchema, required: true }
});

export type SegmentEffortDoc = InferSchemaType<typeof segmentEffortSchema>;

const SegmentEffortModel = mongoose.model('SegmentEffort', segmentEffortSchema);

export async function upsertSegmentEfforts(efforts: SegmentEffortDoc[]): Promise<void> {
  if (efforts.length === 0) return;
  const ops = efforts.map((e) => ({
    updateOne: {
      filter: { stravaId: e.stravaId },
      update: { $set: e },
      upsert: true
    }
  }));
  await SegmentEffortModel.bulkWrite(ops);
}

export async function getSegmentEfforts(activityStravaId: number): Promise<SegmentEffortDoc[]> {
  return SegmentEffortModel.find({ activityStravaId }).sort({ startDate: 1 }).lean();
}

export async function deleteSegmentEfforts(activityStravaId: number): Promise<void> {
  await SegmentEffortModel.deleteMany({ activityStravaId });
}

export async function updateEffortPowerMetrics(
  stravaId: number,
  metrics: { normalizedPower: number; intensityFactor: number; trainingStressScore: number }
): Promise<void> {
  await SegmentEffortModel.updateOne({ stravaId }, { $set: metrics });
}
