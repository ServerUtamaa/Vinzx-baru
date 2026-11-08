const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

const yahooMap = `
      const yahooSymbolMap: Record<string, string> = {
          [Asset.XAUUSD]: 'GC=F', [Asset.XAGUSD]: 'SI=F', [Asset.XPTUSD]: 'PL=F',
          [Asset.USOIL]: 'CL=F', [Asset.NASDAQ]: 'NQ=F', 
          [Asset.EURUSD]: 'EURUSD=X', [Asset.GBPUSD]: 'GBPUSD=X', [Asset.USDJPY]: 'JPY=X',
          [Asset.AUDUSD]: 'AUDUSD=X', [Asset.USDCHF]: 'CHF=X', [Asset.NZDUSD]: 'NZDUSD=X',
          [Asset.GBPJPY]: 'GBPJPY=X', [Asset.EURJPY]: 'EURJPY=X'
      };
      const symbol = yahooSymbolMap[asset] || 'CL=F';
`;

code = code.replace(
    /const fetchYahoo = async \(\) => \{/,
    yahooMap + "\n      const fetchYahoo = async () => {"
);

code = code.replace(
    /const res = await fetch\(`\/api\/yahoo\?interval=\$\{interval\}&range=\$\{range\}`\);/,
    "const res = await fetch(`/api/yahoo?symbol=${symbol}&interval=${interval}&range=${range}`);"
);

// We need to use connectYahooFinanceEngine for deriv assets now!
code = code.replace(
    /if \(currentAsset === Asset\.USOIL\) \{\n        connectYahooFinanceEngine\(currentAsset, currentTimeframe, checkActive\);\n    \} else if \(isDerivAsset\) \{\n        connectDerivEngine\(currentAsset, currentTimeframe, checkActive\);\n    \} else if \(isBinanceAsset\) \{/,
    `if (isDerivAsset || currentAsset === Asset.USOIL) {
        // Fallback to Yahoo if Deriv fails
        connectDerivEngine(currentAsset, currentTimeframe, checkActive);
    } else if (isBinanceAsset) {`
);

fs.writeFileSync('App.tsx', code);
console.log("Updated App.tsx connectYahooFinanceEngine");
