const WebSocket = require('ws');
const ws = new WebSocket('wss://ws.binaryws.com/websockets/v3?app_id=1089');
ws.on('open', () => {
  ws.send(JSON.stringify({ active_symbols: 'brief', product_type: 'basic' }));
});
ws.on('message', (data) => {
  const json = JSON.parse(data.toString());
  if (json.active_symbols) {
      const symbols = json.active_symbols.filter(s => s.symbol.includes('XAU') || s.symbol.includes('EUR') || s.symbol.includes('GBP') || s.symbol.includes('USOIL') || s.symbol.includes('NDX'));
      console.log(symbols.map(s => s.symbol));
  } else {
      console.log(json);
  }
  ws.close();
});
