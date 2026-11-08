const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

const processUserLogic = `
function processUserLogin(user) {
    const now = Date.now();
    user.lastLogin = now;

    // Daily token reset logic
    const currentDateStr = new Date(now).toDateString();
    if (!user.lastTokenResetDate || user.lastTokenResetDate !== currentDateStr) {
        user.tokens = 3;
        user.lastTokenResetDate = currentDateStr;
    }

    // Trial logic: 3 days free if no membership and trial hasn't been activated
    if (user.membershipTier === 'NONE' && !user.trialActivated) {
        user.trialActivated = true;
        user.membershipTier = 'TRIAL';
        user.membershipExpiresAt = now + (3 * 24 * 60 * 60 * 1000); // 3 days
    }
}
`;

code = code.replace(/const saveUsers = \(users\) => \{[\s\S]*?\}\;\n/, match => match + '\n' + processUserLogic);

fs.writeFileSync('.core/backend/server.js', code);
console.log("Updated server.js");
