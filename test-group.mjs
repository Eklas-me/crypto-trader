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
      // Format date nicely
      const [y, m, day] = key.split('-');
      const dateStr = new Date(Number(y), Number(m) - 1, Number(day))
        .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
      return { date: dateStr, open, close, high, low, volume, dollarChange, pctChange };
    })
    .reverse();
}

const mockCandles = [
  { time: 1718000000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
  { time: 1718086400, open: 105, high: 115, low: 95, close: 100, volume: 2000 }
];

console.log(groupByDay(mockCandles));
