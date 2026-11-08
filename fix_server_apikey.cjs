const fs = require('fs');
let server = fs.readFileSync('.core/backend/server.js', 'utf8');

server = server.replace(
    "const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });",
    "const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.VITE_API_KEY || '' });"
);

fs.writeFileSync('.core/backend/server.js', server);
console.log("Fixed Server API Key fallback");
