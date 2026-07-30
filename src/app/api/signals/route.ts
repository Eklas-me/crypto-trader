import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Signal from '@/models/Signal';

export async function GET() {
  try {
    await connectDB();
    // Fetch last 100 signals, descending by timestamp
    const signals = await Signal.find().sort({ timestamp: -1 }).limit(100);
    return NextResponse.json(signals);
  } catch (error) {
    console.error('[API] Error fetching signals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
