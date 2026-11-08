import admin from 'firebase-admin';

async function test() {
    try {
        admin.initializeApp({
            projectId: 'ai-studio-vinzxtradeartifi-484a16d4-1945-4191-aebd-5c1fa0b8a0f4'
        });
        const db = admin.firestore();
        const doc = await db.collection('test').doc('test').get();
        console.log('Firebase Admin initialized and connected successfully!');
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
