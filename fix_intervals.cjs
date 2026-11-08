const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Fix connectYahooFinanceEngine
code = code.replace(/pollIntervalRef\.current = setInterval\(\(\) => \{\n          if \(isActive\(\)\) \{\n              fetchYahoo\(\);\n          \}\n      \}, 5000\);/g, 
`if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);\n      pollIntervalRef.current = setInterval(() => {\n          if (checkActive()) {\n              fetchYahoo();\n          }\n      }, 5000);`);

// Fix connectBinanceEngine
code = code.replace(/pollIntervalRef\.current = setInterval\(\(\) => \{\n          if \(isActive\(\) && isSyntheticRef\.current\) \{\n              fetchHistory\(\);\n          \}\n      \}, 3000\);/g,
`if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);\n      pollIntervalRef.current = setInterval(() => {\n          if (checkActive() && isSyntheticRef.current) {\n              fetchHistory();\n          }\n      }, 3000);`);

// Fix the main useEffect fallback
const fallbackCode = `if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(() => {
            if (checkActive() && (isSyntheticRef.current || chartDataRef.current.length === 0)) {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                connectYahooFinanceEngine(currentAsset, currentTimeframe, checkActive);
            }
        }, 3000);`;

code = code.replace(/pollIntervalRef\.current = setInterval\(\(\) => \{\n            if \(checkActive\(\) && isSyntheticRef\.current\) \{\n                \/\/ If deriv WS failed, use Yahoo as fallback\n                connectYahooFinanceEngine\(currentAsset, currentTimeframe, checkActive\);\n                \/\/ Stop this specific fallback poller, since connectYahooFinanceEngine sets its own\n                if \(pollIntervalRef\.current\) \{\n                    clearInterval\(pollIntervalRef\.current\);\n                    pollIntervalRef\.current = null;\n                \}\n            \}\n        \}, 3000\);/g, fallbackCode);

fs.writeFileSync('App.tsx', code);
console.log("Fixed intervals in App.tsx");
