import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Signal from '@/models/Signal';

export async function DELETE() {
  try {
    await connectDB();
    await Signal.deleteMany({});
    return NextResponse.json({ success: true, message: 'All signals cleared' });
  } catch (error) {
    console.error('[API] Error clearing signals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
