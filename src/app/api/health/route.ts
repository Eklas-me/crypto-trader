import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'CryptoTrader Pro',
    timestamp: new Date().toISOString(),
  });
}
