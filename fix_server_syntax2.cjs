const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

// Instead of regex hacking, I'll just find and remove the blocks.
// Let's just output the whole file and fix it.
