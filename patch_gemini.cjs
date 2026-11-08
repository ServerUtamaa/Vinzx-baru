const fs = require('fs');
let code = fs.readFileSync('services/geminiService.ts', 'utf8');

code = code.replace(
  /export const analyzeMarketStructure = async \([\s\S]*?\): Promise<AnalysisResult> => \{/,
  `export const analyzeMarketStructure = async (
  asset: Asset,
  candles: Candle[],
  timeframe: TimeFrame,
  lastFeedback: TradeFeedback,
  winStreak: number = 0,
  lossStreak: number = 0,
  username: string = 'Guest'
): Promise<AnalysisResult> => {`
);

code = code.replace(
  /body: JSON\.stringify\(\{[\s\S]*?modelName,[\s\S]*?prompt,[\s\S]*?systemInstruction: SYSTEM_INSTRUCTION,[\s\S]*?responseSchema: responseSchema[\s\S]*?\}\)/,
  `body: JSON.stringify({
                        modelName,
                        prompt,
                        systemInstruction: SYSTEM_INSTRUCTION,
                        responseSchema: responseSchema,
                        username: username
                    })`
);

fs.writeFileSync('services/geminiService.ts', code);
console.log('Patched geminiService.ts');
