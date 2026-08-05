import { fetchHistoricalRange } from './src/services/binance-api.ts';

function groupByDay(candles) {
  const buckets = {};
  for (const c of candles) {
    const d = new Date(c.time * 1000);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!buckets[key]) buckets[key] = [];
    buckets[key].push(c);
  }

  return Object.keys(buckets)
    .sort()
    .map((key) => {
      const cs = buckets[key];
      const high = Math.max(...cs.map((c) => c.high));
      const low = Math.min(...cs.map((c) => c.low));
      const open = cs[0].open;
      const close = cs[cs.length - 1].close;
      const volume = cs.reduce((s, c) => s + c.volume, 0);
      const dollarChange = close - open;
      const pctChange = ((close - open) / open) * 100;
      const [y, m, day] = key.split('-');
      const dateStr = new Date(Number(y), Number(m) - 1, Number(day))
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
      return { date: dateStr, open, close, high, low, volume, dollarChange, pctChange };
    })
    .reverse();
}

async function run() {
  const now = Date.now();
  const startTime = now - 7 * 24 * 60 * 60 * 1000;
  try {
    const candles = await fetchHistoricalRange('BTCUSDT', '1h', startTime, now);
    console.log("Candles fetched:", candles.length);
    const rows = groupByDay(candles);
    console.log("Daily rows:", rows.length);
  } catch(e) {
    console.error(e);
  }
}
run();
