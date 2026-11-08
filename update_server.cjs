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

// Insert the helper function after saveUsedCodes
code = code.replace(/function saveUsedCodes\(data\)\s*\{[^}]*\}/, match => match + '\n' + processUserLogic);

// Call processUserLogin in /api/auth/google
code = code.replace(/(user\.lastLogin = Date\.now\(\);)(\s*\} else if \(mode === 'REGISTER'\))/, 'processUserLogin(user);\n$2');

// Also inside the else block of /api/auth/google
code = code.replace(/(user\.lastLogin = Date\.now\(\);)(\s*saveUsers\(users\);)/, 'processUserLogin(user);\n$2');

// And in /api/auth/login
code = code.replace(/(user\.lastLogin = Date\.now\(\);)(\s*saveUsers\(users\);)/, 'processUserLogin(user);\n$2');

fs.writeFileSync('.core/backend/server.js', code);
console.log("Updated server.js");
