import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Trade from '@/models/Trade';

export async function GET() {
  try {
    await connectDB();
    const trades = await Trade.find().sort({ entryTime: -1 }).limit(200);
    return NextResponse.json(trades);
  } catch (error) {
    console.error('[API] Error fetching journal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    await connectDB();
    const newTrade = await Trade.create(data);
    return NextResponse.json(newTrade);
  } catch (error) {
    console.error('[API] Error creating trade:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await connectDB();
    await Trade.deleteMany({});
    return NextResponse.json({ success: true, message: 'Journal cleared' });
  } catch (error) {
    console.error('[API] Error clearing journal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
