async function run() {
  const yf = await fetch('http://localhost:3000/api/yahoo?symbol=EURUSD=X&interval=1m&range=1d').then(r=>r.json());
  const yfPrice = yf.chart.result[0].meta.regularMarketPrice;

  const tv = await fetch('https://scanner.tradingview.com/global/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols: { tickers: ["OANDA:EURUSD"] }, columns: ["close"] })
  }).then(r=>r.json());
  const tvPrice = tv.data[0].d[0];

  console.log('Yahoo EURUSD=X price:', yfPrice);
  console.log('TradingView EURUSD price:', tvPrice);
}
run();
