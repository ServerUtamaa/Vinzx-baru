const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');
code = code.replace(/const USERS_DB_PATH = path.join\(process.cwd\(\), '.core', 'database', 'users.json'\);\n/g, (match, offset, str) => {
    // only replace if offset is > 1000 (skip the one at the top)
    if (offset > 1000) return "";
    return match;
});
fs.writeFileSync('.core/backend/server.js', code);
console.log("Fixed inner path");
