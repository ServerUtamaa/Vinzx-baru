fetch('https://scanner.tradingview.com/global/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: { tickers: [
      "NASDAQ:NDX", "INDEX:NDX", "CAPITALCOM:US100", "FOREXCOM:NAS100USD"
    ] },
    columns: ["close"]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
