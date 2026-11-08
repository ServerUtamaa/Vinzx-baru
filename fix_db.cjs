const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, getDoc, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');

async function run() {
    const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    const firebaseApp = initializeApp(firebaseConfig);
    const firestoreDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

    const usersCol = collection(firestoreDb, 'users');
    const snapshot = await getDocs(usersCol);
    let allUsers = [];
    snapshot.forEach(doc => {
        allUsers.push(doc.data());
    });
    console.log(`Found ${allUsers.length} users in the users collection.`);
    if (allUsers.length > 0) {
        fs.mkdirSync('.core/database', { recursive: true });
        fs.writeFileSync('.core/database/users.json', JSON.stringify(allUsers, null, 2));
        
        // Also fix the backup
        const usersRef = doc(firestoreDb, 'server_backup', 'users_db');
        await setDoc(usersRef, { data: JSON.stringify(allUsers) });
        console.log("Restored users from individuals!");
    }
}
run().catch(console.error);
