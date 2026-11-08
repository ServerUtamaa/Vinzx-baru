const fs = require('fs');
let gemini = fs.readFileSync('services/geminiService.ts', 'utf8');

// We need to replace the ai.models.generateContent block with a fetch call
const oldBlock = `const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
                
                const response = await callWithRetry(() => ai.models.generateContent({
                    model: modelName,
                    contents: prompt,
                    config: {
                        systemInstruction: SYSTEM_INSTRUCTION,
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                        temperature: 0.1
                    }
                }));
                
                responseText = response.text;`;

const newBlock = `const res = await callWithRetry(() => fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        modelName,
                        prompt,
                        systemInstruction: SYSTEM_INSTRUCTION,
                        responseSchema: responseSchema
                    })
                }));
                
                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(\`API Error: \${res.status} \${errText}\`);
                }
                
                const data = await res.json();
                responseText = data.text;`;

gemini = gemini.replace(oldBlock, newBlock);

fs.writeFileSync('services/geminiService.ts', gemini);
console.log("Updated geminiService to use fetch");
