const fs = require('fs');

let server = fs.readFileSync('.core/backend/server.js', 'utf8');

server = server.replace(/res\.json\(\{ success: true, user \}\);/g, "res.json({ success: true, user, serverTime: Date.now() });");
server = server.replace(/res\.json\(\{ success: true, user: hiddenUser \}\);/g, "res.json({ success: true, user: hiddenUser, serverTime: Date.now() });");
server = server.replace(/res\.json\(user\);/g, "res.json({ ...user, serverTime: Date.now() });");

fs.writeFileSync('.core/backend/server.js', server);
console.log("Server time added to ALL responses.");
