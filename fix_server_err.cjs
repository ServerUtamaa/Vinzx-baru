const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/console\.error\('Error saving user to Firestore', e\);/g, "console.error('Error saving user to Firestore', e); throw e;");
code = code.replace(/console\.error\('Error loading users from Firestore', e\);/g, "console.error('Error loading users from Firestore', e); throw e;");

fs.writeFileSync('.core/backend/server.js', code);
