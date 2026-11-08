const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(
    /const \{ interval, range \} = req\.query;\n            const url = `https:\/\/query1\.finance\.yahoo\.com\/v8\/finance\/chart\/CL=F\?interval=\$\{interval\}&range=\$\{range\}`;/,
    'const { symbol, interval, range } = req.query;\n            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;'
);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fixed API Yahoo');
