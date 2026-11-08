const fs = require('fs');
let appCode = fs.readFileSync('App.tsx', 'utf8');

appCode = appCode.replace(
    /if \(res\.ok\) \{([^]*?)\} else \{\s*\/\/\s*User is in Firebase Auth but not in our users DB[^]*?localStorage\.removeItem\('CURRENT_USER_SESSION'\);\s*setUserSession\(\{[\s\S]*?\}\);\s*\}/g,
    (match, p1) => {
        return `if (res.ok) {${p1}} else if (res.status === 404) {\n                            const { getAuth, signOut } = await import('firebase/auth');\n                            signOut(auth);\n                            localStorage.removeItem('CURRENT_USER_SESSION');\n                            setUserSession({\n                                isLoggedIn: false,\n                                role: 'USER',\n                                username: 'Guest',\n                                tokens: 0,\n                                membershipTier: 'NONE',\n                                membershipExpiresAt: 0\n                            });\n                        }`;
    }
);

fs.writeFileSync('App.tsx', appCode);
console.log("Fixed App.tsx logout logic 2");
