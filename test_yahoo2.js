Promise.all(['EURUSD=X', 'JPY=X', 'NQ=F', 'GBPJPY=X'].map(sym => 
  fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1m&range=1d`)
    .then(r => r.json())
    .then(data => console.log(sym, data.chart.result[0].meta.regularMarketPrice))
)).catch(console.error);
