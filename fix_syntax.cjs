const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
    /    \} else if \(isBinanceAsset\) \{\n        connectBinanceEngine\(currentAsset, currentTimeframe, checkActive\);\n    \}\n\n        connectBinanceEngine\(currentAsset, currentTimeframe, checkActive\);\n    \}/,
    "    } else if (isBinanceAsset) {\n        connectBinanceEngine(currentAsset, currentTimeframe, checkActive);\n    }"
);

fs.writeFileSync('App.tsx', code);
console.log("Fixed syntax");
