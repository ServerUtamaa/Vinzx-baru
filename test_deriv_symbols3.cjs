const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ active_symbols: 'brief' }));
});
ws.on('message', (data) => {
  const json = JSON.parse(data.toString());
  if (json.active_symbols) {
      console.log('Total symbols:', json.active_symbols.length);
      console.log('Some symbols:', json.active_symbols.map(s => s.symbol).slice(0, 10));
      const xau = json.active_symbols.filter(s => s.symbol.toLowerCase().includes('xau'));
      console.log('XAU:', xau);
  } else {
      console.log('Error:', json);
  }
  ws.close();
});
