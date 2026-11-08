const fs = require('fs');

let server = fs.readFileSync('.core/backend/server.js', 'utf8');

// Helper to check expiration
const expirationLogic = `
        const now = Date.now();
        if (user && user.membershipTier !== 'NONE' && user.membershipExpiresAt > 0 && now > user.membershipExpiresAt) {
            user.membershipTier = 'NONE';
            user.membershipExpiresAt = 0;
        }
`;

// Inject into /api/auth/google
server = server.replace(
    "saveUsers(users);",
    "        if (user) {\n            const now = Date.now();\n            if (user.membershipTier !== 'NONE' && user.membershipExpiresAt > 0 && now > user.membershipExpiresAt) {\n                user.membershipTier = 'NONE';\n                user.membershipExpiresAt = 0;\n            }\n        }\n        saveUsers(users);"
);

fs.writeFileSync('.core/backend/server.js', server);
console.log("Expiration logic injected");
