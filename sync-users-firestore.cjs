const fs = require('fs');

let server = fs.readFileSync('.core/backend/server.js', 'utf8');

// We will inject the firebase client setup at the top
const firebaseSetup = `
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function backupUsersToFirestore(users) {
    try {
        const usersRef = doc(firestoreDb, 'server_backup', 'users_db');
        await setDoc(usersRef, { data: JSON.stringify(users) });
    } catch(e) {
        console.error("Backup to Firestore failed", e);
    }
}

async function restoreUsersFromFirestore() {
    try {
        const usersRef = doc(firestoreDb, 'server_backup', 'users_db');
        const snap = await getDoc(usersRef);
        if (snap.exists() && snap.data().data) {
            const parsed = JSON.parse(snap.data().data);
            if (Array.isArray(parsed) && parsed.length > 0) {
                fs.writeFileSync(USERS_DB_PATH, JSON.stringify(parsed, null, 2));
                console.log("Restored users from Firestore backup!");
            }
        }
    } catch(e) {
        console.error("Restore from Firestore failed", e);
    }
}
`;

// Prepend setup
server = server.replace("import fs from 'fs';", "import fs from 'fs';\n" + firebaseSetup);

// Inject restore at startup
server = server.replace("const loadUsers = () => {", "restoreUsersFromFirestore();\n    const loadUsers = () => {");

// Inject backup at save
server = server.replace("        const saveUsers = (users) => {", "        const saveUsers = (users) => {\n        backupUsersToFirestore(users);");

fs.writeFileSync('.core/backend/server.js', server);
console.log("Firestore sync injected into server");
