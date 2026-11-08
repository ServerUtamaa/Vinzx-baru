fetch('https://scanner.tradingview.com/cfd/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    symbols: { tickers: [
      "OANDA:XAGUSD", "OANDA:XPTUSD", "FX_IDC:XAGUSD", "FX_IDC:XPTUSD", "PEPPERSTONE:XAGUSD",
      "TVC:USOIL", "OANDA:USCO24_USD", "CAPITALCOM:USOIL", "BLACKBULL:USOIL",
      "TVC:NDX", "CAPITALCOM:US100", "BLACKBULL:US100", "OANDA:NAS100USD"
    ] },
    columns: ["close"]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
