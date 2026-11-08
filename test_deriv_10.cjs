const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ['frxEURUSD', 'frxGBPUSD', 'frxUSDJPY', 'frxAUDUSD', 'frxUSDCHF', 'frxNZDUSD'].forEach(s => {
      ws.send(JSON.stringify({ ticks_history: s, adjust_start_time: 1, count: 1, end: "latest", style: "candles", granularity: 60 }));
  });
});
let c = 0;
ws.on('message', (data) => {
  const json = JSON.parse(data.toString());
  console.log(json.echo_req.ticks_history, '->', json.error ? json.error.code : 'success');
  c++;
  if(c === 6) ws.close();
});
