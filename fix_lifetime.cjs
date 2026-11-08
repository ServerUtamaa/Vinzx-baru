const fs = require('fs');
let server = fs.readFileSync('.core/backend/server.js', 'utf8');

server = server.replace(
    "user.membershipTier = durationDays >= 30 ? 'MONTHLY' : (durationDays >= 14 ? 'BIWEEKLY' : 'WEEKLY');",
    "user.membershipTier = durationDays >= 18000 ? 'LIFETIME' : (durationDays >= 30 ? 'MONTHLY' : (durationDays >= 14 ? 'BIWEEKLY' : 'WEEKLY'));"
);

fs.writeFileSync('.core/backend/server.js', server);
console.log("Fixed lifetime membership logic");
