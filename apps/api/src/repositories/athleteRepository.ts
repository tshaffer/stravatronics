import mongoose, { type InferSchemaType } from 'mongoose';

const athleteSchema = new mongoose.Schema({
  stravaId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  profileImageUrl: { type: String },
  city: { type: String },
  state: { type: String },
  country: { type: String },
  measurementPreference: { type: String },
  syncedAt: { type: String, required: true }
});

export type AthleteDoc = InferSchemaType<typeof athleteSchema>;

const AthleteModel = mongoose.model('Athlete', athleteSchema);

export async function upsertAthlete(data: AthleteDoc): Promise<AthleteDoc> {
  const doc = await AthleteModel.findOneAndUpdate(
    { stravaId: data.stravaId },
    data,
    { upsert: true, new: true }
  ).lean();
  if (!doc) throw new Error('Upsert returned null');
  return doc;
}

export async function getAthlete(): Promise<AthleteDoc | null> {
  return AthleteModel.findOne().lean();
}
