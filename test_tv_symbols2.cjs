fetch('https://scanner.tradingview.com/global/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: { tickers: [
      "TVC:SILVER", "FX_IDC:XAGUSD", "CAPITALCOM:SILVER", "OANDA:XAGUSD",
      "TVC:PLATINUM", "FX_IDC:XPTUSD", "CAPITALCOM:PLATINUM",
      "TVC:USOIL", "CAPITALCOM:USOIL", "BLACKBULL:USOIL", "SKILLING:USOIL",
      "TVC:NDX", "CAPITALCOM:US100", "BLACKBULL:US100"
    ] },
    columns: ["close"]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
