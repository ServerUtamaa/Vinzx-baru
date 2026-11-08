const fs = require('fs');
let code = fs.readFileSync('components/CandleStickChart.tsx', 'utf8');
code = code.replace('<div className="text-6xl mb-2">🗿</div>', `<div className="mb-4 opacity-50"><svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>`);
fs.writeFileSync('components/CandleStickChart.tsx', code);
console.log("Moai updated to minimal clock/lock icon");
