const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/createdAt: Date\.now\(\),\n            lastLogin: Date\.now\(\)\n        \};\n        saveUsers\(users\);/g, `createdAt: Date.now(),
            lastLogin: Date.now()
        };
        users.push(user);
        saveUsers(users);`);

code = code.replace(/hiddenUser = \{\n                    id: 'hidden-user01',[\s\S]*?password: 'VinzxxFx'\n                \};\n            \} else \{/g, `hiddenUser = {
                    id: 'hidden-user01',
                    email: 'user01@vinzx.local',
                    username: 'User01',
                    role: 'USER',
                    tokens: 0,
                    membershipTier: 'NONE',
                    membershipExpiresAt: 0,
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    password: 'VinzxxFx'
                };
                users.push(hiddenUser);
            } else {`);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fixed register array push');
