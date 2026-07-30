import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Signal from '@/models/Signal';
import Trade from '@/models/Trade';
import { getUptimeFormatted, getSystemStartTime, getTotalScanCount } from '@/lib/status-tracker';

export async function GET() {
  try {
    await connectDB();
    const totalSignals = await Signal.countDocuments();
    const totalTrades = await Trade.countDocuments();

    return NextResponse.json({
      success: true,
      uptimeFormatted: getUptimeFormatted(),
      systemStartTime: getSystemStartTime(),
      totalScans: getTotalScanCount(),
      totalSignals,
      totalTrades,
      isScannerActive: true,
    });
  } catch (error) {
    console.error('[API] Error fetching status:', error);
    return NextResponse.json({
      success: false,
      uptimeFormatted: getUptimeFormatted(),
      systemStartTime: getSystemStartTime(),
      totalScans: getTotalScanCount(),
      totalSignals: 0,
      totalTrades: 0,
      isScannerActive: true,
    });
  }
}
