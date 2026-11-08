const WebSocket = require('ws');
const ws = new WebSocket('wss://streamer.finance.yahoo.com');

ws.on('open', () => {
  console.log('Connected to Yahoo WS');
  ws.send(JSON.stringify({ subscribe: ['EURUSD=X', 'GC=F'] }));
});

ws.on('message', (data) => {
  console.log('Message:', data.toString());
});

setTimeout(() => ws.close(), 5000);
