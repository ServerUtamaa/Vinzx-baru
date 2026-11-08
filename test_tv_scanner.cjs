fetch('https://scanner.tradingview.com/forex/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: { tickers: ["OANDA:EURUSD", "OANDA:XAUUSD"] },
    columns: ["close", "open", "high", "low", "volume"]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
