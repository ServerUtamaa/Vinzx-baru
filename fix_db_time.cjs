const fs = require('fs');

let dbFile = fs.readFileSync('services/databaseService.ts', 'utf8');

dbFile = dbFile.replace(
    "import { UserSession } from '../types';",
    "import { UserSession } from '../types';\nimport { getTrueTime } from '../utils/time';"
);

dbFile = dbFile.replace(/Date\.now\(\)/g, "getTrueTime()");

fs.writeFileSync('services/databaseService.ts', dbFile);
console.log("databaseService time updated.");
