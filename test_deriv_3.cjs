const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ ticks_history: 'frxXAUUSD', adjust_start_time: 1, count: 5, end: "latest", style: "candles", granularity: 60 }));
});
ws.on('message', (data) => {
  console.log('Deriv data (no sub):', JSON.parse(data.toString()).error || "success");
  ws.close();
});
