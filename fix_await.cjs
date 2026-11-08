const fs = require('fs');
let server = fs.readFileSync('.core/backend/server.js', 'utf8');

server = server.replace(
    "    restoreUsersFromFirestore();",
    "    await restoreUsersFromFirestore();"
);

fs.writeFileSync('.core/backend/server.js', server);
console.log("Fixed await");
