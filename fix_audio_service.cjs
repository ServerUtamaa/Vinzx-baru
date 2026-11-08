const fs = require('fs');
let audio = fs.readFileSync('services/audioService.ts', 'utf8');

// Remove import { GoogleGenAI, Modality } from "@google/genai";
audio = audio.replace("import { GoogleGenAI, Modality } from '@google/genai';", "");
// Remove const ai = new GoogleGenAI...
audio = audio.replace("const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });", "");

const oldGenerate = `const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: { parts: [{ text: cleanText }] },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName },
                        },
                    },
                },
            });

            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;`;

const newGenerate = `const res = await fetch('/api/generate_audio', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: cleanText, voiceName })
            });
            
            if (!res.ok) {
                throw new Error(\`API Error: \${res.status}\`);
            }
            
            const data = await res.json();
            const base64Audio = data.audio;`;

audio = audio.replace(oldGenerate, newGenerate);

fs.writeFileSync('services/audioService.ts', audio);
console.log("Fixed audioService to use fetch");
