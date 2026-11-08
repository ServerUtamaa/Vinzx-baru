const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const yahooSymbolMapCode = `const yahooSymbolMap: Record<string, string> = { 
          [Asset.XAUUSD]: 'GC=F', [Asset.XAGUSD]: 'SI=F', [Asset.XPTUSD]: 'PL=F',
          [Asset.NASDAQ]: 'NQ=F', [Asset.USOIL]: 'CL=F',
          [Asset.EURUSD]: 'EURUSD=X', [Asset.GBPUSD]: 'GBPUSD=X', [Asset.USDJPY]: 'JPY=X',
          [Asset.AUDUSD]: 'AUDUSD=X', [Asset.USDCHF]: 'CHF=X', [Asset.NZDUSD]: 'NZDUSD=X',
          [Asset.GBPJPY]: 'GBPJPY=X', [Asset.EURJPY]: 'EURJPY=X'
      };`;

console.log("Checking App.tsx for Yahoo symbol map...");
const regex = /const yahooSymbolMap: Record<string, string> = \{[\s\S]*?\};/;
const match = code.match(regex);
if (match) {
    console.log("Found:", match[0]);
} else {
    console.log("Not found.");
}
