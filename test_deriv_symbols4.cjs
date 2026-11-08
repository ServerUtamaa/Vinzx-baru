const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1');
ws.on('open', () => {
  ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));
});
ws.on('message', (data) => {
  const json = JSON.parse(data.toString());
  if (json.active_symbols) {
      console.log('Total symbols:', json.active_symbols.length);
  } else {
      console.log('Error:', json);
  }
  ws.close();
});
