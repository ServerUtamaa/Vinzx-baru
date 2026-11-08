const fs = require('fs');
let db = fs.readFileSync('services/databaseService.ts', 'utf8');

db = "import { getTrueTime } from '../utils/time';\n" + db;

fs.writeFileSync('services/databaseService.ts', db);
console.log("Fixed db import");
