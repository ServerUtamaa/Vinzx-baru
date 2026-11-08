const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(
    /user\.role = 'USER';/g,
    "user.role = 'USER'; user.membershipTier = 'TRIAL'; user.membershipExpiresAt = Date.now() + (3 * 24 * 60 * 60 * 1000); user.tokens = 3;"
);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fixed accept!');
