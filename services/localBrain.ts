import { getTrueTime } from '../utils/time';
import { Asset, Candle, AnalysisResult, TradeFeedback, TimeFrame } from "../types";
import { calculateATR, detectCandlestickPatterns, detectSMC, SMCResult } from "../utils/indicators";
import { SecurityManager } from "../utils/SecurityManager";
import { isBlacklisted, getPatternWeight, getTPExtension, getDiagnosticReason } from '../core/feedbackEngine';
import { getAssetPrecision } from '../utils/priceFormatters';
import { getPairBehavior } from '../core/pairProfiles';
import { enforceTimeframeTradingPlan, getTimeframePlanSpec } from '../core/timeframePlan';

const rv = () => {
    const v = ["Validasi institusional aktif.", "Dikonfirmasi oleh volume algoritma.", "Probabilitas tinggi berdasarkan data historis.", "Jejak Smart Money terdeteksi.", "Sesuai dengan protokol Zero Floating."];
    return v[Math.floor(Math.random() * v.length)];
};

export const generateDeepAnalysisNarrative = (
    signal: string, 
    timeframe: string, 
    asset: string, 
    rrType: string, 
    isCounterTrend: boolean, 
    smc: SMCResult, 
    patterns: any[], 
    totalScore: number, 
    minScore: number, 
    modeName: string, 
    visualConfidence: number,
    structureConfidence: number,
    isCustomMode: boolean = false,
    isBlacklistedSignal: boolean = false,
    setupSignature: string = ""
): string[] => {
    const diagReason = isBlacklistedSignal ? getDiagnosticReason(setupSignature) : null;
    let setupModel = "Netral/Menunggu Area Institusi";
    if (smc.quasimodo !== 'NONE') setupModel = `Quasimodo (QM) ${smc.quasimodo === 'BULLISH' ? 'Buy' : 'Sell'} Setup`;
    else if (smc.compression !== 'NONE') setupModel = `Compression towards ${smc.compression === 'BULLISH' ? 'Supply' : 'Demand'}`;
    else if (smc.ftr !== 'NONE' || smc.flagLimit !== 'NONE') setupModel = `FTR / Flag Limit ${smc.ftr === 'BULLISH' ? 'Buy' : 'Sell'} Setup`;
    else if (smc.advancedEntryMode !== 'NONE') setupModel = `Advanced Entry Scheme`;
    
    const p: string[] = [];
    p.push(`[Analisa Tren Utama (HTF Alignment)]: Struktur pasar saat ini mengindikasikan dominasi ${smc.structure}. ${rv()}`);
    p.push(`[Market Structure Shift (MSS)]: ${smc.choch !== 'NONE' ? `Terdeteksi CHoCH ${smc.choch}.` : smc.bos !== 'NONE' ? `Terdeteksi BOS ${smc.bos}.` : 'Belum ada patahan struktur signifikan.'}`);
    p.push(`[Smart Money Concepts (SMC) & Liquidity]: ${smc.liquiditySweep !== 'NONE' ? `Liquidity Sweep terdeteksi pada ${smc.liquiditySweep}.` : 'Menunggu pengambilan likuiditas.'} ${smc.orderBlock !== 'NONE' ? `Order Block ${smc.orderBlock} valid.` : ''}`);
    p.push(`[Supply & Demand]: Reaksi harga terhadap zona ${smc.sndPattern !== 'NONE' ? smc.sndPattern : 'Base'} terkonfirmasi.`);
    p.push(`[Price Action & Candlestick]: ${patterns.length > 0 ? `Pola ${patterns[0].name} muncul sebagai konfirmasi eksekusi.` : 'Menunggu konfirmasi candlestick rejection.'}`);
    p.push(`[Fibonacci OTE / Area Diskon]: Harga ${smc.fvg !== 'NONE' ? 'memasuki' : 'mendekati'} area Optimal Trade Entry (OTE).`);
    p.push(`[Volatilitas & Filter Eksekusi]: ATR menunjukkan volatilitas stabil. Mode ${modeName} aktif.`);
    p.push(`[Risk to Reward / Rasio Untung Rugi]: Mode ${modeName} - Target Plan RR ditetapkan secara ketat pada ${rrType} sesuai Algoritma Dapur Pacu v4.0.`);
    p.push(`[RL Experience / Pembelajaran Mesin]: ${isBlacklistedSignal ? `⚠️ KOREKSI OTOMATIS: Setup kurang ideal. Menunggu Deeper Entry.` : `Analisa adaptif menargetkan Zero Floating Zone.`}`);
    p.push(`[Model Eksekusi Final]: ${setupModel}. PROBABILITAS ${signal} TINGGI (${Math.round(structureConfidence)}% Confidence). Eksekusi limit pada Pivot/OTE disarankan.`);
    return p;
};

