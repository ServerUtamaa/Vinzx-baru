fetch('https://scanner.tradingview.com/global/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: { tickers: ["OANDA:XAUUSD", "FX:EURUSD", "CAPITALCOM:NASDAQ"] },
    columns: ["close|1", "open|1", "high|1", "low|1"]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
