import mongoose, { Schema, Document } from 'mongoose';
import { AppSettings, DEFAULT_SETTINGS } from '@/engine/types';

export interface ISettings extends Document {
  settings: AppSettings;
}

const SettingsSchema: Schema = new Schema(
  {
    settings: {
      type: Object,
      required: true,
      default: DEFAULT_SETTINGS,
    },
  },
  { timestamps: true }
);

// We only need one global settings document for the app
// In a SaaS, this would be tied to a userId
export default mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
