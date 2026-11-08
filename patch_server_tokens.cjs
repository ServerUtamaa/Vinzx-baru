const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(
  /app\.post\('\/api\/users\/:username\/tokens', async \(req, res\) => \{/,
  "app.post('/api/users/:username/tokens', verifyDev, async (req, res) => {"
);

fs.writeFileSync('.core/backend/server.js', code);
console.log('Secured /tokens endpoint!');
