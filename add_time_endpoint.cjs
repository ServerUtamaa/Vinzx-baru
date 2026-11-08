const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

const timeEndpoint = `
    app.get('/api/time', (req, res) => {
        res.json({ serverTime: Date.now() });
    });
`;

code = code.replace("app.get('/api/yahoo'", timeEndpoint + "\n    app.get('/api/yahoo'");
fs.writeFileSync('.core/backend/server.js', code);
console.log("Added /api/time");
