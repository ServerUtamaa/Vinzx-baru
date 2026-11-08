const fs = require('fs');
let server = fs.readFileSync('.core/backend/server.js', 'utf8');

// Replace backupUsersToFirestore and restoreUsersFromFirestore
const oldBackup = `async function backupUsersToFirestore(users) {
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
}`;

const newBackup = `const USERS_DB_PATH = path.join(process.cwd(), '.core', 'database', 'users.json');

async function backupUsersToFirestore(users) {
    try {
        // Backup full array
        const usersRef = doc(firestoreDb, 'server_backup', 'users_db');
        await setDoc(usersRef, { data: JSON.stringify(users) });
        
        // Backup individu ke collection 'users' (persistent, tdk akan hilang sampai 50 tahun)
        for (const user of users) {
            const userDoc = doc(firestoreDb, 'users', user.id);
            await setDoc(userDoc, user);
        }
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
                const dir = path.dirname(USERS_DB_PATH);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(USERS_DB_PATH, JSON.stringify(parsed, null, 2));
                console.log("Restored users from Firestore backup!");
            }
        }
    } catch(e) {
        console.error("Restore from Firestore failed", e);
    }
}`;

server = server.replace(oldBackup, newBackup);

// Remove the old USERS_DB_PATH definition
server = server.replace("const USERS_DB_PATH = path.join(process.cwd(), '.core', 'database', 'users.json');\n", "");

fs.writeFileSync('.core/backend/server.js', server);
console.log("Updated backup script");
