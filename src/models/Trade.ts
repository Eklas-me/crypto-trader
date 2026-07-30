import mongoose, { Schema, Document } from 'mongoose';
import { SignalGrade } from '@/engine/types';

export interface ITrade extends Document {
  id: string; // Internal id (can be same as signal id)
  coin: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  exitPrice: number | null;
  quantity: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number; // Unix timestamp in ms
  exitTime: number | null;
  pnl: number | null;
  pnlPercent: number | null;
  status: 'OPEN' | 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_MANUAL';
  signalGrade: SignalGrade;
  notes: string;
}

const TradeSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    coin: { type: String, required: true },
    direction: { type: String, enum: ['BUY', 'SELL'], required: true },
    entryPrice: { type: Number, required: true },
    exitPrice: { type: Number, default: null },
    quantity: { type: Number, required: true },
    stopLoss: { type: Number, required: true },
    takeProfit: { type: Number, required: true },
    entryTime: { type: Number, required: true },
    exitTime: { type: Number, default: null },
    pnl: { type: Number, default: null },
    pnlPercent: { type: Number, default: null },
    status: { type: String, enum: ['OPEN', 'CLOSED_TP', 'CLOSED_SL', 'CLOSED_MANUAL'], required: true, default: 'OPEN' },
    signalGrade: { type: String, required: true },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.models.Trade || mongoose.model<ITrade>('Trade', TradeSchema);
