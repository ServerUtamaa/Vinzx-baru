import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const cred = await signInAnonymously(auth);
  console.log('Signed in as', cred.user.uid);
  try {
      await setDoc(doc(db, 'users', 'test'), { hello: 'world' });
      console.log('Write successful!');
  } catch(e) {
      console.log('Write failed:', e.message);
  }
  process.exit(0);
}
run().catch(console.error);
