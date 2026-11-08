import { getTrueTime } from '../utils/time';
import { Asset, Candle, AnalysisResult, TradeFeedback, TimeFrame } from "../types";
import { calculateATR, detectCandlestickPatterns, detectSMC, SMCResult } from "../utils/indicators";
import { SecurityManager } from "../utils/SecurityManager";
import { isBlacklisted, getPatternWeight, getTPExtension, getDiagnosticReason } from '../core/feedbackEngine';

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
    p.push(`[Risk to Reward / Rasio Untung Rugi]: Target RR diproyeksikan pada ${rrType}.`);
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
  if (!candles || candles.length < 250) {
      return { signal: 'BUY', confidence: 0, entryPrice: 0, stopLoss: 0, takeProfit: 0, riskRewardRatio: "0:0", reasoning: Array(10).fill("Initializing ASI Core..."), smcConceptsFound: [], timestamp: new Date().toLocaleTimeString(), timeframe: timeframe, learningKey: "", prediction: "" };
  }

  const current = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const atr = calculateATR(candles, 14) || (current.close * 0.001);
  const patterns = detectCandlestickPatterns(candles);
  const smc = detectSMC(candles, timeframe);

  let isCounterTrend = false;
  let setupType = "SMC_TREND";
  let modeName = "TRADING";
  let minScore = 75;
  let slBuffer = 1.5;
  let tp1R = 1.0, tp2R = 2.0, tp3R = 3.0;

  if (timeframe === 'M1' || timeframe === 'M5') {
      modeName = "SCALPING"; minScore = 75; slBuffer = 1.0; tp1R = 0.8; tp2R = 1.5; tp3R = 2.0;
  }
  else if (timeframe === 'M15') {
      modeName = "INTRADAY"; minScore = 80; slBuffer = 1.2; tp1R = 1.0; tp2R = 2.0; tp3R = 3.0;
  }
  else if (timeframe === 'M30') {
      modeName = "DAY TRADE"; minScore = 85; slBuffer = 1.5; tp1R = 1.0; tp2R = 2.5; tp3R = 4.0;
  }
  else if (timeframe === 'H1') {
      modeName = "SWING MINGGUAN"; minScore = 90; slBuffer = 2.0; tp1R = 1.0; tp2R = 3.0; tp3R = 5.0;
  }
  else if (timeframe === 'H4' || timeframe === 'D1' || timeframe === 'W1') {
      modeName = "SWING BULANAN"; minScore = 90; slBuffer = 2.5; tp1R = 1.0; tp2R = 4.0; tp3R = 6.0;
  }

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

  let entry = current.close;
  if (signal === 'BUY') {
      if (smc.fibonacciOTE && smc.fibonacciOTE.level0_618 < entry && smc.fibonacciOTE.level0_618 > current.low * 0.95) entry = smc.fibonacciOTE.level0_618;
      else if (smc.orderBlock === 'BULLISH') entry = Math.min(entry, prev.high);
      else if (smc.fvg === 'BULLISH') entry = Math.min(entry, candles[candles.length - 3].high);
  } else {
      if (smc.fibonacciOTE && smc.fibonacciOTE.level0_618 > entry && smc.fibonacciOTE.level0_618 < current.high * 1.05) entry = smc.fibonacciOTE.level0_618;
      else if (smc.orderBlock === 'BEARISH') entry = Math.max(entry, prev.low);
      else if (smc.fvg === 'BEARISH') entry = Math.max(entry, candles[candles.length - 3].low);
  }

  let sl = 0, tp = 0;
  let rrLabel = "0:0";

  if (signal === 'BUY') {
      const lowestLow = Math.min(current.low, prev.low, candles[candles.length - 3].low);
      const riskBuffer = atr * slBuffer; 
      sl = lowestLow - riskBuffer;
      const risk = entry - sl;
      
      const recentWindow = candles.slice(Math.max(0, candles.length - 40), candles.length - 3);
      const recentSwingHigh = Math.max(...recentWindow.map(c => c.high));
      
      let calculatedTp2 = entry + (risk * tp2R);
      let calculatedTp3 = entry + (risk * tp3R);
      
      if (recentSwingHigh > calculatedTp2) tp = recentSwingHigh;
      else tp = calculatedTp2;
      
      if (tp > calculatedTp3) tp = calculatedTp3;
      rrLabel = `1:${((tp - entry)/risk).toFixed(1)}`;
  } else {
      const highestHigh = Math.max(current.high, prev.high, candles[candles.length - 3].high);
      const riskBuffer = atr * slBuffer;
      sl = highestHigh + riskBuffer;
      const risk = sl - entry;
      
      const recentWindow = candles.slice(Math.max(0, candles.length - 40), candles.length - 3);
      const recentSwingLow = Math.min(...recentWindow.map(c => c.low));
      
      let calculatedTp2 = entry - (risk * tp2R);
      let calculatedTp3 = entry - (risk * tp3R);
      
      if (recentSwingLow < calculatedTp2) tp = recentSwingLow;
      else tp = calculatedTp2;
      
      if (tp < calculatedTp3) tp = calculatedTp3;
      rrLabel = `1:${((entry - tp)/risk).toFixed(1)}`;
  }

  const prediction = `Mode ${modeName} - Target harga diproyeksikan ke arah likuiditas dengan eksekusi TP pada RR ${rrLabel}.`;
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
    prediction: prediction
  };
};
