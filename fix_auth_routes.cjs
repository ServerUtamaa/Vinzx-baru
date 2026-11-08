const fs = require('fs');
let code = fs.readFileSync('.core/backend/routes/auth.js', 'utf8');

if (!code.includes('3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b')) {
    code = code.replace(/const SECURE_VAULT = \{/, 
`const SECURE_VAULT = {
    "3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b": { tier: "MONTHLY", duration: 30 * 24 * 60 * 60 * 1000 },
    "VINZX-WEEK": { tier: "WEEKLY", duration: 7 * 24 * 60 * 60 * 1000 },
    "VINZX-BIWEEK": { tier: "BIWEEKLY", duration: 14 * 24 * 60 * 60 * 1000 },
    "VINZX-MONTH": { tier: "MONTHLY", duration: 30 * 24 * 60 * 60 * 1000 },
`);
    fs.writeFileSync('.core/backend/routes/auth.js', code);
    console.log('Added new codes to auth.js vault');
}
