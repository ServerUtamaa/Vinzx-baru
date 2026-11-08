const fs = require('fs');
let serverCode = fs.readFileSync('.core/backend/server.js', 'utf8');

const target = `    app.post('/api/auth/google', async (req, res) => {
        const { id, email, username, mode } = req.body;
        let users = loadUsers();
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
            users.push(user);
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
                users.push(user);
            } else {
                user.lastLogin = Date.now();
            }
        }
        
                if (user) {
            const now = Date.now();
            if (user.membershipTier !== 'NONE' && user.membershipExpiresAt > 0 && now > user.membershipExpiresAt) {
                user.membershipTier = 'NONE';
                user.membershipExpiresAt = 0;
            }
        }
        saveUsers(users);
        res.json({ success: true, user, serverTime: Date.now() });
    });`;

const replace = `    app.post('/api/auth/google', async (req, res) => {
        const { id, email, username, mode } = req.body;
        let users = loadUsers();
        let user = users.find(u => u.id === id);
        
        if (mode === 'LOGIN') {
            if (!user) {
                return res.status(404).json({ error: 'Akun Google belum terdaftar. Silahkan registrasi terlebih dahulu.' });
            }
            if (user.role === 'PENDING') return res.status(403).json({ error: 'Akun Anda masih dalam status menunggu persetujuan admin. Silakan hubungi admin di WhatsApp.' });
            if (user.role === 'REJECTED') return res.status(403).json({ error: 'Akun Mu Eror Harap Hubungi Admin Vinzxx🤫' });
            user.lastLogin = Date.now();
        } else if (mode === 'REGISTER') {
            if (user) {
                return res.status(400).json({ error: 'Akun Sudah Terdaftar! Silahkan langsung login.' });
            }
            user = {
                id, email, username,
                role: email === 'mayasalfakihmukadam@gmail.com' ? 'DEV' : 'PENDING',
                tokens: 0,
                membershipTier: 'NONE',
                membershipExpiresAt: 0,
                createdAt: Date.now(),
                lastLogin: Date.now()
            };
            users.push(user);
        } else {
            if (!user) {
                user = {
                    id, email, username,
                    role: email === 'mayasalfakihmukadam@gmail.com' ? 'DEV' : 'PENDING',
                    tokens: 0,
                    membershipTier: 'NONE',
                    membershipExpiresAt: 0,
                    createdAt: Date.now(),
                    lastLogin: Date.now()
                };
                users.push(user);
            } else {
                if (user.role === 'PENDING') return res.status(403).json({ error: 'Akun Anda masih dalam status menunggu persetujuan admin. Silakan hubungi admin di WhatsApp.' });
                if (user.role === 'REJECTED') return res.status(403).json({ error: 'Akun Mu Eror Harap Hubungi Admin Vinzxx🤫' });
                user.lastLogin = Date.now();
            }
        }
        
        if (user) {
            const now = Date.now();
            if (user.membershipTier !== 'NONE' && user.membershipExpiresAt > 0 && now > user.membershipExpiresAt) {
                user.membershipTier = 'NONE';
                user.membershipExpiresAt = 0;
            }
        }
        saveUsers(users);
        res.json({ success: true, user, serverTime: Date.now() });
    });`;

serverCode = serverCode.replace(target, replace);
fs.writeFileSync('.core/backend/server.js', serverCode);
console.log("Fixed server.js google auth");
