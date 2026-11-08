const fs = require('fs');
let code = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

code = code.replace(
    /{!\(\!userSession\.membershipTier \|\| userSession\.membershipTier === 'NONE' \|\| \(userSession\.membershipExpiresAt && userSession\.membershipExpiresAt <= getTrueTime\(\)\)\) && \(/g,
    "{userSession.membershipTier !== 'LIFETIME' && ("
);
code = code.replace(
    /\{\(!userSession\.membershipTier \|\| userSession\.membershipTier === 'NONE' \|\| \(userSession\.membershipExpiresAt && userSession\.membershipExpiresAt <= getTrueTime\(\)\)\) && \(/g,
    "{userSession.membershipTier !== 'LIFETIME' && ("
);

fs.writeFileSync('components/FloatingUI.tsx', code);
console.log("Patched FloatingUI.tsx!");
