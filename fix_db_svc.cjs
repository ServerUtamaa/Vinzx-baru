const fs = require('fs');
let code = fs.readFileSync('services/databaseService.ts', 'utf8');
code = code.replace(/fetch\(\`\/api\/users\/\$\{username\}\/history\`/g, "fetch(`/api/users/${uid || username}/history`");
fs.writeFileSync('services/databaseService.ts', code);
