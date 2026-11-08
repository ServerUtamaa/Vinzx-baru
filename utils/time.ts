let serverTimeOffset = 0;
let lastSyncedServerTime = 0;
let performanceAtSync = 0;

// Fetch real time from server to prevent local clock manipulation
const syncTimeWithServer = async () => {
    try {
        const res = await fetch('/api/time', { headers: { 'x-auth-key': '[AUTH_KEY]:VINZX_OMEGA_2026' } });
        if (res.ok) {
            const data = await res.json();
            if (data.serverTime) {
                setServerTimeOffset(data.serverTime);
            }
        }
    } catch (e) {
        console.error("Failed to sync time with server", e);
    }
};

// Initial sync
syncTimeWithServer();

// Sync every 30 seconds to ensure the time keeps running in background accurately
setInterval(syncTimeWithServer, 30000);

// Every 10 seconds, save the highest known local time to prevent rewinding (fallback)
setInterval(() => {
    const current = Date.now();
    const stored = Number(localStorage.getItem('LAST_KNOWN_LOCAL_TIME') || 0);
    if (current > stored) {
        localStorage.setItem('LAST_KNOWN_LOCAL_TIME', current.toString());
    }
}, 10000);

export const setServerTimeOffset = (serverTime: number) => {
    if (serverTime) {
        serverTimeOffset = serverTime - Date.now();
        lastSyncedServerTime = serverTime;
        performanceAtSync = performance.now();
    }
};

export const getTrueTime = () => {
    // We use performance.now() to calculate elapsed time since last sync.
    // performance.now() is monotonic and not affected by OS clock changes.
    if (lastSyncedServerTime > 0) {
        return lastSyncedServerTime + (performance.now() - performanceAtSync);
    }

    // Fallback if not synced yet
    const now = Date.now();
    let computedTime = now + serverTimeOffset;

    // Detect offline clock manipulation (time going backwards)
    const lastKnownStr = localStorage.getItem('LAST_KNOWN_LOCAL_TIME');
    if (lastKnownStr) {
        const lastKnown = Number(lastKnownStr);
        // If current local time is more than 5 minutes BEFORE last known local time, user rewound clock!
        if (now < lastKnown - 300000) {
            // Force expiration by returning a time far in the future
            return now + 31536000000; // +1 year
        }
    }
    
    return computedTime;
};
