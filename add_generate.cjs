const fs = require('fs');
let server = fs.readFileSync('.core/backend/server.js', 'utf8');

// Add import to the top
server = server.replace(
    "import express from 'express';",
    "import express from 'express';\nimport { GoogleGenAI } from '@google/genai';"
);

// Add the endpoint
const generateEndpoint = `
    // --- GEMINI API PROXY ---
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    app.post('/api/generate', async (req, res) => {
        try {
            const { modelName, prompt, systemInstruction, responseSchema } = req.body;
            
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                    temperature: 0.1
                }
            });
            
            res.json({ text: response.text });
        } catch (error) {
            console.error("Gemini API Error:", error);
            res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    });

    // --- VITE MIDDLEWARE / STATIC FILES ---`;

server = server.replace("// --- VITE MIDDLEWARE / STATIC FILES ---", generateEndpoint);

fs.writeFileSync('.core/backend/server.js', server);
console.log("Added /api/generate to server.js");
