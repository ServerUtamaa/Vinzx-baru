const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/const now = Date\.now\(\);\s*const tier = userSession\.membershipTier \|\| 'NONE';/g, "const now = getTrueTime();\n        const tier = userSession.membershipTier || 'NONE';");

fs.writeFileSync('App.tsx', code);
console.log("Fixed Date.now() in App.tsx");
