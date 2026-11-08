const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/app\.post\('\/api\/auth\/google', \(req, res\) => {/g, "app.post('/api/auth/google', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/auth\/register', \(req, res\) => {/g, "app.post('/api/auth/register', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/auth\/login', \(req, res\) => {/g, "app.post('/api/auth/login', async (req, res) => {");
code = code.replace(/app\.get\('\/api\/users\/me\/:identifier', \(req, res\) => {/g, "app.get('/api/users/me/:identifier', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/users\/:username\/membership', \(req, res\) => {/g, "app.post('/api/users/:username/membership', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/users\/:username\/tokens', \(req, res\) => {/g, "app.post('/api/users/:username/tokens', async (req, res) => {");
code = code.replace(/app\.post\('\/api\/users\/:username\/history', \(req, res\) => {/g, "app.post('/api/users/:username/history', async (req, res) => {");
code = code.replace(/app\.get\('\/api\/dev\/users', verifyDev, \(req, res\) => {/g, "app.get('/api/dev/users', verifyDev, async (req, res) => {");
code = code.replace(/app\.post\('\/api\/dev\/users\/:id\/accept', verifyDev, \(req, res\) => {/g, "app.post('/api/dev/users/:id/accept', verifyDev, async (req, res) => {");
code = code.replace(/app\.post\('\/api\/dev\/users\/:id\/reject', verifyDev, \(req, res\) => {/g, "app.post('/api/dev/users/:id/reject', verifyDev, async (req, res) => {");
code = code.replace(/app\.post\('\/api\/dev\/users\/:id\/membership', verifyDev, \(req, res\) => {/g, "app.post('/api/dev/users/:id/membership', verifyDev, async (req, res) => {");

code = code.replace(/let users = loadUsers\(\);/g, "let users = await loadUsers();");
code = code.replace(/const users = loadUsers\(\);/g, "const users = await loadUsers();");
code = code.replace(/saveUsers\(users\);/g, "await saveSingleUser(user);"); // Some places we need to be careful

fs.writeFileSync('.core/backend/server2.js', code);
console.log('Fixed endpoints');
