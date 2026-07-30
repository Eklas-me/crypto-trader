import mongoose, { Schema, Document } from 'mongoose';
import { SignalGrade, Timeframe } from '@/engine/types';
import { MarketDirection } from '@/engine/signal-engine';

export interface ISignal extends Document {
  id: string; // use string id from the engine
  coin: string;
  timeframe: Timeframe;
  type: 'LONG' | 'SHORT';
  status: 'ACTIVE' | 'CLOSED' | 'CANCELLED' | 'INVALIDATED';
  entry: number;
  targets: number[];
  stopLoss: number;
  grade: SignalGrade;
  marketContext: MarketDirection;
  timestamp: number;
  expiresAt: number;
  layers: any[]; // store the raw layer results if needed for history
}

const SignalSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    coin: { type: String, required: true },
    timeframe: { type: String, required: true },
    type: { type: String, enum: ['LONG', 'SHORT'], required: true },
    status: { type: String, enum: ['ACTIVE', 'CLOSED', 'CANCELLED', 'INVALIDATED'], required: true },
    entry: { type: Number, required: true },
    targets: { type: [Number], required: true },
    stopLoss: { type: Number, required: true },
    grade: { type: String, required: true },
    marketContext: { type: Object, required: true },
    timestamp: { type: Number, required: true },
    expiresAt: { type: Number, required: true },
    layers: { type: Array, default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.Signal || mongoose.model<ISignal>('Signal', SignalSchema);
