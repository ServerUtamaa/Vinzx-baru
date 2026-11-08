const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const regex = /\/\/\s*Update on server[\s\S]*?fetch\(\`\/api\/users\/\$\{userSession\.uid \|\| userSession\.username\}\/tokens\`[\s\S]*?\.catch\(e => console\.error\('Error subtracting token:', e\)\);/g;

code = code.replace(regex, "// Token automatically reduced securely on the server via /api/generate");

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx tokens');
