import mongoose, { type InferSchemaType } from 'mongoose';

const appVariablesSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
  refreshToken: { type: String, required: true },
  tokenExpiresAt: { type: Number, required: true },
  athleteId: { type: Number, required: true },
});

type AppVariablesDoc = InferSchemaType<typeof appVariablesSchema>;

const AppVariablesModel = mongoose.model('AppVariables', appVariablesSchema);

export async function getAppVariables(): Promise<AppVariablesDoc | null> {
  return AppVariablesModel.findOne().lean();
}

export async function upsertAppVariables(data: AppVariablesDoc): Promise<void> {
  await AppVariablesModel.findOneAndUpdate({}, data, { upsert: true, new: true });
}
