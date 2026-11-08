let lastPrice = 0;
let changes = 0;
let fetchCount = 0;
const interval = setInterval(async () => {
    try {
        const res = await fetch('http://localhost:3000/api/tv-scanner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbols: { tickers: ["OANDA:XAUUSD"] }, columns: ["close"] })
        });
        const json = await res.json();
        const price = json.data[0].d[0];
        fetchCount++;
        if (price !== lastPrice) {
            changes++;
            console.log(`[${new Date().toISOString()}] Price changed to: ${price}`);
            lastPrice = price;
        }
        if (fetchCount >= 20) {
            console.log(`Changes: ${changes} / 20`);
            clearInterval(interval);
        }
    } catch (e) {
        console.error(e);
    }
}, 600);
