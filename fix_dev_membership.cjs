const fs = require('fs');

let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(
    /user\.membershipTier = durationDays >= 18000 \? 'LIFETIME' : \(durationDays >= 30 \? 'MONTHLY' : \(durationDays >= 14 \? 'BIWEEKLY' : 'WEEKLY'\)\);\n            if \(user\.membershipTier === 'TRIAL' && currentExp > now\) \{/,
    `const oldTier = user.membershipTier;
            user.membershipTier = durationDays >= 18000 ? 'LIFETIME' : (durationDays >= 30 ? 'MONTHLY' : (durationDays >= 14 ? 'BIWEEKLY' : 'WEEKLY'));
            if (oldTier === 'TRIAL' && currentExp > now) {`
);

fs.writeFileSync('.core/backend/server.js', code);
console.log("Fixed dev membership trial check");
