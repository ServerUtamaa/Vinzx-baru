const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /const result = await analyzeMarketStructure\(currentAsset, dataWithOffset, currentTimeframe, null, winStreak, lossStreak\);/g,
  `const result = await analyzeMarketStructure(currentAsset, dataWithOffset, currentTimeframe, null, winStreak, lossStreak, userSession.username || userSession.uid);`
);

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx');
