const fs = require('fs');
let dbSvc = fs.readFileSync('services/databaseService.ts', 'utf8');

dbSvc = dbSvc.replace("export const addExecutionRecord = async (username: string, record: ExecutionRecord, uid?: string): Promise<ExecutionRecord[]> => {\n    // 1. Sync ke Firebase Firestore (Google Account Storage - Aman 1 tahun+)\n    if (uid) {", 
`export const addExecutionRecord = async (username: string, record: ExecutionRecord, uid?: string): Promise<ExecutionRecord[]> => {
    // 1. Sync ke Firebase Firestore (Google Account Storage - Aman 1 tahun+)
    if (uid || username === 'Vinzx Family') {
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
    }

    if (uid) {`);

fs.writeFileSync('services/databaseService.ts', dbSvc);
console.log("Fixed addExecutionRecord for global sync!");
