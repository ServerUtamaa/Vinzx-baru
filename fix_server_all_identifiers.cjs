const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/const user = users\.find\(u => u\.username === req\.params\.username \|\| u\.id === req\.params\.username\);/g, "let user = users.find(u => u.id === req.params.username);\n        if (!user) user = users.find(u => u.username === req.params.username);");

code = code.replace(/const user = users\.find\(u => u\.username === req\.params\.username\);/g, "let user = users.find(u => u.id === req.params.username);\n        if (!user) user = users.find(u => u.username === req.params.username);");

fs.writeFileSync('.core/backend/server.js', code);
console.log("Fixed server.js identifier lookup for all user endpoints");
