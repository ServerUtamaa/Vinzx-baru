const fs = require('fs');
let gemini = fs.readFileSync('services/geminiService.ts', 'utf8');

gemini = gemini.replace(
    "const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.VITE_API_KEY || '' });",
    "const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });"
);

fs.writeFileSync('services/geminiService.ts', gemini);
console.log("Fixed Gemini API Key");
