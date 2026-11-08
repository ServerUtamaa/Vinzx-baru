const fromTime = Math.floor(Date.now()/1000) - 86400;
const toTime = Math.floor(Date.now()/1000);
fetch(`https://benchmarks.tradingview.com/tvx/history?symbol=OANDA:XAUUSD&resolution=1&from=${fromTime}&to=${toTime}`).then(r=>r.text()).then(console.log).catch(console.error);
