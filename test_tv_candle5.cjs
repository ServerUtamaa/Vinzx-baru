fetch('https://scanner.tradingview.com/global/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: { tickers: ["OANDA:XAUUSD"] },
    columns: ["close|5", "open|5", "high|5", "low|5"]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
