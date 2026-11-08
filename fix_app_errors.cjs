const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Fix line 636
code = code.replace(/if \(checkActive\(\) if \(isActive\(\) && isSyntheticRef\.current\) \{if \(isActive\(\) && isSyntheticRef\.current\) \{ isSyntheticRef\.current\) \{/g, 'if (isActive() && isSyntheticRef.current) {');

// Fix line 792
code = code.replace(/if \(checkActive\(\) if \(isActive\(\) && isSyntheticRef\.current\) \{if \(isActive\(\) && isSyntheticRef\.current\) \{ isSyntheticRef\.current\) \{/g, 'if (checkActive() && isSyntheticRef.current) {');

// Fix any left-overs like `if (checkActive() && isSyntheticRef.current) {`
// Actually wait, let's just make it simple.
// Find the exact line in connectBinanceEngine
code = code.replace(/pollIntervalRef\.current = setInterval\(\(\) => \{\n          if \(.*isSyntheticRef\.current.*\) \{\n              fetchHistory\(\);\n          \}\n      \}, 3000\);/g, 
  "pollIntervalRef.current = setInterval(() => {\n          if (isActive() && isSyntheticRef.current) {\n              fetchHistory();\n          }\n      }, 3000);");

code = code.replace(/pollIntervalRef\.current = setInterval\(\(\) => \{\n            if \(.*isSyntheticRef\.current.*\) \{\n                \/\/ If deriv WS failed, use Yahoo as fallback\n                connectYahooFinanceEngine/g,
  "pollIntervalRef.current = setInterval(() => {\n            if (checkActive() && isSyntheticRef.current) {\n                // If deriv WS failed, use Yahoo as fallback\n                connectYahooFinanceEngine");

fs.writeFileSync('App.tsx', code);
