const fs = require('fs');
let appCode = fs.readFileSync('App.tsx', 'utf8');

const target1 = `                        if (res.ok) {
                            const data = await res.json();
                            if (data.serverTime) setServerTimeOffset(data.serverTime);`;
                            
const replace1 = `                        if (res.ok) {
                            const data = await res.json();
                            if (data.role === 'REJECTED') {
                                setShowBannedPopup(true);
                                const { getAuth, signOut } = await import('firebase/auth');
                                signOut(auth);
                                localStorage.removeItem('CURRENT_USER_SESSION');
                                setUserSession({
                                    isLoggedIn: false,
                                    role: 'USER',
                                    username: 'Guest',
                                    tokens: 0,
                                    membershipTier: 'NONE',
                                    membershipExpiresAt: 0
                                });
                                return;
                            }
                            if (data.serverTime) setServerTimeOffset(data.serverTime);`;

appCode = appCode.replace(target1, replace1);

const target2 = `                            if (res.ok) {
                                const data = await res.json();
                                if (data.serverTime) setServerTimeOffset(data.serverTime);`;
                                
const replace2 = `                            if (res.ok) {
                                const data = await res.json();
                                if (data.role === 'REJECTED') {
                                    setShowBannedPopup(true);
                                    localStorage.removeItem('CURRENT_USER_SESSION');
                                    setUserSession({
                                        isLoggedIn: false,
                                        role: 'USER',
                                        username: 'Guest',
                                        tokens: 0,
                                        membershipTier: 'NONE',
                                        membershipExpiresAt: 0
                                    });
                                    return;
                                }
                                if (data.serverTime) setServerTimeOffset(data.serverTime);`;

appCode = appCode.replace(target2, replace2);

fs.writeFileSync('App.tsx', appCode);
console.log("Fixed App.tsx banned listener");
