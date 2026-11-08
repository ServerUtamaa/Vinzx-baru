const fs = require('fs');
let db = fs.readFileSync('services/databaseService.ts', 'utf8');

db = db.replace(/parseInt\(genesisStart\)/g, "parseInt(genesisStart as string)");
db = db.replace(/genesisStart = getTrueTime\(\)\.toString\(\);/g, "genesisStart = getTrueTime().toString();\n        localStorage.setItem(GENESIS_KEY, genesisStart as string);");

fs.writeFileSync('services/databaseService.ts', db);
console.log("Fixed ts errors");
