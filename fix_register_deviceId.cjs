const fs = require('fs');

let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// For /api/auth/register
code = code.replace(/lastLogin: Date\.now\(\)\n        \};/g, "lastLogin: Date.now(),\n            deviceId: req.body.deviceId\n        };");

// For /api/auth/google mode REGISTER
code = code.replace(/lastLogin: Date\.now\(\)\n            \};/g, "lastLogin: Date.now(),\n                deviceId: req.body.deviceId\n            };");

fs.writeFileSync('.core/backend/server.js', code);
console.log("Fixed deviceId for register");
