import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
    try {
        const usersRef = doc(db, 'server_backup', 'users_db');
        const snap = await getDoc(usersRef);
        console.log('Snap exists?', snap.exists());
        if (snap.exists()) {
            console.log('Data:', snap.data().data.slice(0, 100));
        }
    } catch (e) {
        console.error('Error:', e);
    }
    process.exit(0);
}
test();
