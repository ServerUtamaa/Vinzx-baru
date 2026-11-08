const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const oldEffect = `  useEffect(() => {
      if (analysis) {
          localStorage.setItem('SMART_SESSION_RECOVERY', JSON.stringify({
              asset: currentAsset,
              timeframe: currentTimeframe,
              analysis: analysis,
              priceOffset: priceOffset
          }));
      }
  }, [analysis, currentAsset, currentTimeframe, priceOffset]);`;

const newEffect = `  useEffect(() => {
      if (analysis) {
          localStorage.setItem('SMART_SESSION_RECOVERY', JSON.stringify({
              asset: currentAsset,
              timeframe: currentTimeframe,
              analysis: analysis,
              priceOffset: priceOffset
          }));
      } else {
          localStorage.removeItem('SMART_SESSION_RECOVERY');
      }
  }, [analysis, currentAsset, currentTimeframe, priceOffset]);`;

code = code.replace(oldEffect, newEffect);

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx for clearing session when analysis is null');
