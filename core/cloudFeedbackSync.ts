import { getTrueTime } from '../utils/time';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';

const GLOBAL_AI_DOC = 'ai_memory/global_state';

// Fire-and-forget sync function
export const syncToCloud = async (key: string, data: any) => {
    try {
        if (!auth.currentUser) return; // Only sync to cloud if authenticated
        const ref = doc(db, GLOBAL_AI_DOC);
        await setDoc(ref, { [key]: data, lastUpdated: getTrueTime() }, { merge: true });
    } catch(e: any) {
        console.warn("AI Cloud Memory sync deferred:", e?.message || e);
    }
};

export const loadFromCloud = async () => {
    try {
        const ref = doc(db, GLOBAL_AI_DOC);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            const data = snap.data();
            if (data['X12_TRADE_MEMORY']) localStorage.setItem('X12_TRADE_MEMORY', JSON.stringify(data['X12_TRADE_MEMORY']));
            if (data['X12_BLACKLIST']) localStorage.setItem('X12_BLACKLIST', JSON.stringify(data['X12_BLACKLIST']));
            if (data['X12_DIAGNOSTICS']) localStorage.setItem('X12_DIAGNOSTICS', JSON.stringify(data['X12_DIAGNOSTICS']));
            if (data['X12_REINFORCEMENT']) localStorage.setItem('X12_REINFORCEMENT', JSON.stringify(data['X12_REINFORCEMENT']));
            console.log("AI Memory successfully loaded from Quantum Cloud (1-Year Persistence).");
        }
    } catch (e: any) {
        console.warn("AI Cloud Memory fallback to local storage:", e?.message || e);
    }
};
