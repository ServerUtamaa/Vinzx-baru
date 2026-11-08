const fs = require('fs');
let dbSvc = fs.readFileSync('services/databaseService.ts', 'utf8');

if (!dbSvc.includes("doc(db, 'global_trade_history', 'admin_trades')")) {
    dbSvc = dbSvc.replace("if (uid) {", 
`if (username === 'Vinzx Family' || role === 'DEV') {
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('./firebaseConfig');
            const globalRef = doc(db, 'global_trade_history', 'admin_trades');
            const snap = await getDoc(globalRef);
            if (snap.exists() && snap.data().history) {
                firebaseHistory = snap.data().history;
            }
        } catch(e) {}
    }
    if (uid) {`);

    fs.writeFileSync('services/databaseService.ts', dbSvc);
    console.log("Global Trade History load injected!");
} else {
    // Need a different replace point for getUserData
    // Let's find getUserData
    dbSvc = dbSvc.replace("export const getUserData = async (username: string, uid?: string): Promise<{user: UserRecord, dailyBonusClaimed: boolean} | undefined> => {\n    let firebaseHistory: ExecutionRecord[] | null = null;\n        \n    if (uid) {", 
`export const getUserData = async (username: string, uid?: string): Promise<{user: UserRecord, dailyBonusClaimed: boolean} | undefined> => {
    let firebaseHistory: ExecutionRecord[] | null = null;
        
    if (username === 'Vinzx Family') {
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('./firebaseConfig');
            const globalRef = doc(db, 'global_trade_history', 'admin_trades');
            const snap = await getDoc(globalRef);
            if (snap.exists() && snap.data().history) {
                firebaseHistory = snap.data().history;
            }
        } catch(e) {}
    }

    if (uid) {`);
    fs.writeFileSync('services/databaseService.ts', dbSvc);
    console.log("Global Trade History load injected for Vinzx Family!");
}
