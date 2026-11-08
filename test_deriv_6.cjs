const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ ticks_history: 'frxXAUUSD', adjust_start_time: 1, count: 1, end: "latest", style: "candles", granularity: 60 }));
});
ws.on('message', (data) => {
  const json = JSON.parse(data.toString());
  console.log('Without subscribe: 1 ->', json.error ? json.error.code : 'success');
  ws.close();
});
