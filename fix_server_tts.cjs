const fs = require('fs');
let code = fs.readFileSync('.core/backend/server.js', 'utf8');

code = code.replace(/model: "gemini-2\.5-flash-preview-tts"/g, 'model: "gemini-2.0-flash"');

fs.writeFileSync('.core/backend/server.js', code);
console.log("Updated Server TTS model!");
