const fs = require('fs');
let server = fs.readFileSync('.core/backend/server.js', 'utf8');

const audioEndpoint = `
    app.post('/api/generate_audio', async (req, res) => {
        try {
            const { text, voiceName } = req.body;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: { parts: [{ text: text }] },
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: voiceName },
                        },
                    },
                },
            });
            
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            res.json({ audio: base64Audio });
        } catch (error) {
            console.error("Gemini Audio API Error:", error);
            res.status(500).json({ error: error.message || "Internal Server Error" });
        }
    });

    // --- VITE MIDDLEWARE / STATIC FILES ---`;

server = server.replace("// --- VITE MIDDLEWARE / STATIC FILES ---", audioEndpoint);
fs.writeFileSync('.core/backend/server.js', server);
console.log("Added /api/generate_audio to server.js");
