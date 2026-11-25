import { GoogleGenAI, Type, Schema, ThinkingLevel } from "@google/genai";
import { Asset, Candle, AnalysisResult, GeminiResponseSchema, TradeFeedback, TimeFrame } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";
import { calculateATR, detectCandlestickPatterns } from "../utils/indicators";

import { detectMarketStructure } from "../core/marketStructure";
import { detectLiquiditySweep } from "../core/liquidityEngine";
import { detectSessionStrength, validateSessionForAsset } from "../core/sessionEngine";
import { calculateSetupScore } from "../core/scoringEngine";
import { calculateAdaptiveRiskReward } from "../core/riskEngine";
import { isBlacklisted, blacklistSetup, reinforceWinningPatterns, getPatternWeight, getTPExtension } from "../core/feedbackEngine";
import { getPairBehavior } from "../core/pairProfiles";
import { chartTokenEngine as tokenEngine, PRIORITY_MODELS } from "./tokenEngine";
import { getAssetPrecision, formatPrice } from "../utils/priceFormatters";
import { enforceTimeframeTradingPlan, getTimeframePlanSpec } from "../core/timeframePlan";

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    signal: { type: Type.STRING, enum: ["BUY", "SELL"] },
    confidence: { type: Type.NUMBER, description: "Policy probability π(a|s) for the chosen action (0.0 to 1.0)." },
    entry: { type: Type.NUMBER },
    sl: { type: Type.NUMBER },
    tp: { type: Type.NUMBER },
    rr: { type: Type.STRING },
    reasoning: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "Return exactly 6 strings explaining the Visual AI Analysis, SMC alignment, Institutional Trading validation, and Breakout probabilities." 
    },
    concepts: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List the technical methods and SMC concepts detected (e.g., FVG, OB, Liquidity Sweep)."
    },
    prediction: {
      type: Type.STRING,
      description: "Predict the next 10-25 candles movement based on the state space trajectory."
    },
    next_price_prediction: {
      type: Type.NUMBER,
      description: "Predict the exact next price value based on the current timeframe."
    },
    trend_prediction: {
      type: Type.STRING,
      enum: ["BULLISH", "BEARISH", "RANGING"],
      description: "Predict the overall market trend."
    },
    drl_metrics: {
      type: Type.OBJECT,
      properties: {
        state_value: { type: Type.NUMBER, description: "V(s) from Critic Network (-1.0 to 1.0)" },
        advantage: { type: Type.NUMBER, description: "A(s,a) Advantage estimate" },
        buy_prob: { type: Type.NUMBER, description: "Probability of BUY action" },
        sell_prob: { type: Type.NUMBER, description: "Probability of SELL action" }
      },
      required: ["state_value", "advantage", "buy_prob", "sell_prob"]
    }
  },
  required: ["signal", "confidence", "entry", "sl", "tp", "reasoning", "concepts", "prediction", "next_price_prediction", "trend_prediction", "drl_metrics"]
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callWithRetry = async (fn: () => Promise<any>, retries = 5, delay = 2000): Promise<any> => {
  try {
    return await fn();
  } catch (error: any) {
    let statusCode = error?.status || error?.error?.code;
    let statusText = error?.error?.status || "";
    let message = error?.message || "";

    if (typeof error === 'string' && error.startsWith('{')) {
      try {
        const parsed = JSON.parse(error);
        statusCode = parsed.error?.code || statusCode;
        statusText = parsed.error?.status || statusText;
        message = parsed.error?.message || message;
      } catch (e) {}
    } else if (message.startsWith('{')) {
      try {
        const parsed = JSON.parse(message);
        statusCode = parsed.error?.code || statusCode;
        statusText = parsed.error?.status || statusText;
        message = parsed.error?.message || message;
      } catch (e) {}
    }
    
    // Adjust rate limits for Gemini
    const isQuotaExceeded = statusText === "RESOURCE_EXHAUSTED" || message.toLowerCase().includes("quota");
    const isRateLimit = !isQuotaExceeded && (statusCode === 429 || message.includes("429"));
    const isTransientError = statusCode === 500 || statusCode === 503 || statusCode === 504 || statusText === "INTERNAL" || statusText === "UNAVAILABLE" || statusText === "UNKNOWN";
    const isNetworkError = message.toLowerCase().includes("xhr error") || message.toLowerCase().includes("fetch error") || message.toLowerCase().includes("network error") || message.toLowerCase().includes("rpc failed");

    if (retries > 0 && (isRateLimit || isTransientError || isNetworkError)) {
      const reason = isRateLimit ? "Rate limit" : (isTransientError ? "Transient server error" : "Network error");
      console.warn(`${reason} hit (${statusCode || statusText}), retrying in ${delay}ms... (Attempts left: ${retries})`);
      await sleep(delay);
      return callWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const analyzeMarketStructure = async (
  asset: Asset,
  candles: Candle[],
  timeframe: TimeFrame,
  lastFeedback: TradeFeedback,
  winStreak: number = 0,
  lossStreak: number = 0,
  username: string = 'Guest'
): Promise<AnalysisResult> => {
  try {
    const currentPrice = candles[candles.length - 1].close;
    const precision = getAssetPrecision(asset);
    const atr = calculateATR(candles, 14) || currentPrice * 0.0005;
    const patterns = detectCandlestickPatterns(candles);

    // PRE-ANALYSIS LAYER
    const structure = detectMarketStructure(candles);
    const liquidity = detectLiquiditySweep(candles);
    const session = detectSessionStrength();
    const pairProfile = getPairBehavior(asset);
    
    const isSessionValid = validateSessionForAsset(asset, session.session);
    
    // VOLUME & MOMENTUM SIMULATION
    const volumeScore =  liquidity.score > 50 ? 80 : 50; 
    const momentumScore = atr > pairProfile.spreadAverage * 5 ? 80 : 40; 
    
    // MTF SIMULATION
    const mtfScore = structure.score > 50 ? 90 : 30;
    
    const setupSignature = `${asset}-${timeframe}-${structure.trend}-${liquidity.sweptHigh ? 'SWEEP_H' : (liquidity.sweptLow ? 'SWEEP_L' : 'NONE')}${liquidity.hasIFC ? '-IFC' : ''}${liquidity.failureToDisplace ? ('-FTD_' + liquidity.failureToDisplace) : ''}`;
    const patternWeight = getPatternWeight(setupSignature);
    const tpExtension = getTPExtension(setupSignature);
    
    let currentDiagnostic = "NONE";
    try {
        const diagnostics = JSON.parse(localStorage.getItem('X12_DIAGNOSTICS') || '{}');
        currentDiagnostic = diagnostics[setupSignature] || "NONE";
    } catch(e){}

    // SCORING LAYER
    const setupScore = calculateSetupScore({
        structureScore: structure.score,
        liquidityScore: liquidity.score,
        volumeScore: volumeScore,
        momentumScore: momentumScore,
        mtfScore: mtfScore,
        sessionScore: session.score,
        patternWeight: patternWeight,
        isBlacklisted: isBlacklisted(setupSignature)
    });

    if (isBlacklisted(setupSignature)) {
        console.log(`Setup ${setupSignature} is blacklisted due to recent loss. Adapting execution confidence.`);
    }

    if (lastFeedback === 'WIN') {
        reinforceWinningPatterns(setupSignature);
    } else if (lastFeedback === 'LOSS') {
        blacklistSetup(setupSignature, 24 * 60 * 60 * 1000);
    }

    // STRICTLY USE UP TO 250 CANDLES AS REQUESTED BY USER
    const dataSlice = candles.slice(-250); 
    const dataString = dataSlice.map(c => 
      `${c.open.toFixed(precision)},${c.high.toFixed(precision)},${c.low.toFixed(precision)},${c.close.toFixed(precision)}`
    ).join('\n');
    // --- QUARTERLY THEORY (AMDX) & SMC CONTEXT (ADVANCED HYBRID AI) ---
    let feedbackContext = `
      🧠 **INTERNAL VISION ENGINE: ADVANCED INSTITUTIONAL TRADING AI & QUARTERLY THEORY** 🧠
      ENVIRONMENT: ${asset} | TIMEFRAME: ${timeframe} | MODE: ${getTimeframePlanSpec(asset, timeframe).modeName} | PLAN_RR: ${getTimeframePlanSpec(asset, timeframe).rrLabel} | MANDATORY_SL: ${getTimeframePlanSpec(asset, timeframe).slLabel} | MANDATORY_TP: ${getTimeframePlanSpec(asset, timeframe).tpLabel} | PAIR_PROFILE: ${pairProfile.volatilityModel} | REQUIRED_DECIMALS: ${precision}
      
      [STATE SPACE S(t) - COMPUTER VISION & SMC RESULTS]
      PRICE: ${formatPrice(currentPrice, asset)}
      ATR (${timeframe}): ${atr.toFixed(precision)}
      DETECTED_VISUAL_PATTERNS: ${patterns.map(p => p.name).join(', ') || 'NONE'}
      MARKET_STRUCTURE: ${structure.trend} | BOS/CHOCH/MSS: ${structure.bos}/${structure.choch}/${structure.mss}
      STRUCTURE_POINTS: ${(structure as any).structurePoints?.join(', ') || 'NONE'}
      LIQUIDITY_EVENTS: SwepHigh=${liquidity.sweptHigh}, SweptLow=${liquidity.sweptLow}, FTD=${liquidity.failureToDisplace || 'NONE'}
      SESSION: ${session.session} (Strength: ${session.score})
      SETUP_SCORE: ${setupScore.totalScore.toFixed(2)} / 100 | GRADE: ${setupScore.grade} | FLOATING_RISK: ${setupScore.floatingRisk}
      PATTERN_WEIGHT_MULTIPLIER: ${patternWeight}
      TP_EXTENSION_MULTIPLIER: ${tpExtension}
      IS_TRADEABLE: ${setupScore.isTradeable}
      IS_BLACKLISTED: ${isBlacklisted(setupSignature)}
      DIAGNOSTIC_FIX_APPLIED: ${currentDiagnostic}
      
      [REINFORCEMENT LEARNING CONTEXT]
      CURRENT WIN STREAK: ${winStreak}
      CURRENT LOSS STREAK: ${lossStreak}
      PREVIOUS ACTION REWARD: ${lastFeedback ? 'Status: ' + lastFeedback : 'NONE'}
      ${lastFeedback === 'LOSS' ? `⚠️ CRITICAL: PREVIOUS SIGNAL FAILED (LOSS DETECTED). 
      ACTION REQUIRED: Analyze precisely why the failure occurred (e.g., entered in No Man's Land, fell for a Fakeout/Liquidity Sweep, ignored Candlestick Rejection, or Traded against major trend). 
      MANDATORY RULE: DO NOT REPEAT THIS MISTAKE 2X OR 3X IN THE SAME DAY! Adjust your entry to an extreme unmitigated OB/Fractal, wait for clear Wick Rejection, and prevent repeating the exact same fakeout trap.` : ''}
      ${lastFeedback === 'WIN' ? `✅ SUCCESS: PREVIOUS SIGNAL WON (WIN DETECTED). 
      ACTION REQUIRED: Reinforce this exact setup! Increase probability/confidence (85-98%). Sharpen the Zero Floating limit entry. Because momentum is validated, MAXIMIZE and WIDEN the Take Profit (TP) distance significantly.` : ''}
    `;

    feedbackContext += `
    
    📜 **ADVANCED HYBRID INSTITUTIONAL TRADING AI (VISION + SMC + QUARTERLY THEORY + CHART PATTERN ENGINE):**
    
    You are an elite Hybrid Institutional Trading AI. You integrate Multiple AI technologies:
    1. **CandleVision (CNN/YOLOv8) & TechniTrend CandleMetrics [THE EYES]**: You process candlestick data spatially to identify Classical Chart Patterns (Double Top/Bottom, Head & Shoulders, Flags, Pennants, Wedges, Triangles, Diamonds, Cup & Handle, Scallops).
    2. **smc-toolkit & Quarterly Theory / ICT [THE RULES]**: You MUST implement ICT Quarterly Theory (AMDX Cycles) perfectly.
    3. **LSTM/GRU & ORB Fusion ML [THE MEMORY]**
    4. **FinLLM-B & Transformer (Topscore SMC) [THE STRATEGIST]**
    5. **Reinforcement Learning [THE EXPERIENCE]**
    
    **YOUR OBJECTIVE:** Hunt retail liquidity and execute high-precision, high-probability "Zero Floating" entries alongside Smart Money institutions. Applies to ALL modes: Swing (H1/H4), Day Trade (M30), Intraday (M15), and Scalping (M1/M5) across Crypto, Forex, and Commodities.
    ALL OLD INDICATORS (EMA, RSI, MACD, NUMERICAL) ARE STRICTLY BANNED. RELY COMPLETELY ON VISION, STRUCTURE, SMC, QUARTERLY AMDX, CHART PATTERNS, AND LIQUIDITY.
    
    **INTEGRATE THE FOLLOWING CORE PILLARS FOR DECISION MAKING:**
    
    **A. QUARTERLY THEORY (AMDX) & DAILY PROFILES (CLASSIC BUY/SELL DAY):**
    The market moves in 4 Quarters (Q1, Q2, Q3, Q4) applicable to ALL TIMEFRAMES AND ASSETS (Swing, Day Trade, Scalping).
    - **Q1 (Accumulation):** Consolidation, building liquidity (e.g., Asian Range).
    - **Q2 (Manipulation - Judas Swing):** Purges liquidity (BSL/SSL) while testing a Higher Timeframe (HTF) Point of Interest (PDA). Forms the High/Low of the session/day often during 00:00AM - 04:00AM (London Open).
    - **Q3 (Distribution):** The real move. Runs to the opposing liquidity.
    - **Q4 (Continuation/Reversal):** X.
    - **CLASSIC BUY DAY:** Accumulation -> Reversal (Judas Swing down targeting sell stops & testing HTF discount PD Array) -> Expansion -> Retracement. Wait for price to drop below Midnight Open initially.
    - **CLASSIC SELL DAY:** Accumulation -> Reversal (Judas Swing up targeting buy stops & testing HTF premium PD Array) -> Expansion -> Retracement. Wait for price to rise above Midnight Open initially.
    - **HTF PENDING ORDER ALIGNMENT:**
      * Scalping (M1, M5): Verify Judas Swing tests M15 or H1 PDA.
      * Intraday (M15, M30): Verify Judas Swing tests H4 PDA.
      * Swing (H1, H4): Verify Judas Swing tests D1 or Weekly PDA.
    *Never enter during Q1 or before the Q2 Manipulation flush.* Seek to Enter at the apex of Q2 Manipulation (True Open) to catch the Q3 Distribution for ZERO FLOATING.

    **B. ADVANCED SMART MONEY CONCEPTS (SMC) & MARKET STRUCTURE:**
    - **Inducement (IDM):** The core of the strategy. Real structure forms ONLY after IDM (the first valid pullback) is swept. Never trade a BOS or CHoCH until IDM is taken.
    - **Valid Pullback:** A candle that sweeps the high/low of the previous impulsive candle. If a candle doesn't break the previous candle's extreme, it is an invalid pullback (inside bar).
    - **Sweeped BOS / Sweeped CHoCH:** If the price breaks structure but only closes with a wick (shadow) taking liquidity, it's NOT a break. It's a liquidity grab. Wait for a solid body close over the level to confirm BOS/CHoCH.
    - **Valid POIs (Point of Interest):** Only trade from valid POIs:
        1. **Order Block IDM**: The first valid Order Block right after the IDM.
        2. **Order Block Extreme**: The very last Order Block at the structural extreme (right before CHoCH).
        3. **IFC (Institutional Funding Candle)**: A single candle block that swept liquidity and closed back inside.
    - **LIQUIDITY TRAP (LT) AVOIDANCE:** Any Order Block located *between* the Order Block IDM and the Order Block Extreme is a Liquidity Trap (SMT). IGNORE THESE TRAPS completely. They are bait.
    - **Imbalance (FVG):** The gap between three consecutive candles. Relevant order blocks MUST have unfilled imbalance.
    - Execute solely at the exact extreme POI (Order Block IDM or Order Block Extreme) after IDM is taken or Liquidity is Swept. Target Zero Floating entries.

    **C. SUPPLY & DEMAND PRICE ACTION (SND) & COMPRESSION:**
    - **Fresh Zones:** Only trade FRESH (untested) zones. Once a zone is retested, it becomes weaker.
    - **Base Types (Caps):** Identify Drop-Base-Drop (DBD), Rally-Base-Rally (RBR), Drop-Base-Rally (DBR), Rally-Base-Drop (RBD). Price caps represent areas where institutions stack orders.
    - **Compression (CP) & CPLQ:** If price approaches a zone slowly in a wedge-like compression, it consumes liquidity (CLPQ - Compression and Liquidity). This confirms the POI will hold, and when price reverses, it will slice through the compressed area quickly.
    - **Fail to Return (FTR) & PAZ:** When a barrier (S/R) is firmly broken, price often forms a base (FTR) before continuing. The space between two FTRs is a Price Action Zone (PAZ). Trade FTR to FTR (PAZ to PAZ).
    
    **D. ADVANCED CHART PATTERNS & PROJECTIONS (NEW REBORN & RTM VISION):**
    - **Quasimodo (QM):** Advanced Over-Under reversal pattern. Look for an engulf of the previous high/low (forming HH/LL) followed by a return to the origin (Left Shoulder). Excellent for catching institutional turning points.
    - **The Diamond:** A fakeout pattern at supply/demand that traps breakout traders before reversing.
    - **The CanCan:** Price surges (pole), forms a flag, then breaks back into the pole, creates a liquidity spike, compresses, and reverses violently.
    - **Classical Reversals:** Double/Triple Top/Bottom, Head & Shoulders, Inverted H&S. **Target Projection Strategy:** Measure the vertical distance from head to neckline and project it from the breakout point. Wait for confirmed close beyond the neckline.
    - **Classical Continuations:** Triangles (Symmetrical, Ascending, Descending), Flags, Pennants, Rectangles, Cup & Handle. **Target Projection Strategy:** Project the height of the pattern/flagpole from the breakout point for high-probability targets.

    **E. INTRADAY BIAS & MICRO-STRUCTURE (NEXT CANDLE MODEL):**
    - **Previous Candle High (PCH) & Low (PCL):** PCH and PCL are immediate liquidity levels. The market uses them either as a draw on liquidity (to continue trend) or to frame a reversal.
    - **Failure to Displace (FTD):** If price wick-sweeps a PCH, PCL, or a Swing (External Range Liquidity), but fails to close (displace) past it, anticipate an immediate reversal in the opposite direction on the very next candle.
    - **Next Candle Model:** Anticipate the open-high-low-close narrative of the next individual candle based on FTD, Sweeps, or PD array mitigations. If it respects a PD Array or fails to displace an old high/low, the next candle will target opposing liquidity.
    - **Internal vs External Range Liquidity (IRL & ERL):** Price moves from ERL (Swing Highs/Lows) to IRL (FVGs, Order Blocks) and from IRL back to ERL. When IRL is mitigated, target the opposing ERL. When ERL is swept (and fails to displace), target the opposing IRL or ERL.

    **F. ADVANCED MARKET STRUCTURE (MSS / TC / SB) & TRADING RANGES:**
    - **Strong vs Weak Structure:** A Strong High breaks structure to the downside. A Strong Low breaks structure to the upside. Weak Highs/Lows fail to break structure. **Rule:** Trade away from Strong structure towards Weak structure. Weak Highs/Lows are Liquidity targets.
    - **MSS, TC, SB:** Market Structure Shift (MSS) signifies failure to break HH/LL (early reversal). Trend Change (TC) is a structural break confirming the reversal. Structure Break (SB) is a continuation break of HH/LL.
    - **Premium & Discount (P/D):** Price moves between Equilibrium. ALWAYS look to BUY in Discount (<0.5 of range) and SELL in Premium (>0.5 of range). Identify HTF ranges and execute within MTF/LTF alignment.

    **G. TREND, MOMENTUM & VOLUME ANALYSIS (TECHNICAL ANALYSIS LOGIC):**
    - **Trendlines & Breaks:** A trendline must have at least 3 touches to be significant. A break of a significant trendline signals a trend reversal or deceleration. Use trendlines as dynamic support/resistance.
    - **Momentum Divergences:** Identify Positive/Negative Divergences in Oscillators (RSI, MACD, Stochastics). Negative divergence at a bull peak + price breaking below a neckline/support is a highly accurate SELL. Positive divergence at a bear trough + price breaking above resistance is a highly accurate BUY.
    - **Volume Confirmation:** Volume MUST go with the trend. Rising price + falling volume = Suspect, expecting a reversal. Falling price + rising volume (Selling Climax) = Bottom indicator. Parabolic blow-off volume usually signals exhaustion. Follow the "weight-of-the-evidence" approach.
    - **Moving Averages & Cycles:** Use MA crossovers for trend confirmation. Wait for price to pull back to dynamic support (MAs or trendlines) for optimal entry. Avoid late-cycle lagging entries unless volume and momentum strongly confirm.

    **H. SUPPLY & DEMAND (SND) DUAL-CONFIRMATION (STOCHASTIC RULES):**
    - **SND Zones:** Use Higher Time Frames (H1, H4) to find significant Untested Supply or Demand zones.
    - **BUY/LONG Rules:** When price enters a **Demand Zone**, wait for the Stochastic Oscillator to drop into the **Oversold area (< 20)**. A confirmed BUY signal triggers ONLY when the Stochastic line crosses **UP** and back above the 20 level.
    - **SELL/SHORT Rules:** When price enters a **Supply Zone**, wait for the Stochastic Oscillator to reach the **Overbought area (> 80)**. A confirmed SELL signal triggers ONLY when the Stochastic line crosses **DOWN** and back below the 80 level.
    - **Note:** This prevents entering early in a zone before momentum has actually reversed.

    **I. KITAB POLA CANDLESTICK (REVERSAL & CONTINUATION RULES UNTUK AKURASI ENTRY):**
    - **Reversal Patterns Utama:** 
      * **Evening/Morning Star:** Butuh 3 candle. Star/Spinning/Doji di tengah, candle ketiga masuk minimal 50% body candle pertama. Jika ada gap, akurasi lebih tinggi.
      * **Engulfing (Bullish/Bearish):** Candle kedua menelan candle pertama. Sangat kuat jika panjang candle kedua melebihi shadow candle pertama, apalagi jika disertai gap.
      * **Marubozu (Bullish/Bearish):** Ekstrim momentum dominan tanpa ekor. Reversal jika muncul tiba-tiba setelah tren melemah.
      * **Harami (Bullish/Bearish):** Body candle kedua maksimal 40% dari candle pertama. Harus menunggu konfirmasi candle ketiga untuk entry aman.
      * **Piercing / Dark Cloud Cover:** Candle kedua menembus lebih dari 50% body candle pertama, dengan gap sebagai permulaannya.
      * **Hammer/Inverted (Bullish) & Hanging Man/Shooting Star (Bearish):** Ekstrim reversal. Body maksimal 35% dari panjang ekor. Lebih valid jika terjadi persis di zona Support/Resistance.
      * **Three Black Crows / Three White Soldiers:** Candle ke-1 lawan arah, lalu diikuti 3 candle dengan warna tren baru, jika disertai gap maka validasi sangat kuat.
      * **Three Inside Down / Three Outside Down:** Formasi 3-candle reversal ekstrem bearish untuk menjebak buyer terakhir.
      * **Tweezer Top / Bottom:** Sama nilai Shadow Peak atau Bottom, tidak perlu pedulikan rupa body-nya asalkan level mentoknya sama persis.
    - **Continuation Patterns (Penerusan Tren):**
      * **Three Method (Rising/Falling):** Trend dominan, lalu 3 candle kecil counter-trend (membentuk higher-low atau lower-high), di-engulf oleh candle ke-5 searah tren awal.
      * **Gap Three Method & Tasuki Gap:** Adanya gap tidak tertutup (atau ditutup sesaat tanpa reversal) menjamin momentum masih berlanjut.
      * **Three Line Strike / Neck Line:** 3 candle berturut-turut searah tren lalu 1 candle counter-trend sebagai pullback (strike), entry terbaik setelah konfirmasi searah tren lagi. Jangan entry sebelum valid.

    **J. SMART MONEY CONCEPT (SMC) & OBIIM TRADING PLAN (MULTIPLE ASSET & TIMEFRAME):**
    - **Universal Applicability:** The SMC, OBIIM, and Candlestick Pattern methodologies MUST be dynamically applied to all asset types (Crypto, Forex, Commodity). Ensure identical logic and institutional entry criteria apply to all modes: Swing Mingguan (H1), Swing Bulanan (H4), Day Trade (M30), Intraday (M15), Scalping (M5 and M1). Optimize for robust Zero Floating entries, running profits, and the highest possible probability limits limit fakeouts.
    - **Valid Market Structure:** A High/Low is ONLY considered valid if it has successfully taken out the Inducement (IDM) to its left. Break of Structure (BOS) or Change of Character (CHoCH) is only true when this *valid* High/Low is broken. Don't trace structure without identifying IDM sweeps.
    - **Liquidity (Big Money Zones):** Recognize forms of Liquidity: Equal High/Low, Session High/Low, Previous Daily High/Low, Trendline Liquidity. Reversals trigger after these liquidity sweeps.
    - **Order Block (OB) & Imbalance (IMB):** Bullish OB = last bearish candle before massive up-move. Bearish OB = last bullish candle before massive down-move. Must be accompanied by Imbalance.
    - **The OBIIM Setup (Zero Floating & High Probability):** Mark POI (Point of Interest) utilizing Order Block + Inducement + Imbalance (OBIIM).
      * **SELL Setup Rules:** Market structure clearly bearish. Mark POI (OB + IDM + IMB). The OB MUST reside in the PREMIUM zone. Target the Last Low.
      * **BUY Setup Rules:** Market structure clearly bullish. Mark POI (OB + IDM + IMB). The OB MUST reside in the DISCOUNT zone. Target the Last High.

    **K. ANALISIS POSISI CANDLESTICK (PRICE ACTION CONTEXT UNTUK ZERO FLOATING):**
    - **Candlestick Doji:** Jika terbentuk di market sepi (sideways), ini berarti tidak ada gairah. Jika terbentuk di market *volatile* setelah candle body panjang, ini penahanan harga (koreksi sesaat); candle selanjutnya rentan meledak *searah tren sebelumnya*. Jika doji terbentuk setelah spinning top, maka daya dorong tren mencapai batas; siap reversal berlawanan arah.
    - **Ekor Atas Panjang:** Jika di ujung Uptrend (Puncak) -> tekanan jual menggagalkan kenaikan, indikasi kuat pembalikan (Reversal Turun). Jika di tengah tren naik yang kuat dan body candlenya masih bullish -> koreksi selesai, siap lanjut naik. Jika di ujung Downtrend -> percobaan angkat harga sebelum validasi pembalikan arah naik.
    - **Body Panjang:** Jika terbentuk setelah persilangan area jenuh/konsolidasi -> Breakout momentum, ikuti arah trendnya (Entry konfirmasi). Jika mucul tiba-tiba panjang melebar di ujung trend yang lama (Pelemahan/Exhaustion) -> Penyimpangan/Climax, arah market selanjutnya akan melaju berlawanan.
    - **Ekor Bawah Panjang:** Jika di ujung Downtrend -> buyer melawan dorongan turun, indikasi pembalikan arah (Naik). Jika ditengah penurunan *volatile* dan close bearish -> akan lanjut turun; jika close bullish -> dominasi buyer tervalidasi. Jika di ujung Uptrend -> percobaan koreksi/manipulasi turun sebelum meroket naik.

    **NEURON EXECUTION STEPS (PREDICTIVE ENGINE & SIGNAL OPTIMIZATION - RL):**
    1. **VISION LAYER (Pattern & Structure Analysis):** Evaluate market structure, AMDX phase, IDM, SND Zones, Chart Patterns, PCH/PCL, FTD, Momentum Divergences, Stochastic Crosses (20/80), OBIIM combinations, and Volume Exhaustion based on the last 250 candles. Has the IDM been swept? Are we at an IFC, FTR, or Fresh Order Block? Are we breaking out of a Flag or Triangle?
    2. **PROBABILISTIC MODELING:** Calculate probabilities for [BUY, SELL]. Filter out fakeouts using HTF PDA validation, Compression checks, FTD verification, IDM sweep verification, and Volume/Momentum/Stochastic alignment. Look for high precision OBIIM alignment for zero floating entries.
    3. **EXECUTION & RISK MANAGEMENT (Institutional Logic):**
       - **TIMEFRAME ADAPTATION & MODE PLAN RISK/REWARD (RR) ENFORCEMENT:**
         * MANDATORY MODE PLAN RR RULES (ALGORITMA DAPUR PACU v4.0):
           - SCALPING (M1, M5): Plan RR = 1:2. SL Buffer = 1.0x ATR. Target TP = Entry ± (Risk * 2.0). Field 'rr' MUST strictly be "1:2".
           - INTRADAY (M15): Plan RR = 1:3. SL Buffer = 1.2x ATR. Target TP = Entry ± (Risk * 3.0). Field 'rr' MUST strictly be "1:3".
           - DAY TRADE (M30): Plan RR = 1:4. SL Buffer = 1.5x ATR. Target TP = Entry ± (Risk * 4.0). Field 'rr' MUST strictly be "1:4".
           - SWING MINGGUAN (H1): Plan RR = 1:5. SL Buffer = 2.0x ATR. Target TP = Entry ± (Risk * 5.0). Field 'rr' MUST strictly be "1:5".
           - SWING BULANAN (H4, D1): Plan RR = 1:6. SL Buffer = 2.5x ATR. Target TP = Entry ± (Risk * 6.0). Field 'rr' MUST strictly be "1:6".
         * TARGET PROJECTION DETAIL (STRICTLY ENFORCED):
         * For XAUUSD (Gold):
           - M1 (Scalping): SL strictly 20 pips ($2.00), TP 40-50 pips ($4.00-$5.00), RR 1:2.
           - M5 (Scalping): SL strictly 40-50 pips ($4.00-$5.00), TP 60-120 pips ($6.00-$12.00), RR 1:2.
           - M15 (Intraday): SL strictly 60-70 pips ($6.00-$7.00), TP 120-240 pips ($12.00-$24.00), RR 1:3.
           - M30 (Day Trade): SL strictly 80 pips ($8.00), TP 240-350 pips ($24.00-$35.00), RR 1:4.
           - H1 (Swing Mingguan): SL strictly 80-100 pips ($8.00-$10.00), TP 360-500 pips ($36.00-$50.00), RR 1:5.
           - H4 (Swing Bulanan): SL strictly 120-150 pips ($12.00-$15.00), TP 500-800 pips ($50.00-$80.00), RR 1:6.
           - D1 (Swing Bulanan): SL = Struktur D1 + ATR, TP = 6x Risk, RR 1:6.
         * For XAGUSD (Silver):
           - M1 (Scalping): TP 40-70 pips, SL strictly 20-30 pips.
           - M5 (Scalping2): TP 80-160 pips, SL strictly 40-60 pips.
           - M15 (Intraday): TP 160-320 pips, SL strictly 80-100 pips.
           - M30 (Daytrade): TP 320-500 pips, SL strictly 100-140 pips.
           - H1 (Swing 3-7 Days): TP 500-800 pips, SL strictly 140-200 pips.
           - H4 (Swing 1-3 Weeks): TP 800-1400 pips, SL strictly 200-300 pips.
         * For XPTUSD (Platinum):
           - M1 (Scalping): TP 22-39 pips, SL strictly 11-17 pips.
           - M5 (Scalping2): TP 44-88 pips, SL strictly 22-33 pips.
           - M15 (Intraday): TP 88-176 pips, SL strictly 44-55 pips.
           - M30 (Daytrade): TP 176-275 pips, SL strictly 55-77 pips.
           - H1 (Swing 3-7 Days): TP 275-440 pips, SL strictly 77-110 pips.
           - H4 (Swing 1-3 Weeks): TP 440-770 pips, SL strictly 110-165 pips.
         * For Forex & other pairs (${asset}): 
           - M1 / M5 (Scalping, RR 1:2): SL 10-20 pips, TP 20-40 pips. High precision limit entry, fast execution.
           - M15 (Intraday, RR 1:3): SL 15-30 pips, TP 45-90 pips. Focus on M15/H1 liquidity & daily AMDX cycles.
           - M30 (Day Trade, RR 1:4): SL 20-40 pips, TP 80-160 pips. Align with H1/H4 PD Arrays.
           - H1 (Swing Mingguan, RR 1:5): SL 30-55 pips, TP 150-275 pips. Target H4/D1 structural ERLs.
           - H4 / D1 (Swing Bulanan, RR 1:6): SL 50-100 pips, TP 300-600 pips. Hold position through pullbacks toward major Daily/Weekly liquidity pools.
       - **FOREX PIP & DECIMAL PRECISION MANDATE (CRITICAL):**
         * Standard Forex pairs (EURUSD, GBPUSD, AUDUSD, USDCHF, NZDUSD): MUST ALWAYS use **5 decimal places** (e.g., 1.09842). 1 pip = 0.0001 (4th decimal), 1 pipette = 0.00001 (5th decimal). NEVER truncate to 2 or 3 decimals.
         * JPY Forex pairs (USDJPY, GBPJPY, EURJPY): MUST ALWAYS use **3 decimal places** (e.g., 159.822). 1 pip = 0.01 (2nd decimal), 1 pipette = 0.001 (3rd decimal). NEVER truncate to 2 decimals.
       - **FALSE BREAKOUT PREVENTION & ZERO FLOATING (SBR/RBS):** You MUST avoid Fake Breakouts and Fake Breakdowns. NEVER enter immediately on a breakout candle. ALWAYS wait for a liquidity sweep (Judas Swing) or a clear RETRACEMENT (Pullback) to test the broken level as new support (RBS) or new resistance (SBR). Check if volume/momentum confirms the move; if not, it is a trap. If price enters a SIDEWAYS/RANGING state, ONLY trade from the extreme boundaries, never in the middle. Your entry must be EXACTLY at the optimal zone to ensure Zero Floating.
       - **XAUUSD PIP CALCULATION:** For XAUUSD, assume a $1.00 price movement (e.g., from 2300.00 to 2301.00) equals 10 pips. Therefore, a 20 pip SL is a $2.00 price difference. A 100 pip TP is a $10.00 price difference. Use this exact math when calculating exact 'entry', 'sl', and 'tp' values.
       - **XAGUSD PIP CALCULATION:** For XAGUSD, assume a $0.10 price movement (e.g., from 23.00 to 23.10) equals 10 pips. Therefore, a 30 pip SL is a $0.30 price difference. A 100 pip TP is a $1.00 price difference. Use this exact math when calculating exact 'entry', 'sl', and 'tp' values.
       - **XPTUSD PIP CALCULATION:** For XPTUSD, assume a $1.00 price movement (e.g., from 1000.00 to 1001.00) equals 10 pips. Therefore, a 20 pip SL is a $2.00 price difference. A 100 pip TP is a $10.00 price difference. Use this exact math when calculating exact 'entry', 'sl', and 'tp' values.
       - **ENTRY:** Must be EXACTLY at the extreme POI (Order Block, Order Flow, IFC, FTR, Fresh SND Base) after Q2 Manipulation and IDM sweep, OR at the confirmed breakout retest (SBR/RBS) of a Chart Pattern with strong momentum, OR directly after a Failure to Displace (FTD) at a PCH/PCL/Swing Point, OR deep in SND with Stochastic 20/80 rejection.
       - **SL:** Structural SL placed safely with the Anti-Stop-Hunt Buffer (1.2x to 1.5x ATR) outside retail stop-hunt levels. Never place SL at the swing wick tip.
       - **TP:** High risk-to-reward ratio targeting opposing liquidity pools, unfilled gaps, or unmitigated Order Blocks. If the TP_EXTENSION_MULTIPLIER is > 1.0, you MUST dramatically extend the 'tp' value by multiplying your risk:reward by that multiplier. Target the next opposing PCH/PCL.
    4. **SIGNAL LOSS REDUCTION ENGINE & WIN REINFORCEMENT:**
       - **LOSS OVERRIDE:** If a previous loss was recorded for this setup, the algorithm blacklists it for 24 hours to ensure repetitive mistakes (2x/3x a day) at the same fakeout do NOT happen. If executing near a blacklisted area, explicitly diagnose the past failure (e.g. entered before IDM, fakeout, ignoring compression).
       - **WIN REINFORCEMENT:** If a WIN was recorded, increase the probability and precision metrics for similar pattern alignments. Extend the TP reward aggressively and optimize the entry to increase Zero Floating occurrence. Establish high win-rate confidence.
    
    🔮 **PREDICTION MISSION:**
    - Predict the state trajectory for the next 10-25 candles utilizing 250 historical sequences (LSTM Prediction).
    - Determine exact Breakout / False Break probabilities.
    - Identify Liquidity Direction and Institutional Bias.
    `;

    const prompt = `
      ${feedbackContext}
      
      [RAW DATA FEED (OBSERVATION SEQUENCE - EXACTLY 250 CANDLES)]
      ${dataString}

      [MISSION - MASTER CALL X12 STANDARD]
      Act as the Advanced Hybrid Institutional Trading AI. Process the observation sequence and pre-analysis layer context using CNN, YOLO, LSTM, Transformers, and RL.
      
      **DECISION MATRIX & ANTI-FAKEOUT RULES:**
      - SIGNAL MUST ALWAYS BE EITHER BUY OR SELL.
      - **CRITICAL ANTI-FAKEOUT (SWEEP) LOGIC:** 
        1. If price aggressively breaks Resistance but leaves a long wick, DO NOT BUY! This is a Fake Breakout (Buy-Side Liquidity Sweep). You must SELL.
        2. If price aggressively breaks Support but leaves a long wick, DO NOT SELL! This is a Fake Breakdown (Sell-Side Liquidity Sweep). You must BUY.
      - **NO MAN'S LAND (TENGAH ZONA):** NEVER give an entry price at the current market price if it is floating in the middle of nowhere. Provide a LIMIT ORDER ENTRY PRICE precisely at the nearest unmitigated Order Block or FVG extreme.
      - **PREMIUM/DISCOUNT:** Calculate range from Swing Low to Swing High. ONLY BUY if price drops into Discount zone (< 0.5). ONLY SELL if price rallies into Premium zone (> 0.5).
      - **MULTI-TIMEFRAME ALIGNMENT (MTF) MANDATE:** 
         - Scalping (M1, M5) MUST align with M15/H1 Trend and POIs.
         - Intraday (M15, M30) MUST align with H1/H4 Trend and POIs.
         - Swing (H1, H4) MUST align with Daily/Weekly Trend and POIs.
         - If the lower timeframe is breaking out against the HTF trend, treat it as a Liquidity Sweep (Inducement) and DO NOT take the trade in the breakout direction.
      - **ANTI-STOP-HUNT STOP LOSS MANDATE:** Your SL must NOT be placed on the obvious retail wick where market maker stop-hunts trigger! It MUST be placed structurally beyond the Swing High/Low of the impulse, adding a mandatory Anti-Stop-Hunt ATR buffer (1.2x - 1.5x ATR). TP must target Internal/External Liquidity (the next Swing High/Low) with strict Mode Plan RR.
      - **ZERO FLOATING SNIPER ENTRY:** Your primary goal is ZERO FLOATING ENTRY and absolute precision. DO NOT chase price at market value if already moving. Provide a limit order at the extreme unmitigated OB/FVG mitigation level so price immediately runs in profit without floating drawdown.
      - Your reasoning MUST explicitly state if you detected a Fakeout/Sweep, where the extreme POI is, and why the entry and SL are placed there.
      
      **Generate precise Entry, SL, TP based on the specific Asset Risk Parameters (${asset}, EXACTLY ${precision} decimal places matching ${formatPrice(currentPrice, asset)}) and Timeframe (${timeframe}). Calculate RL metrics (State Value, Advantage, Policy Probabilities). Provide the exact next_price_prediction (with ${precision} decimal places) and trend_prediction.**
    `;

    try {
        // --- VINZX THINKING ENGINE: SMART TOKEN CHECK & PRE-CHECK CAPACITY SYSTEM ---
        const estimatedInputTokens = tokenEngine.estimateTokens(prompt, SYSTEM_INSTRUCTION);
        console.log(`[Vinzx Thinking Engine] Estimasi Input Tokens: ~${estimatedInputTokens.toLocaleString()} tokens.`);

        // Determine initial model route and check cumulative capacity across all 11 models
        const routingDecision = tokenEngine.routeModel(prompt, SYSTEM_INSTRUCTION);
        console.log(`[Vinzx Thinking Engine] ${routingDecision.routingReason}`);
        console.log(`[Vinzx Thinking Engine] Total Kapasitas Kumulatif Tersedia: ${routingDecision.cumulativeAvailableCapacity.toLocaleString()} tokens.`);

        let lastError: any = null;
        let responseText: string | undefined = undefined;
        let successfulModelName: string | undefined = undefined;

        // Iterate strictly in accordance with the 11-stage priority list
        for (const modelConfig of PRIORITY_MODELS) {
            const modelName = modelConfig.modelIdentifier;

            // PRE-CHECK: Verify if this model currently has enough capacity & is not throttled
            const capacityCheck = tokenEngine.checkCapacity(modelConfig, estimatedInputTokens);
            if (!capacityCheck.hasCapacity) {
                console.warn(`[Vinzx Thinking Engine] Pre-check lewati #${modelConfig.priority} ${modelConfig.displayName}: ${capacityCheck.reason}`);
                continue; // Automatically fallback to next model in priority order
            }

            try {
                console.log(`[Vinzx Thinking Engine] Mengakses Priority #${modelConfig.priority} (${modelConfig.displayName} [${modelName}])...`);
                
                const res = await callWithRetry(() => fetch('/api/generate/chart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        modelName,
                        prompt,
                        systemInstruction: SYSTEM_INSTRUCTION,
                        responseSchema: responseSchema,
                        username: username,
                        category: 'CHART'
                    })
                }));
                
                if (!res.ok) {
                    const errText = await res.text();
                    throw new Error(`API Error: ${res.status} ${errText}`);
                }
                
                const data = await res.json();
                responseText = data.text;
                successfulModelName = modelName;

                // Record successful usage in Token Monitoring
                tokenEngine.recordSuccess(modelName, estimatedInputTokens, 1500);
                console.log(`[Vinzx Thinking Engine] SUKSES: Analisa diselesaikan oleh #${modelConfig.priority} ${modelConfig.displayName}.`);
                break; // Request successful, exit fallback loop

            } catch (modelError: any) {
                lastError = modelError;
                
                let statusCode = modelError?.status || modelError?.error?.code;
                let statusText = modelError?.error?.status || "";
                let message = modelError?.message || "";
                
                if (typeof modelError === 'string') message = modelError;
                
                const isRateLimitOrQuota = statusCode === 429 || statusText === "RESOURCE_EXHAUSTED" || message.includes("429") || message.toLowerCase().includes("quota");
                
                // Record failure in Token Monitoring (applies cooldown penalty if quota exhausted)
                tokenEngine.recordFailure(modelName, isRateLimitOrQuota);

                if (isRateLimitOrQuota) {
                    console.warn(`[Vinzx Thinking Engine] Kuota/Limit habis pada #${modelConfig.priority} ${modelConfig.displayName} (429 RESOURCE_EXHAUSTED). Fallback otomatis ke model berikutnya...`);
                    continue;
                } else {
                    console.warn(`[Vinzx Thinking Engine] Kendala pada #${modelConfig.priority} ${modelConfig.displayName} (${message}). Fallback otomatis ke model berikutnya...`);
                    continue;
                }
            }
        }

        if (!responseText) {
            console.error("[Vinzx Thinking Engine] Seluruh 11 tingkatan model AI gagal diakses atau tidak memiliki kuota.");
            throw lastError || new Error("INSUFFICIENT_CAPACITY: Tidak ada model AI dengan sisa kuota yang mencukupi untuk menyelesaikan analisa.");
        }

        const modelUsed = PRIORITY_MODELS.find(m => m.modelIdentifier === successfulModelName);
        return parseResponse(responseText || "{}", timeframe, currentPrice, atr, asset, setupSignature, modelUsed?.displayName || successfulModelName);

    } catch (modelError: any) {
        throw modelError;
    }

  } catch (error: any) {
    const isRateLimit = error?.status === 429 || error?.error?.code === 429 || error?.message?.includes("RESOURCE_EXHAUSTED") || error?.message?.includes("INSUFFICIENT_CAPACITY");
    if (isRateLimit) {
      console.warn("AI Analysis: Token/Quota limit reached across engines. Silakan tunggu beberapa saat atau periksa kuota API.");
    } else {
      console.error("AI Analysis Failed:", error);
    }
    const fallbackDecimals = getAssetPrecision(asset);
    const fallbackEntry = Number((candles[candles.length - 1]?.close || 0).toFixed(fallbackDecimals));
    return {
      signal: 'BUY', confidence: 50, entryPrice: fallbackEntry, stopLoss: 0, takeProfit: 0, riskRewardRatio: "0:0",
      reasoning: Array(6).fill(isRateLimit ? "SMART TOKEN ENGINE: SISA KUOTA TIDAK MENCUKUPI DI SEMUA MODEL (INSUFFICIENT_CAPACITY)." : "SYSTEM ERROR: NEURAL DISCONNECT."), smcConceptsFound: [], timestamp: new Date().toLocaleTimeString(), timeframe: timeframe,
      activeModel: "OFFLINE / INSUFFICIENT QUOTA",
      drlMetrics: { stateValue: 0, advantage: 0, buyProb: 1, sellProb: 0 }
    };
  }
};

export const parseResponse = (
    text: string, 
    timeframe: TimeFrame, 
    currentPrice: number, 
    atr: number, 
    asset: Asset, 
    setupSignature?: string, 
    activeModelName?: string
): AnalysisResult => {
    const cleanText = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleanText) as GeminiResponseSchema;

    const decimals = getAssetPrecision(asset);
    const pairProfile = getPairBehavior(asset);
    const normalizedSignal: 'BUY' | 'SELL' = result.signal === 'SELL' ? 'SELL' : 'BUY';

    const plan = enforceTimeframeTradingPlan({
      asset,
      timeframe,
      signal: normalizedSignal,
      currentPrice,
      atr,
      spreadAverage: pairProfile.spreadAverage,
      candidateEntry: result.entry,
      candidateSl: result.sl,
      candidateTp: result.tp,
    });

    const { spec, entryPrice: entry, stopLoss: sl, takeProfit: tp, tp1Price, riskRewardRatio: rrLabel } = plan;

    const nextPricePred =
      typeof result.next_price_prediction === 'number' &&
      !isNaN(result.next_price_prediction) &&
      result.next_price_prediction > 0 &&
      Math.abs(result.next_price_prediction - entry) <= Math.abs(tp - entry) * 1.25 &&
      ((normalizedSignal === 'BUY' && result.next_price_prediction > entry) ||
        (normalizedSignal === 'SELL' && result.next_price_prediction < entry))
        ? Number(result.next_price_prediction.toFixed(decimals))
        : tp1Price;

    return {
      signal: normalizedSignal,
      confidence: result.confidence,
      entryPrice: entry,
      stopLoss: sl,
      takeProfit: tp,
      riskRewardRatio: rrLabel,
      reasoning: result.reasoning,
      smcConceptsFound: result.concepts,
      prediction:
        result.prediction ||
        `Mode ${spec.modeName} (${timeframe}) - SL ${plan.usesPips ? `${plan.slPips} pips` : spec.slLabel}, TP ${plan.usesPips ? `${plan.tpPips} pips` : spec.tpLabel} pada Plan RR ${rrLabel} (TP1: 1:${spec.tp1R}, TP2: 1:${spec.tp2R}, Target Utama TP3: 1:${spec.tp3R}).`,
      nextPricePrediction: nextPricePred,
      trendPrediction: result.trend_prediction,
      timestamp: new Date().toLocaleTimeString(),
      timeframe: timeframe,
      setupSignature: setupSignature,
      activeModel: activeModelName,
      drlMetrics: result.drl_metrics ? {
        stateValue: result.drl_metrics.state_value,
        advantage: result.drl_metrics.advantage,
        buyProb: result.drl_metrics.buy_prob,
        sellProb: result.drl_metrics.sell_prob
      } : undefined
    };
};
