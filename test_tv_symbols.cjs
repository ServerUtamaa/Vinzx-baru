fetch('https://scanner.tradingview.com/global/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: { tickers: [
      "OANDA:XAUUSD", "OANDA:XAGUSD", "OANDA:XPTUSD",
      "OANDA:EURUSD", "OANDA:GBPUSD", "OANDA:USDJPY",
      "OANDA:AUDUSD", "OANDA:USDCHF", "OANDA:NZDUSD",
      "OANDA:GBPJPY", "OANDA:EURJPY",
      "TVC:USOIL", "TVC:NDX"
    ] },
    columns: ["close", "open", "high", "low"]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
