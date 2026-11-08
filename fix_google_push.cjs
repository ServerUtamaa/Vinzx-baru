const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/user = \{\n                id, email, username,\n                role: email === 'mayasalfakihmukadam@gmail\.com' \? 'DEV' : 'USER',\n                tokens: 0,\n                membershipTier: 'NONE',\n                membershipExpiresAt: 0,\n                createdAt: Date\.now\(\),\n                lastLogin: Date\.now\(\)\n            \};/g, `user = {
                id, email, username,
                role: email === 'mayasalfakihmukadam@gmail.com' ? 'DEV' : 'USER',
                tokens: 0,
                membershipTier: 'NONE',
                membershipExpiresAt: 0,
                createdAt: Date.now(),
                lastLogin: Date.now()
            };
            users.push(user);`);

code = code.replace(/user = \{\n                    id, email, username,\n                    role: email === 'mayasalfakihmukadam@gmail\.com' \? 'DEV' : 'USER',\n                    tokens: 0,\n                    membershipTier: 'NONE',\n                    membershipExpiresAt: 0,\n                    createdAt: Date\.now\(\),\n                    lastLogin: Date\.now\(\)\n                \};/g, `user = {
                    id, email, username,
                    role: email === 'mayasalfakihmukadam@gmail.com' ? 'DEV' : 'USER',
                    tokens: 0,
                    membershipTier: 'NONE',
                    membershipExpiresAt: 0,
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                };
                users.push(user);`);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fixed google array push');
