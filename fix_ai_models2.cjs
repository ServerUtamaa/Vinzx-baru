const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

code = code.replace(
    /const modelsToTry = \[\s*'gemini-2\.0-flash',\s*'gemini-2\.0-pro-exp',\s*'gemini-1\.5-pro',\s*'gemini-1\.5-flash'\s*\];/,
    `const modelsToTry = [
            'gemini-3.6-flash',
            'gemini-3.5-flash',
            'gemini-3.1-pro-preview',
            'gemini-3.1-flash-lite',
            'gemini-2.0-flash'
        ];`
);

fs.writeFileSync('services/geminiService.ts', code);
console.log("Updated AI Models again!");
