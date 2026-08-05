// ============================================================================
// /api/futures — Server-side proxy for Binance Futures API (avoids CORS)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';

const FAPI_BASE = 'https://fapi.binance.com';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const endpoint = searchParams.get('endpoint'); // e.g. "fundingRate", "openInterest", "longShort"
  const symbol = searchParams.get('symbol') || 'BTCUSDT';

  if (!endpoint) {
    return NextResponse.json({ error: 'Missing endpoint param' }, { status: 400 });
  }

  try {
    let url = '';

    switch (endpoint) {
      case 'fundingRate':
        url = `${FAPI_BASE}/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
        break;
      case 'openInterest':
        url = `${FAPI_BASE}/fapi/v1/openInterest?symbol=${symbol}`;
        break;
      case 'longShort':
        url = `${FAPI_BASE}/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=1h&limit=1`;
        break;
      default:
        return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'CryptoTraderPro/1.0' },
      next: { revalidate: 30 }, // cache 30s
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream error: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
