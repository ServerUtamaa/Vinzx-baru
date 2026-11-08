async function test() {
    const symbol = 'BTCUSDT';
    const interval = '1m';
    let allKlines = [];
    let endTime = Date.now();
    for (let i = 0; i < 5; i++) {
        const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000&endTime=${endTime}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.length > 0) {
            allKlines = data.concat(allKlines);
            endTime = data[0][0] - 1;
        } else {
            break;
        }
    }
    console.log("Total Binance candles:", allKlines.length);
}
test();
