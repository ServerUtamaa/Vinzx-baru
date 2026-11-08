const fs = require('fs');
let appCode = fs.readFileSync('App.tsx', 'utf8');

const target1 = `                            if (data.role === 'REJECTED') {`;
const replace1 = `                            if (data.role === 'PENDING') {
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
                            if (data.role === 'REJECTED') {`;

appCode = appCode.replace(target1, replace1);

const target2 = `                                if (data.role === 'REJECTED') {`;
const replace2 = `                                if (data.role === 'PENDING') {
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
                                if (data.role === 'REJECTED') {`;

appCode = appCode.replace(target2, replace2);

fs.writeFileSync('App.tsx', appCode);
console.log("Fixed App.tsx pending listener");
