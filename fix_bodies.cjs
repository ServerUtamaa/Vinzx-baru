const fs = require('fs');
let code = fs.readFileSync('.core/components/AuthOverlay.tsx', 'utf8');

code = code.replace(
    /body: JSON\.stringify\(\{ username: regUsername, password: regPassword \}\)/,
    "body: JSON.stringify({ username: regUsername, password: regPassword, deviceId: getDeviceId() })"
);

code = code.replace(
    /username: user\.displayName \|\| 'User Vinzx',\n                    mode \n                \}\)/,
    "username: user.displayName || 'User Vinzx',\n                    mode,\n                    deviceId: getDeviceId()\n                })"
);

fs.writeFileSync('.core/components/AuthOverlay.tsx', code);
console.log("Fixed payload");
