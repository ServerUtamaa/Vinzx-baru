fetch('https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1m&range=1d')
  .then(r => r.json())
  .then(data => console.log(data.chart.result[0].meta.symbol, data.chart.result[0].meta.regularMarketPrice))
  .catch(console.error);
