const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

const newBinance = `    app.get('/api/binance', async (req, res) => {
        try {
            const { symbol, interval } = req.query;
            let allKlines = [];
            let endTime = Date.now();
            
            // Fetch 5 pages of 1000 candles = 5000 candles
            for (let i = 0; i < 5; i++) {
                const url = \`https://api.binance.com/api/v3/klines?symbol=\${symbol}&interval=\${interval}&limit=1000&endTime=\${endTime}\`;
                const response = await fetch(url);
                const data = await response.json();
                if (data && data.length > 0) {
                    allKlines = data.concat(allKlines);
                    endTime = data[0][0] - 1; // set endTime to slightly before the oldest candle
                } else {
                    break;
                }
            }
            res.json(allKlines);
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    });`;

const oldBinanceRegex = /    app\.get\('\/api\/binance', async \(req, res\) => {[\s\S]*?    }\);/;
code = code.replace(oldBinanceRegex, newBinance);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Patched backend binance fetching logic!');
