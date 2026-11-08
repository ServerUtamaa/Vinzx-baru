import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function test() {
    try {
        initializeApp({
            projectId: config.projectId
        });
        const db = getFirestore(config.firestoreDatabaseId);
        await db.collection('test').doc('test').set({ hello: 'world' });
        console.log('Firebase Admin initialized and connected successfully!');
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
