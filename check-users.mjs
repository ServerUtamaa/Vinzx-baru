import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);
async function run() {
  const usersRef = doc(db, 'server_backup', 'users_db');
  const snap = await getDoc(usersRef);
  if (snap.exists() && snap.data().data) {
      console.log("Users found in Firestore!");
      const parsed = JSON.parse(snap.data().data);
      console.log("Count:", parsed.length);
  } else {
      console.log("No users found in Firestore!");
  }
  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
