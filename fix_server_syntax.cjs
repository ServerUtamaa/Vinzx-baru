const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// Remove duplicate USERS_DB_PATH
let count = 0;
code = code.replace(/const USERS_DB_PATH = path\.join\(process\.cwd\(\), '\.core', 'database', 'users\.json'\);/g, (match) => {
    count++;
    return count === 1 ? match : '';
});

fs.writeFileSync('.core/backend/server.js', code);
