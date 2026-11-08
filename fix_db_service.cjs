const fs = require('fs');
let code = fs.readFileSync('services/databaseService.ts', 'utf8');

code = code.replace(/const res = await fetch\(`\/api\/users\/me\/\$\{username\}`\);/, "const res = await fetch(`/api/users/me/${uid || username}`);");

fs.writeFileSync('services/databaseService.ts', code);
console.log("Fixed databaseService");
