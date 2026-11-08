const WebSocket = require('ws');
const ws = new WebSocket(`wss://ws.binaryws.com/websockets/v3?app_id=1089`);
ws.on('open', () => {
    ws.send(JSON.stringify({ ticks_history: "R_100", adjust_start_time: 1, count: 5000, end: "latest", style: "candles", granularity: 60 }));
});
ws.on('message', (data) => {
    const json = JSON.parse(data.toString());
    console.log(`Deriv return count:`, json.candles ? json.candles.length : json.error);
    ws.close();
});
