import mongoose, { Schema, Document } from 'mongoose';
import { SignalGrade, Timeframe, SignalDirection, TradeType, LayerResult } from '@/engine/types';

export interface ISignal extends Document {
  id: string;
  coin: string;
  timeframe: Timeframe;
  direction: SignalDirection;
  grade: SignalGrade;
  tradeType: TradeType;
  confidence: number;
  layersAgreed: number;
  layers: LayerResult[];
  entryPriceLow: number;
  entryPriceHigh: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  riskRewardRatio: number;
  candlePatterns: any[];
  chartPatterns: any[];
  timestamp: number;
  expiresAt: number;
  status: 'ACTIVE' | 'EXPIRED' | 'HIT_TP' | 'HIT_SL';
}

const SignalSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    coin: { type: String, required: true },
    timeframe: { type: String, required: true },
    direction: { type: String, enum: ['BUY', 'SELL', 'HOLD'], required: true },
    grade: { type: String, required: true },
    tradeType: { type: String, enum: ['SCALPING', 'INTRADAY', 'SWING'], required: true },
    confidence: { type: Number, required: true },
    layersAgreed: { type: Number, required: true },
    layers: { type: Array, default: [] },
    entryPriceLow: { type: Number, required: true },
    entryPriceHigh: { type: Number, required: true },
    stopLoss: { type: Number, required: true },
    tp1: { type: Number, required: true },
    tp2: { type: Number, required: true },
    tp3: { type: Number, required: true },
    riskRewardRatio: { type: Number, required: true },
    candlePatterns: { type: Array, default: [] },
    chartPatterns: { type: Array, default: [] },
    timestamp: { type: Number, required: true },
    expiresAt: { type: Number, required: true },
    status: { type: String, enum: ['ACTIVE', 'EXPIRED', 'HIT_TP', 'HIT_SL'], required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Signal || mongoose.model<ISignal>('Signal', SignalSchema);
