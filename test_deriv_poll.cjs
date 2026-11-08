const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ ticks_history: 'frxXAUUSD', adjust_start_time: 1, count: 2000, end: "latest", style: "candles", granularity: 60 }));
  setInterval(() => {
      ws.send(JSON.stringify({ ticks_history: 'frxXAUUSD', adjust_start_time: 1, count: 2, end: "latest", style: "candles", granularity: 60 }));
  }, 2000);
});
ws.on('message', (data) => {
  const json = JSON.parse(data.toString());
  if (json.error) console.log('Error:', json.error.code);
  else console.log('Candles received:', json.candles ? json.candles.length : 'none');
});
ws.on('close', () => console.log('Closed'));
ws.on('error', (e) => console.log('WS error:', e));
setTimeout(() => process.exit(0), 10000);
