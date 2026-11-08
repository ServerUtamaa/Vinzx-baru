const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// Strip all inline imports
code = code.replace(/import { initializeApp } from 'firebase\/app';/g, '');
code = code.replace(/import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase\/firestore';/g, '');

// Re-add top-level imports
code = code.replace(/import 'dotenv\/config';/, 
`import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
`);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fixed ALL imports in server.js');
