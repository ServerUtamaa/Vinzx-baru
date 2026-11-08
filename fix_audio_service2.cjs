const fs = require('fs');
let audio = fs.readFileSync('services/audioService.ts', 'utf8');

audio = audio.replace(/import \{ GoogleGenAI[^\}]*\} from ["']@google\/genai["'];?/g, "");

fs.writeFileSync('services/audioService.ts', audio);
console.log("Removed GoogleGenAI import");
