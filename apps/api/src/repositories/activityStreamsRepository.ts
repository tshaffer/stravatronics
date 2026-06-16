import mongoose, { type InferSchemaType } from 'mongoose';

const activityStreamsSchema = new mongoose.Schema({
  activityStravaId: { type: Number, required: true, unique: true },
  time: [Number],
  latitudes: [Number],
  longitudes: [Number],
  altitude: [Number],
  distance: [Number],
  gradeSmooth: [Number],
  heartrate: [Number],
  cadence: [Number],
  watts: [Number],
  normalizedPower: { type: Number },
  intensityFactor: { type: Number },
  trainingStressScore: { type: Number },
  maxPowerAtDurations: [Number]
});

export type ActivityStreamsDoc = InferSchemaType<typeof activityStreamsSchema>;

const ActivityStreamsModel = mongoose.model('ActivityStreams', activityStreamsSchema);

export async function upsertActivityStreams(doc: ActivityStreamsDoc): Promise<void> {
  await ActivityStreamsModel.updateOne(
    { activityStravaId: doc.activityStravaId },
    { $set: doc },
    { upsert: true }
  );
}

export async function getActivityStreams(activityStravaId: number): Promise<ActivityStreamsDoc | null> {
  return ActivityStreamsModel.findOne({ activityStravaId }).lean();
}

export async function deleteActivityStreams(activityStravaId: number): Promise<void> {
  await ActivityStreamsModel.deleteOne({ activityStravaId });
}
