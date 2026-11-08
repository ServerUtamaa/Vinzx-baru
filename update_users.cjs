const fs = require('fs');

let dbSvc = fs.readFileSync('services/databaseService.ts', 'utf8');

const fahmieCheck = `
    // 6. Cek User 'Fahmie'
    const fahmieIndex = users.findIndex(u => u.username === 'Fahmie');
    if (fahmieIndex === -1) {
        users.push({
            id: 'USER_FAHMIE_01',
            username: 'Fahmie',
            passwordHash: 'Membership_1mingguDiscount50%',
            role: 'USER',
            tokens: 0,
            membershipTier: 'NONE',
            membershipExpiresAt: 0,
            createdAt: Date.now(),
            lastLogin: Date.now(),
            history: []
        });
    } else {
        users[fahmieIndex].passwordHash = 'Membership_1mingguDiscount50%';
    }
`;

if (!dbSvc.includes('USER_FAHMIE_01')) {
    dbSvc = dbSvc.replace('    saveLocalUsers(users);', fahmieCheck + '\n    saveLocalUsers(users);');
    fs.writeFileSync('services/databaseService.ts', dbSvc);
    console.log("Added Fahmie user");
} else {
    console.log("Fahmie user already exists");
}
