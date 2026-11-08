const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// Replace local users DB logic with Firestore
code = code.replace(/const USERS_DB_PATH = [^;]+;/g, `
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const firebaseApp = initializeApp(config);
const db = getFirestore(firebaseApp, config.firestoreDatabaseId);

const USERS_DB_PATH = path.join(process.cwd(), '.core', 'database', 'users.json');
`);

code = code.replace(/const loadUsers = \(\) => {[\s\S]*?return \[\];\n    };/m, `
    const loadUsers = async () => {
        try {
            const snap = await getDocs(collection(db, 'users'));
            return snap.docs.map(d => d.data());
        } catch (e) {
            console.error('Error loading users from Firestore', e);
        }
        return [];
    };
`);

code = code.replace(/const saveUsers = \(users\) => {[\s\S]*?};/m, `
    const saveUsers = async (users) => {
        // Obsolete in Firestore model, we will use updateDoc directly
    };
    const saveSingleUser = async (user) => {
        try {
            await setDoc(doc(db, 'users', user.id), user);
        } catch(e) {
            console.error('Error saving user to Firestore', e);
        }
    };
`);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fixed server.js basic DB functions');
