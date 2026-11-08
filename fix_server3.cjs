const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// Use Firestore Client SDK
code = code.replace(/import 'dotenv\/config';/, `import 'dotenv/config';\nimport { initializeApp } from 'firebase/app';\nimport { getFirestore, collection, getDocs, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';\n`);

code = code.replace(/const USERS_DB_PATH = path\.join[\s\S]*?console\.error\('Error saving users DB', e\);\n        }\n    };/m, `
    const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
    const firebaseApp = initializeApp(config);
    const db = getFirestore(firebaseApp, config.firestoreDatabaseId);

    const loadUsers = async () => {
        try {
            const snap = await getDocs(collection(db, 'users'));
            return snap.docs.map(d => d.data());
        } catch (e) {
            console.error('Error loading users from Firestore', e);
        }
        return [];
    };

    const saveSingleUser = async (user) => {
        try {
            if (!user.id) user.id = user.username;
            await setDoc(doc(db, 'users', user.id), user, { merge: true });
        } catch(e) {
            console.error('Error saving user to Firestore', e);
        }
    };
`);

// Now replace synchronous endpoints with async
code = code.replace(/app\.post\('\/api\/auth\/google', \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, user \}\);\n    \}\);/, 
`app.post('/api/auth/google', async (req, res) => {
        const { id, email, username, mode } = req.body;
        let users = await loadUsers();
        let user = users.find(u => u.id === id);
        
        if (mode === 'LOGIN') {
            if (!user) {
                return res.status(404).json({ error: 'Akun Google belum terdaftar. Silahkan registrasi terlebih dahulu.' });
            }
            user.lastLogin = Date.now();
        } else if (mode === 'REGISTER') {
            if (user) {
                return res.status(400).json({ error: 'Akun Sudah Terdaftar! Silahkan langsung login.' });
            }
            user = {
                id, email, username,
                role: email === 'mayasalfakihmukadam@gmail.com' ? 'DEV' : 'USER',
                tokens: 0,
                membershipTier: 'NONE',
                membershipExpiresAt: 0,
                createdAt: Date.now(),
                lastLogin: Date.now()
            };
        } else {
            if (!user) {
                user = {
                    id, email, username,
                    role: email === 'mayasalfakihmukadam@gmail.com' ? 'DEV' : 'USER',
                    tokens: 0,
                    membershipTier: 'NONE',
                    membershipExpiresAt: 0,
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                };
            } else {
                user.lastLogin = Date.now();
            }
        }
        
        await saveSingleUser(user);
        res.json({ success: true, user });
    });`);

code = code.replace(/app\.post\('\/api\/auth\/register', \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, user \}\);\n    \}\);/,
`app.post('/api/auth/register', async (req, res) => {
        const { username, password } = req.body;
        let users = await loadUsers();
        let user = users.find(u => u.username === username);
        
        if (user) {
            if (user.role === 'REJECTED') {
                return res.status(403).json({ error: 'Akun Mu Eror Harap Hubungi Admin Vinzxx🤫' });
            }
            return res.status(400).json({ error: 'Username sudah digunakan, silakan pilih yang lain.' });
        }
        
        user = {
            id: \`usr_\${Date.now()}_\${Math.random().toString(36).substr(2, 9)}\`,
            username, 
            password,
            role: 'PENDING',
            tokens: 0,
            membershipTier: 'NONE',
            membershipExpiresAt: 0,
            createdAt: Date.now(),
            lastLogin: Date.now()
        };
        await saveSingleUser(user);
        res.json({ success: true, user });
    });`);

code = code.replace(/app\.post\('\/api\/auth\/login', \(req, res\) => \{[\s\S]*?res\.json\(\{ success: true, user \}\);\n    \}\);/,
`app.post('/api/auth/login', async (req, res) => {
        const { username, password } = req.body;
        let users = await loadUsers();
        
        if (username === 'User01' && password === 'VinzxxFx') {
            let hiddenUser = users.find(u => u.username === 'User01');
            if (!hiddenUser) {
                hiddenUser = {
                    id: 'hidden-user01',
                    email: 'user01@vinzx.local',
                    username: 'User01',
                    role: 'USER',
                    tokens: 0,
                    membershipTier: 'NONE',
                    membershipExpiresAt: 0,
                    createdAt: Date.now(),
                    lastLogin: Date.now(),
                    password: 'VinzxxFx'
                };
            } else {
                if (hiddenUser.role === 'DEV') {
                    hiddenUser.role = 'USER';
                    hiddenUser.tokens = 0;
                    hiddenUser.membershipTier = 'NONE';
                    hiddenUser.membershipExpiresAt = 0;
                }
                hiddenUser.lastLogin = Date.now();
            }
            await saveSingleUser(hiddenUser);
            return res.json({ success: true, user: hiddenUser });
        }
        
        let user = users.find(u => u.username === username && u.password === password);
        
        if (!user) {
            const rejectedUser = users.find(u => u.username === username && u.role === 'REJECTED');
            if (rejectedUser) {
                return res.status(403).json({ error: 'Akun Mu Eror Harap Hubungi Admin Vinzxx🤫' });
            }
            return res.status(401).json({ error: 'Username atau Password salah.' });
        }

        if (user.role === 'REJECTED') {
            return res.status(403).json({ error: 'Akun Mu Eror Harap Hubungi Admin Vinzxx🤫' });
        }

        if (user.role === 'PENDING') {
            return res.status(403).json({ error: 'Akun Anda masih dalam status menunggu persetujuan admin. Silakan hubungi admin di WhatsApp.' });
        }
        
        user.lastLogin = Date.now();
        await saveSingleUser(user);
        res.json({ success: true, user });
    });`);

