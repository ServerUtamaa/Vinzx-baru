const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ active_symbols: 'brief' }));
});
let received = '';
ws.on('message', (data) => {
  const json = JSON.parse(data.toString());
  if (json.active_symbols) {
      const fs = require('fs');
      fs.writeFileSync('symbols.json', JSON.stringify(json.active_symbols, null, 2));
      console.log('Saved to symbols.json, count:', json.active_symbols.length);
  }
  ws.close();
});
