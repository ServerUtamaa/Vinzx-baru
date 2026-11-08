import { Candle, Asset, TimeFrame } from '../types';

export function calculateAdaptiveRiskReward(
    entry: number, 
    sl: number, 
    tp: number, 
    timeframe?: TimeFrame
): { rr: string, valid: boolean, targetPlanRR: string } {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    
    if (risk === 0) return { rr: "0:0", valid: false, targetPlanRR: "1:2" };
    
    const ratio = reward / risk;
    const formatted = `1:${ratio.toFixed(1)}`;
    
    // Algoritma Dapur Pacu v4.0 Plan RR per Mode
    let minTarget = 2.0;
    let targetPlanRR = "1:2";
    if (timeframe === 'M1' || timeframe === 'M5') {
        minTarget = 2.0;
        targetPlanRR = "1:2";
    } else if (timeframe === 'M15') {
        minTarget = 3.0;
        targetPlanRR = "1:3";
    } else if (timeframe === 'M30') {
        minTarget = 4.0;
        targetPlanRR = "1:4";
    } else if (timeframe === 'H1') {
        minTarget = 5.0;
        targetPlanRR = "1:5";
    } else if (timeframe === 'H4' || timeframe === 'D1') {
        minTarget = 6.0;
        targetPlanRR = "1:6";
    }

    return { 
        rr: formatted, 
        valid: ratio >= (minTarget * 0.9),
        targetPlanRR 
    };
}