code = code.replace(/app\.get\('\/api\/users\/me\/:identifier', \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'Not found' \}\);\n        \}\n    \}\);/,
`app.get('/api/users/me/:identifier', async (req, res) => {
        const users = await loadUsers();
        const user = users.find(u => u.username === req.params.identifier || u.id === req.params.identifier);
        if (user) {
            const now = Date.now();
            if (user.membershipTier !== 'NONE' && user.membershipExpiresAt > 0 && now > user.membershipExpiresAt) {
                user.membershipTier = 'NONE';
                user.membershipExpiresAt = 0;
                await saveSingleUser(user);
            }
            res.json(user);
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    });`);

code = code.replace(/app\.post\('\/api\/users\/:username\/membership', \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'User not found' \}\);\n        \}\n    \}\);/,
`app.post('/api/users/:username/membership', async (req, res) => {
        const { tier, durationDays } = req.body;
        const users = await loadUsers();
        const user = users.find(u => u.username === req.params.username || u.id === req.params.username);
        
        if (user) {
            const now = Date.now();
            const ms = durationDays * 24 * 60 * 60 * 1000;
            let currentExp = Number(user.membershipExpiresAt) || 0;
            if (tier === 'NONE') {
                user.membershipTier = 'NONE';
                user.membershipExpiresAt = 0;
            } else {
                 const newExp = (currentExp > now) ? currentExp + ms : now + ms;
                 user.membershipTier = tier;
                 user.membershipExpiresAt = newExp;
            }
            await saveSingleUser(user);
            res.json({ success: true, user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });`);

code = code.replace(/app\.post\('\/api\/users\/:username\/tokens', \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'User not found' \}\);\n        \}\n    \}\);/,
`app.post('/api/users/:username/tokens', async (req, res) => {
        const { amount, operation } = req.body;
        const users = await loadUsers();
        const user = users.find(u => u.username === req.params.username);
        
        if (user) {
            let current = Number(user.tokens || 0);
            if (operation === 'ADD') current += amount;
            if (operation === 'SUBTRACT') current = Math.max(0, current - amount);
            if (operation === 'SET') current = amount;
            user.tokens = current;
            await saveSingleUser(user);
            res.json({ success: true, tokens: current });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });`);

code = code.replace(/app\.post\('\/api\/users\/:username\/history', \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'User not found' \}\);\n        \}\n    \}\);/,
`app.post('/api/users/:username/history', async (req, res) => {
        const record = req.body.record;
        const users = await loadUsers();
        const user = users.find(u => u.username === req.params.username);
        
        if (user) {
            if (!user.history) user.history = [];
            user.history.unshift(record);
            await saveSingleUser(user);
            res.json({ success: true, history: user.history });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });`);

code = code.replace(/app\.get\('\/api\/dev\/users', verifyDev, \(req, res\) => \{[\s\S]*?res\.json\(loadUsers\(\)\);\n    \}\);/,
`app.get('/api/dev/users', verifyDev, async (req, res) => {
        res.json(await loadUsers());
    });`);

code = code.replace(/app\.post\('\/api\/dev\/users\/:id\/accept', verifyDev, \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'User not found' \}\);\n        \}\n    \}\);/,
`app.post('/api/dev/users/:id/accept', verifyDev, async (req, res) => {
        const users = await loadUsers();
        const user = users.find(u => u.id === req.params.id || u.username === req.params.id);
        if (user) {
            user.role = 'USER';
            await saveSingleUser(user);
            res.json({ success: true, user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });`);

code = code.replace(/app\.post\('\/api\/dev\/users\/:id\/reject', verifyDev, \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'User not found' \}\);\n        \}\n    \}\);/,
`app.post('/api/dev/users/:id/reject', verifyDev, async (req, res) => {
        const users = await loadUsers();
        const user = users.find(u => u.id === req.params.id || u.username === req.params.id);
        if (user) {
            user.role = 'REJECTED';
            await saveSingleUser(user);
            res.json({ success: true, user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });`);

code = code.replace(/app\.post\('\/api\/dev\/users\/:id\/membership', verifyDev, \(req, res\) => \{[\s\S]*?res\.status\(404\)\.json\(\{ error: 'User not found' \}\);\n        \}\n    \}\);/,
`app.post('/api/dev/users/:id/membership', verifyDev, async (req, res) => {
        const { durationDays } = req.body;
        const users = await loadUsers();
        const user = users.find(u => u.id === req.params.id || u.username === req.params.id);
        
        if (user) {
            const ms = durationDays * 24 * 60 * 60 * 1000;
            const now = Date.now();
            let currentExp = user.membershipExpiresAt || 0;
            
            user.membershipTier = durationDays >= 30 ? 'MONTHLY' : (durationDays >= 14 ? 'BIWEEKLY' : 'WEEKLY');
            user.membershipExpiresAt = (currentExp > now ? currentExp : now) + ms;
            
            await saveSingleUser(user);
            res.json({ success: true, user });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    });`);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Fully upgraded to Firestore Client SDK in server.js');
