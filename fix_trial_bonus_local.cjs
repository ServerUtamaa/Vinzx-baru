const fs = require('fs');

let code = fs.readFileSync('services/databaseService.ts', 'utf8');

code = code.replace(
    /const newExp = \(currentExp > now\) \? currentExp \+ ms : now \+ ms;/g,
    `let newExp;
             if (users[idx].membershipTier === 'TRIAL' && currentExp > now) {
                 newExp = now + ms + (24 * 60 * 60 * 1000);
             } else {
                 newExp = (currentExp > now) ? currentExp + ms : now + ms;
             }`
);

fs.writeFileSync('services/databaseService.ts', code);
console.log("Updated trial bonus logic in databaseService.ts");
