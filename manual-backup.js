import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
    try {
        const USERS_DB_PATH = path.join(process.cwd(), '.core', 'database', 'users.json');
        const users = JSON.parse(fs.readFileSync(USERS_DB_PATH, 'utf8'));
        const usersRef = doc(db, 'server_backup', 'users_db');
        await setDoc(usersRef, { data: JSON.stringify(users) });
        console.log('Successfully backed up manually!');
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}
test();
