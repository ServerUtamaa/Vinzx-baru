const WebSocket = require('ws');
[1089, 1, 16929, 36544, 19111].forEach(app_id => {
  const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=${app_id}`);
  ws.on('open', () => {
    ws.send(JSON.stringify({ active_symbols: 'brief' }));
  });
  ws.on('message', (data) => {
    const json = JSON.parse(data.toString());
    console.log(`App_id ${app_id}: ${json.active_symbols ? json.active_symbols.length : (json.error ? json.error.code : 'unknown')} symbols`);
    ws.close();
  });
});
