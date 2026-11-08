const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/const user = users\.find\(u => u\.username === req\.params\.identifier \|\| u\.id === req\.params\.identifier\);/g, "let user = users.find(u => u.id === req.params.identifier);\n        if (!user) user = users.find(u => u.username === req.params.identifier);");

fs.writeFileSync('.core/backend/server.js', code);
console.log("Fixed server.js identifier lookup");
