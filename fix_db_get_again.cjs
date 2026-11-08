const fs = require('fs');
let dbSvc = fs.readFileSync('services/databaseService.ts', 'utf8');

const badBlock = `    if (uid || username === 'Vinzx Family') {
        try {
            const { doc, getDoc, updateDoc, setDoc } = await import('firebase/firestore');
            const { db } = await import('./firebaseConfig');
            
            // Sync to Global Trade History for AI Training (1 Year Persistence)
            const globalRef = doc(db, 'global_trade_history', 'admin_trades');
            const globalSnap = await getDoc(globalRef);
            if (globalSnap.exists()) {
                const existing = globalSnap.data().history || [];
                existing.unshift(record);
                if (existing.length > 5000) existing.pop(); // Keep manageable size
                await updateDoc(globalRef, { history: existing });
            } else {
                await setDoc(globalRef, { history: [record] }, { merge: true });
            }
        } catch(e) {
            console.error("Global history sync failed", e);
        }
    }`;

const goodBlock = `    if (username === 'Vinzx Family') {
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('./firebaseConfig');
            const globalRef = doc(db, 'global_trade_history', 'admin_trades');
            const snap = await getDoc(globalRef);
            if (snap.exists() && snap.data().history) {
                firebaseHistory = snap.data().history;
            }
        } catch(e) {}
    }`;

dbSvc = dbSvc.replace(badBlock, goodBlock);

fs.writeFileSync('services/databaseService.ts', dbSvc);
console.log("Fixed getUserData!");
