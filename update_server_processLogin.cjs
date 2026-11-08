const fs = require('fs');

let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(
    /function processUserLogin\(user\) \{/g,
    `function processUserLogin(user, deviceId) {\n    if (deviceId) {\n        user.deviceId = deviceId;\n    }`
);

// Fix calls
code = code.replace(/processUserLogin\(user\);/g, "processUserLogin(user, req.body.deviceId);");

fs.writeFileSync('.core/backend/server.js', code);
console.log("Updated server.js processUserLogin");