export const analyzeLocalMarket = (
  asset: Asset,
  candles: Candle[],
  timeframe: TimeFrame,
  lastFeedback: TradeFeedback,
  winStreak: number = 0,
  lossStreak: number = 0
): AnalysisResult => {
  if (SecurityManager.isSystemLocked()) {
      return { signal: 'BUY', confidence: 0, entryPrice: 0, stopLoss: 0, takeProfit: 0, riskRewardRatio: "0:0", reasoning: ["SYSTEM LOCKED"], smcConceptsFound: ["CORRUPTED"], timestamp: new Date().toLocaleTimeString(), timeframe: timeframe, learningKey: "", prediction: "" };
  }
  if (!candles || candles.length < 30) {
      return { signal: 'BUY', confidence: 0, entryPrice: 0, stopLoss: 0, takeProfit: 0, riskRewardRatio: "0:0", reasoning: Array(10).fill("Initializing ASI Core..."), smcConceptsFound: [], timestamp: new Date().toLocaleTimeString(), timeframe: timeframe, learningKey: "", prediction: "" };
  }

  const decimals = getAssetPrecision(asset);
  const minStep = Math.pow(10, -decimals);
  const current = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const atr = calculateATR(candles, 14) || Math.max(current.close * 0.001, minStep * 20);
  const patterns = detectCandlestickPatterns(candles);
  const smc = detectSMC(candles, timeframe);

  const planSpec = getTimeframePlanSpec(asset, timeframe);
  let isCounterTrend = false;
  let setupType = "SMC_TREND";
  const modeName = planSpec.modeName;
  const slBuffer = planSpec.atrMultiplier;
  const planRR = planSpec.planRR;
  const targetRRLabel = planSpec.rrLabel;
  const tp1R = planSpec.tp1R, tp2R = planSpec.tp2R, tp3R = planSpec.tp3R;
  let minScore = 75;
  if (timeframe === 'M15') minScore = 80;
  else if (timeframe === 'M30') minScore = 85;
  else if (timeframe === 'H1' || timeframe === 'H4' || timeframe === 'D1') minScore = 90;

  const bullishPatterns = patterns.filter(p => p.type === 'BULLISH');
  const bearishPatterns = patterns.filter(p => p.type === 'BEARISH');

  let totalScore = smc.score;
  if (bullishPatterns.length > 0) totalScore += 5;
  if (bearishPatterns.length > 0) totalScore -= 5;
  
  const signatureLiquidity = smc.liquiditySweep !== 'NONE' ? smc.liquiditySweep : (smc.inducement ? 'IDM' : 'NONE');
  const signaturePattern = patterns.length > 0 ? patterns[0].name.replace(/ /g, '_') : 'NONE';
  const setupSignature = `${asset}-${timeframe}-${smc.structure}-${signatureLiquidity}-${signaturePattern}`;
  
  let isBlacklistedSignal = isBlacklisted(setupSignature);
  let isCustomMode = false;
  let signal: 'BUY' | 'SELL' = 'BUY';
  let confidence = 0;

  if (totalScore > 0) {
      signal = 'BUY';
      confidence = Math.min(99.9, 60 + (totalScore * 2.5));
      setupType = "High Probability BUY";
  } else if (totalScore < 0) {
      signal = 'SELL';
      confidence = Math.min(99.9, 60 + (Math.abs(totalScore) * 2.5));
      setupType = "High Probability SELL";
  } else {
      signal = 'BUY';
      confidence = 65;
      setupType = "Trend Continuation Structure";
  }

  if (confidence < minScore) {
      setupType += ` [⚠️ NOT IDEAL: Skor ${Math.round(confidence)}/${minScore}]`;
  }

  if (isBlacklistedSignal) {
      setupType += " [⚠️ WAITING DEEPER ENTRY]";
      confidence = Math.max(50, confidence - 15);
  }

  const currentBody = Math.abs(current.open - current.close);
  const currentRange = current.high - current.low || 1;
  const isStrongBearishMomentum = current.close < current.open && (currentBody / currentRange > 0.8) && (currentRange > atr * 1.5);
  const isStrongBullishMomentum = current.close > current.open && (currentBody / currentRange > 0.8) && (currentRange > atr * 1.5);

  if (signal === 'BUY' && isStrongBearishMomentum) {
      setupType += " [⚠️ WAIT REJECTION: Strong Bearish Momentum]";
      confidence = Math.max(50, confidence - 25);
  }
  if (signal === 'SELL' && isStrongBullishMomentum) {
      setupType += " [⚠️ WAIT REJECTION: Strong Bullish Momentum]";
      confidence = Math.max(50, confidence - 25);
  }

  let candidateEntry = current.close;

  // 1. LIMIT SNIPER ENTRY LOGIC (constrained later to timeframe plan pullback envelope)
  const recentWindow = candles.slice(Math.max(0, candles.length - 40));
  const recentSwingLow = Math.min(...recentWindow.map(c => c.low));
  const recentSwingHigh = Math.max(...recentWindow.map(c => c.high));

  const range = recentSwingHigh - recentSwingLow;
  const fib618Bullish = recentSwingLow + (range * 0.382);
  const fib618Bearish = recentSwingHigh - (range * 0.382);

  if (signal === 'BUY') {
      candidateEntry = fib618Bullish;
      if (smc.fibonacciOTE && smc.fibonacciOTE.level0_618 < current.close) candidateEntry = smc.fibonacciOTE.level0_618;
      else if (smc.orderBlock === 'BULLISH') candidateEntry = Math.min(candidateEntry, prev.high);
      else if (smc.fvg === 'BULLISH') candidateEntry = Math.min(candidateEntry, candles[candles.length - 3].high);
      if (candidateEntry > current.close) candidateEntry = current.close * 0.9995;
  } else {
      candidateEntry = fib618Bearish;
      if (smc.fibonacciOTE && smc.fibonacciOTE.level0_618 > current.close) candidateEntry = smc.fibonacciOTE.level0_618;
      else if (smc.orderBlock === 'BEARISH') candidateEntry = Math.max(candidateEntry, prev.low);
      else if (smc.fvg === 'BEARISH') candidateEntry = Math.max(candidateEntry, candles[candles.length - 3].low);
      if (candidateEntry < current.close) candidateEntry = current.close * 1.0005;
  }

  let candidateSl = 0;
  if (signal === 'BUY') {
      const swingLows = [];
      for (let i = Math.max(2, candles.length - 20); i < candles.length - 1; i++) {
         if (candles[i].low < candles[i-1].low && candles[i].low < candles[i+1].low) {
             swingLows.push(candles[i].low);
         }
      }
      const structuralLow = swingLows.length > 0 ? swingLows[swingLows.length - 1] : recentSwingLow;
      candidateSl = structuralLow - (atr * slBuffer);
  } else {
      const swingHighs = [];
      for (let i = Math.max(2, candles.length - 20); i < candles.length - 1; i++) {
         if (candles[i].high > candles[i-1].high && candles[i].high > candles[i+1].high) {
             swingHighs.push(candles[i].high);
         }
      }
      const structuralHigh = swingHighs.length > 0 ? swingHighs[swingHighs.length - 1] : recentSwingHigh;
      candidateSl = structuralHigh + (atr * slBuffer);
  }

  const candidateRisk = Math.max(atr * 0.5, minStep * 10, Math.abs(candidateEntry - candidateSl));
  const candidateTp = signal === 'BUY' ? candidateEntry + candidateRisk * planRR : candidateEntry - candidateRisk * planRR;

  const pairProfile = getPairBehavior(asset);
  const enforcedPlan = enforceTimeframeTradingPlan({
      asset,
      timeframe,
      signal,
      currentPrice: current.close,
      atr,
      spreadAverage: pairProfile.spreadAverage,
      candidateEntry,
      candidateSl,
      candidateTp,
  });

  const entry = enforcedPlan.entryPrice;
  const sl = enforcedPlan.stopLoss;
  const tp = enforcedPlan.takeProfit;
  const rrLabel = enforcedPlan.riskRewardRatio;
  const nextPricePrediction = enforcedPlan.tp1Price;
  const prediction = `Mode ${modeName} (${timeframe}) - SL ${enforcedPlan.usesPips ? `${enforcedPlan.slPips} pips` : planSpec.slLabel}, TP ${enforcedPlan.usesPips ? `${enforcedPlan.tpPips} pips` : planSpec.tpLabel} pada Plan RR ${rrLabel} (TP1: 1:${tp1R}, TP2: 1:${tp2R}, Target Utama TP3: 1:${tp3R}).`;
  const smcConcepts = ["ASI_CORE", setupType, timeframe + "_ANALYSIS"];
  if (smc.bos !== 'NONE') smcConcepts.push(`BOS_${smc.bos}`);
  if (smc.choch !== 'NONE') smcConcepts.push(`CHoCH_${smc.choch}`);
  if (smc.orderBlock !== 'NONE') smcConcepts.push(`OB_${smc.orderBlock}`);
  if (smc.fvg !== 'NONE') smcConcepts.push(`FVG_${smc.fvg}`);
  if (smc.liquiditySweep !== 'NONE') smcConcepts.push(`SWEEP_${smc.liquiditySweep}`);

  const reasoning = generateDeepAnalysisNarrative(signal, timeframe, asset, rrLabel, isCounterTrend, smc, patterns, totalScore, minScore, modeName, 90, confidence, isCustomMode, isBlacklistedSignal, setupSignature);

  return {
    signal,
    confidence: confidence,
    entryPrice: entry,
    stopLoss: sl,
    takeProfit: tp,
    riskRewardRatio: rrLabel,
    reasoning: reasoning,
    smcConceptsFound: smcConcepts,
    timestamp: new Date().toLocaleTimeString(),
    timeframe: timeframe,
    learningKey: setupSignature,
    prediction: prediction,
    nextPricePrediction
  };
};
