const fs = require('fs');
let rules = fs.readFileSync('firestore.rules', 'utf8');
const backupRule = `
    match /server_backup/{docId} {
      allow read, write: if true;
    }
`;
if (!rules.includes('server_backup')) {
    rules = rules.replace('match /ai_memory', backupRule + '    match /ai_memory');
    fs.writeFileSync('firestore.rules', rules);
    console.log("Added server_backup to rules");
}
