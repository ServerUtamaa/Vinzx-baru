const fs = require('fs');
let code = fs.readFileSync('components/FloatingUI.tsx', 'utf8');
code = code.replace(/14-POINT PROTOCOL/g, '30-POINT PROTOCOL');
fs.writeFileSync('components/FloatingUI.tsx', code);
console.log("Updated to 30-POINT PROTOCOL in FloatingUI");
