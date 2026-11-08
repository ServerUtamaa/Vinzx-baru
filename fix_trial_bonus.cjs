const fs = require('fs');

let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// For /api/users/:username/membership
code = code.replace(
    /const newExp = \(currentExp > now\) \? currentExp \+ ms : now \+ ms;/g,
    `let newExp;
                 if (user.membershipTier === 'TRIAL' && currentExp > now) {
                     newExp = now + ms + (24 * 60 * 60 * 1000); // discard trial remaining, add 1 day bonus
                 } else {
                     newExp = (currentExp > now) ? currentExp + ms : now + ms;
                 }`
);

// For /api/dev/users/:id/membership
code = code.replace(
    /user\.membershipExpiresAt = \(currentExp > now \? currentExp : now\) \+ ms;/g,
    `if (user.membershipTier === 'TRIAL' && currentExp > now) {
                user.membershipExpiresAt = now + ms + (24 * 60 * 60 * 1000);
            } else {
                user.membershipExpiresAt = (currentExp > now ? currentExp : now) + ms;
            }`
);

fs.writeFileSync('.core/backend/server.js', code);
console.log("Updated trial bonus logic in server.js");
