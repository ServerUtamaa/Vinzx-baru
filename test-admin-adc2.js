import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

async function test() {
    try {
        initializeApp({
            projectId: 'ai-studio-vinzxtradeartifi-484a16d4-1945-4191-aebd-5c1fa0b8a0f4'
        });
        const db = getFirestore();
        await db.collection('test').doc('test').set({ hello: 'world' });
        console.log('Firebase Admin initialized and connected successfully!');
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
