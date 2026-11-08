const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const tokenReductionLogic = `
        // Token reduction logic
        const now = Date.now();
        const tier = userSession.membershipTier || 'NONE';
        const isMembershipActive = tier !== 'NONE' && (userSession.membershipExpiresAt > now || tier === 'TRIAL');
        
        if (!isMembershipActive && userSession.role !== 'DEV') {
            if (userSession.tokens > 0) {
                const newTokens = userSession.tokens - 1;
                // Update local session immediately for UI
                const updatedSession = { ...userSession, tokens: newTokens };
                setUserSession(updatedSession);
                localStorage.setItem('CURRENT_USER_SESSION', JSON.stringify(updatedSession));
                
                // Update on server
                fetch(\`/api/users/\${userSession.uid || userSession.username}/tokens\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: 1, operation: 'SUBTRACT' })
                }).catch(e => console.error('Error subtracting token:', e));
            }
        }
`;

// Insert it right after `setIsAnalyzing(true);`
code = code.replace(/setIsAnalyzing\(true\);/, match => match + '\n' + tokenReductionLogic);

fs.writeFileSync('App.tsx', code);
console.log("Updated App.tsx");
