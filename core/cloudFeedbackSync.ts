import { getTrueTime } from '../utils/time';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebaseConfig';
import { getDeviceId } from '../services/deviceService';

const GLOBAL_AI_DOC = 'ai_memory/global_state';

// Fire-and-forget sync function
export const syncToCloud = async (key: string, data: any) => {
    try {
        const ref = doc(db, GLOBAL_AI_DOC);
        await setDoc(ref, { [key]: data, lastUpdated: getTrueTime() }, { merge: true });
    } catch(e) {
        console.error("Failed to sync AI memory to cloud", e);
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
    } catch (e) {
        console.error("Failed to load AI memory from cloud", e);
    }
};
