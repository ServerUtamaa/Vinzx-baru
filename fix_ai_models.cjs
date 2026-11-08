const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

code = code.replace(
    /const modelsToTry = \[\s*'gemini-3\.1-pro-preview',\s*'gemini-3\.5-flash',\s*'gemini-2\.5-pro',\s*'gemini-2\.5-flash'\s*\];/,
    `const modelsToTry = [
            'gemini-2.0-flash',
            'gemini-2.0-pro-exp',
            'gemini-1.5-pro',
            'gemini-1.5-flash'
        ];`
);

fs.writeFileSync('services/geminiService.ts', code);
console.log("Updated AI Models!");
