require('dotenv').config({path:'.env'});
const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.VITE_API_KEY });
async function run() {
  try {
      const models = await ai.models.list();
      console.log('Available models:');
      for await (const m of models) {
          if (m.name.includes('gemini')) console.log(m.name);
      }
  } catch (e) { console.log(e); }
}
run();
