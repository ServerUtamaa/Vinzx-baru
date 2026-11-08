fetch('https://scanner.tradingview.com/cfd/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    columns: ["name", "description", "close"],
    range: [0, 50]
  })
}).then(r=>r.json()).then(d=>console.log(JSON.stringify(d, null, 2))).catch(console.error);
