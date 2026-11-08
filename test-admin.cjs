const admin = require('firebase-admin');
const config = require('./firebase-applet-config.json');

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: config.projectId,
});

const db = admin.firestore();
db.settings({ databaseId: config.firestoreDatabaseId });

db.collection('users').limit(1).get().then(() => console.log('Admin connected!'))
  .catch(e => console.error(e));
