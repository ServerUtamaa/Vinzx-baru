import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

initializeApp({
  credential: applicationDefault(),
  projectId: config.projectId,
});

const db = getFirestore(config.firestoreDatabaseId);

db.collection('users').limit(1).get().then(() => console.log('Admin connected!'))
  .catch(e => console.error(e));
