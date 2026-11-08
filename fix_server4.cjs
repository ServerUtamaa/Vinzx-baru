const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/import { initializeApp } from 'firebase\/app';\nimport { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase\/firestore';/, '');

code = code.replace(/const config = JSON\.parse[\s\S]*?config\.firestoreDatabaseId\);/, '');

code = code.replace(/import 'dotenv\/config';/, 
`import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const firebaseApp = initializeApp(config);
const db = getFirestore(firebaseApp, config.firestoreDatabaseId);
`);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fixed imports in server.js');
