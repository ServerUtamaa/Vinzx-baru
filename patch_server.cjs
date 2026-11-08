const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

const originalGenerate = `    app.post('/api/generate', async (req, res) => {
        try {
            const { modelName, prompt, systemInstruction, responseSchema } = req.body;`;

const newGenerate = `    app.post('/api/generate', async (req, res) => {
        try {
            const { modelName, prompt, systemInstruction, responseSchema, username } = req.body;
            
            // ANTI-HACK: VERIFY MEMBERSHIP ON SERVER
            if (username && username !== 'Vinzx Family') {
                let users = loadUsers();
                let user = users.find(u => u.username === username || u.id === username);
                if (!user) return res.status(403).json({ error: "Unauthorized." });
                
                if (user.role !== 'DEV') {
                    const now = Date.now();
                    const isMembershipActive = user.membershipTier !== 'NONE' && ((user.membershipExpiresAt || 0) > now || user.membershipTier === 'TRIAL');
                    
                    if (!isMembershipActive) {
                        if (user.tokens > 0) {
                            user.tokens -= 1;
                            saveUsers(users); // Server deducts token authoritatively
                        } else {
                            return res.status(403).json({ error: "Anti-hack: Membership expired and no tokens left." });
                        }
                    }
                }
            }`;

code = code.replace(originalGenerate, newGenerate);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Patched server.js anti-hack logic!');
