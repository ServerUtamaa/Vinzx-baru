const fs = require('fs');
const path = require('path');

let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// Strip out firebase/firestore imports
code = code.replace(/import { initializeApp } from 'firebase\/app';\nimport { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase\/firestore';\n/g, '');
code = code.replace(/const config = JSON\.parse[\s\S]*?config\.firestoreDatabaseId\);\n/g, '');

// Restore loadUsers and saveUsers
code = code.replace(/const loadUsers = async \(\) => {[\s\S]*?return \[\];\n    };/m, 
`    const USERS_DB_PATH = path.join(process.cwd(), '.core', 'database', 'users.json');
    const loadUsers = () => {
        try {
            if (fs.existsSync(USERS_DB_PATH)) {
                return JSON.parse(fs.readFileSync(USERS_DB_PATH, 'utf8'));
            }
        } catch (e) {
            console.error('Error loading users DB', e);
        }
        return [];
    };`);

code = code.replace(/const saveSingleUser = async \(user\) => {[\s\S]*?};/m, 
`    const saveUsers = (users) => {
        try {
            const dir = path.dirname(USERS_DB_PATH);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2));
        } catch (e) {
            console.error('Error saving users DB', e);
        }
    };`);

// Replace async endpoints back to sync where possible, or just fix them to use saveUsers
code = code.replace(/let users = await loadUsers\(\);/g, "let users = loadUsers();");
code = code.replace(/const users = await loadUsers\(\);/g, "const users = loadUsers();");
code = code.replace(/await saveSingleUser\(user\);/g, "saveUsers(users);");
code = code.replace(/await saveSingleUser\(hiddenUser\);/g, "saveUsers(users);");
code = code.replace(/res\.json\(await loadUsers\(\)\);/g, "res.json(loadUsers());");

fs.writeFileSync('.core/backend/server.js', code);
console.log('Reverted server.js to use users.json');
