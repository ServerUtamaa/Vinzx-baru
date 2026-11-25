import { Asset, TimeFrame } from '../types';
import { assetUsesPips, getAssetPrecision, getPipScale } from '../utils/priceFormatters';

export interface TimeframePlanSpec {
  timeframe: TimeFrame;
  modeName: string;
  planRR: number;
  rrLabel: string;
  tp1R: number;
  tp2R: number;
  tp3R: number;
  atrMultiplier: number;
  minSlPips?: number;
  maxSlPips?: number;
  minTpPips?: number;
  maxTpPips?: number;
  isD1Structural?: boolean;
  slLabel: string;
  tpLabel: string;
}

export interface EnforcedPlanInput {
  asset: Asset | string;
  timeframe: TimeFrame;
  signal: 'BUY' | 'SELL';
  currentPrice: number;
  atr: number;
  spreadAverage?: number;
  candidateEntry?: number;
  candidateSl?: number;
  candidateTp?: number;
}

export interface EnforcedPlanResult {
  spec: TimeframePlanSpec;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  tp1Price: number;
  riskRewardRatio: string;
  slPips: number;
  tpPips: number;
  usesPips: boolean;
}

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

type AssetCategory = 'XAUUSD' | 'XAGUSD' | 'XPTUSD' | 'FOREX' | 'OTHER';

const getAssetCategory = (asset: Asset | string): AssetCategory => {
  const a = (asset || '').toUpperCase();
  if (a.includes('XAUUSD') || a.includes('GOLD')) return 'XAUUSD';
  if (a.includes('XAGUSD') || a.includes('SILVER')) return 'XAGUSD';
  if (a.includes('XPTUSD') || a.includes('PLATINUM')) return 'XPTUSD';
  if (
    a.includes('JPY') ||
    ['EURUSD', 'GBPUSD', 'AUDUSD', 'USDCHF', 'NZDUSD'].some((p) => a.includes(p))
  ) {
    return 'FOREX';
  }
  return 'OTHER';
};

export const getTimeframePlanSpec = (
  asset: Asset | string,
  timeframe: TimeFrame | string
): TimeframePlanSpec => {
  const tf = (timeframe || 'M15').toUpperCase() as TimeFrame;
  const category = getAssetCategory(asset);

  // Base Mode & RR per Timeframe (Algoritma Dapur Pacu v4.0)
  const baseMap: Record<
    TimeFrame,
    {
      modeName: string;
      planRR: number;
      rrLabel: string;
      tp1R: number;
      tp2R: number;
      tp3R: number;
      atrMultiplier: number;
      isD1Structural?: boolean;
    }
  > = {
    M1: { modeName: 'SCALPING', planRR: 2, rrLabel: '1:2', tp1R: 1.0, tp2R: 1.5, tp3R: 2.0, atrMultiplier: 1.0 },
    M5: { modeName: 'SCALPING', planRR: 2, rrLabel: '1:2', tp1R: 1.0, tp2R: 1.5, tp3R: 2.0, atrMultiplier: 1.2 },
    M15: { modeName: 'INTRADAY', planRR: 3, rrLabel: '1:3', tp1R: 1.5, tp2R: 2.0, tp3R: 3.0, atrMultiplier: 1.4 },
    M30: { modeName: 'DAY TRADE', planRR: 4, rrLabel: '1:4', tp1R: 2.0, tp2R: 3.0, tp3R: 4.0, atrMultiplier: 1.6 },
    H1: { modeName: 'SWING MINGGUAN', planRR: 5, rrLabel: '1:5', tp1R: 2.0, tp2R: 3.5, tp3R: 5.0, atrMultiplier: 2.0 },
    H4: { modeName: 'SWING BULANAN', planRR: 6, rrLabel: '1:6', tp1R: 2.5, tp2R: 4.0, tp3R: 6.0, atrMultiplier: 2.5 },
    D1: {
      modeName: 'SWING BULANAN',
      planRR: 6,
      rrLabel: '1:6',
      tp1R: 2.5,
      tp2R: 4.0,
      tp3R: 6.0,
      atrMultiplier: 2.0,
      isD1Structural: true,
    },
  };

  const base = baseMap[tf] || baseMap.M15;

  if (category === 'XAUUSD') {
    const xauRanges: Record<
      TimeFrame,
      { minSlPips: number; maxSlPips?: number; minTpPips?: number; maxTpPips?: number; slLabel: string; tpLabel: string }
    > = {
      M1: { minSlPips: 20, maxSlPips: 20, minTpPips: 40, maxTpPips: 50, slLabel: '20 pips', tpLabel: '40–50 pips' },
      M5: { minSlPips: 40, maxSlPips: 50, minTpPips: 60, maxTpPips: 120, slLabel: '40–50 pips', tpLabel: '60–120 pips' },
      M15: { minSlPips: 60, maxSlPips: 70, minTpPips: 120, maxTpPips: 240, slLabel: '60–70 pips', tpLabel: '120–240 pips' },
      M30: { minSlPips: 80, maxSlPips: 80, minTpPips: 240, maxTpPips: 350, slLabel: '80 pips', tpLabel: '240–350 pips' },
      H1: { minSlPips: 80, maxSlPips: 100, minTpPips: 360, maxTpPips: 500, slLabel: '80–100 pips', tpLabel: '360–500 pips' },
      H4: { minSlPips: 120, maxSlPips: 150, minTpPips: 500, maxTpPips: 800, slLabel: '120–150 pips', tpLabel: '500–800 pips' },
      D1: { minSlPips: 150, slLabel: 'Struktur D1 + ATR', tpLabel: '6× Risk' },
    };
    const range = xauRanges[tf] || xauRanges.M15;
    return { timeframe: tf, ...base, ...range };
  }

  if (category === 'XAGUSD') {
    const xagRanges: Record<
      TimeFrame,
      { minSlPips: number; maxSlPips?: number; minTpPips?: number; maxTpPips?: number; slLabel: string; tpLabel: string }
    > = {
      M1: { minSlPips: 20, maxSlPips: 30, minTpPips: 40, maxTpPips: 70, slLabel: '20–30 pips', tpLabel: '40–70 pips' },
      M5: { minSlPips: 40, maxSlPips: 60, minTpPips: 80, maxTpPips: 160, slLabel: '40–60 pips', tpLabel: '80–160 pips' },
      M15: { minSlPips: 80, maxSlPips: 100, minTpPips: 160, maxTpPips: 320, slLabel: '80–100 pips', tpLabel: '160–320 pips' },
      M30: { minSlPips: 100, maxSlPips: 140, minTpPips: 320, maxTpPips: 500, slLabel: '100–140 pips', tpLabel: '320–500 pips' },
      H1: { minSlPips: 140, maxSlPips: 200, minTpPips: 500, maxTpPips: 800, slLabel: '140–200 pips', tpLabel: '500–800 pips' },
      H4: { minSlPips: 200, maxSlPips: 300, minTpPips: 800, maxTpPips: 1400, slLabel: '200–300 pips', tpLabel: '800–1400 pips' },
      D1: { minSlPips: 300, slLabel: 'Struktur D1 + ATR', tpLabel: '6× Risk' },
    };
    const range = xagRanges[tf] || xagRanges.M15;
    return { timeframe: tf, ...base, ...range };
  }

  if (category === 'XPTUSD') {
    const xptRanges: Record<
      TimeFrame,
      { minSlPips: number; maxSlPips?: number; minTpPips?: number; maxTpPips?: number; slLabel: string; tpLabel: string }
    > = {
      M1: { minSlPips: 11, maxSlPips: 17, minTpPips: 22, maxTpPips: 39, slLabel: '11–17 pips', tpLabel: '22–39 pips' },
      M5: { minSlPips: 22, maxSlPips: 33, minTpPips: 44, maxTpPips: 88, slLabel: '22–33 pips', tpLabel: '44–88 pips' },
      M15: { minSlPips: 44, maxSlPips: 55, minTpPips: 88, maxTpPips: 176, slLabel: '44–55 pips', tpLabel: '88–176 pips' },
      M30: { minSlPips: 55, maxSlPips: 77, minTpPips: 176, maxTpPips: 275, slLabel: '55–77 pips', tpLabel: '176–275 pips' },
      H1: { minSlPips: 77, maxSlPips: 110, minTpPips: 275, maxTpPips: 440, slLabel: '77–110 pips', tpLabel: '275–440 pips' },
      H4: { minSlPips: 110, maxSlPips: 165, minTpPips: 440, maxTpPips: 770, slLabel: '110–165 pips', tpLabel: '440–770 pips' },
      D1: { minSlPips: 165, slLabel: 'Struktur D1 + ATR', tpLabel: '6× Risk' },
    };
    const range = xptRanges[tf] || xptRanges.M15;
    return { timeframe: tf, ...base, ...range };
  }

  if (category === 'FOREX') {
    const fxRanges: Record<
      TimeFrame,
      { minSlPips: number; maxSlPips?: number; minTpPips?: number; maxTpPips?: number; slLabel: string; tpLabel: string }
    > = {
      M1: { minSlPips: 10, maxSlPips: 15, minTpPips: 20, maxTpPips: 35, slLabel: '10–15 pips', tpLabel: '20–35 pips' },
      M5: { minSlPips: 12, maxSlPips: 20, minTpPips: 24, maxTpPips: 45, slLabel: '12–20 pips', tpLabel: '24–45 pips' },
      M15: { minSlPips: 15, maxSlPips: 30, minTpPips: 45, maxTpPips: 90, slLabel: '15–30 pips', tpLabel: '45–90 pips' },
      M30: { minSlPips: 20, maxSlPips: 40, minTpPips: 80, maxTpPips: 160, slLabel: '20–40 pips', tpLabel: '80–160 pips' },
      H1: { minSlPips: 30, maxSlPips: 55, minTpPips: 150, maxTpPips: 275, slLabel: '30–55 pips', tpLabel: '150–275 pips' },
      H4: { minSlPips: 50, maxSlPips: 100, minTpPips: 300, maxTpPips: 600, slLabel: '50–100 pips', tpLabel: '300–600 pips' },
      D1: { minSlPips: 80, slLabel: 'Struktur D1 + ATR', tpLabel: '6× Risk' },
    };
    const range = fxRanges[tf] || fxRanges.M15;
    return { timeframe: tf, ...base, ...range };
  }

  return {
    timeframe: tf,
    ...base,
    slLabel: base.isD1Structural ? 'Struktur D1 + ATR' : `ATR ${base.atrMultiplier}×`,
    tpLabel: `${base.planRR}× Risk`,
  };
};

export const enforceTimeframeTradingPlan = (input: EnforcedPlanInput): EnforcedPlanResult => {
  const {
    asset,
    timeframe,
    signal,
    currentPrice,
    atr,
    spreadAverage = 0,
    candidateEntry,
    candidateSl,
    candidateTp,
  } = input;

  const spec = getTimeframePlanSpec(asset, timeframe);
  const decimals = getAssetPrecision(asset);
  const pipScale = getPipScale(asset);
  const pipSize = 1 / pipScale;
  const usesPips = assetUsesPips(asset);
  const minStep = Math.pow(10, -decimals);

  const safeCurrent = currentPrice > 0 && isFinite(currentPrice) ? currentPrice : 1;
  const safeAtr = atr > 0 && isFinite(atr) ? atr : Math.max(safeCurrent * 0.001, minStep * 20);

  // Determine valid reference entry first so we can measure candidate structural risk
  const hasValidCandidateEntry =
    typeof candidateEntry === 'number' &&
    isFinite(candidateEntry) &&
    candidateEntry > 0 &&
    Math.abs(candidateEntry - safeCurrent) / safeCurrent <= 0.1;

  const refEntry = hasValidCandidateEntry ? candidateEntry! : safeCurrent;

  const hasValidCandidateSl =
    typeof candidateSl === 'number' &&
    isFinite(candidateSl) &&
    candidateSl > 0 &&
    ((signal === 'BUY' && candidateSl < refEntry) || (signal === 'SELL' && candidateSl > refEntry));

  const rawCandidateRisk = hasValidCandidateSl
    ? Math.abs(refEntry - candidateSl!)
    : safeAtr * spec.atrMultiplier;

  // 1. Compute Risk Distance strictly within timeframe SL envelope
  let riskPrice = rawCandidateRisk;

  if (spec.minSlPips !== undefined) {
    const minSlPrice = spec.minSlPips * pipSize;
    if (spec.isD1Structural) {
      // D1: Struktur D1 + ATR, floored at minSlPips and ATR * 2.0, capped safely
      const d1Floor = Math.max(minSlPrice, safeAtr * spec.atrMultiplier, spreadAverage * 3.5);
      const d1Ceiling = Math.max(d1Floor * 2.5, safeAtr * 4.5, minSlPrice * 3.5);
      riskPrice = clamp(rawCandidateRisk, d1Floor, d1Ceiling);
    } else {
      const maxSlPrice = (spec.maxSlPips ?? spec.minSlPips) * pipSize;
      riskPrice = clamp(rawCandidateRisk, minSlPrice, maxSlPrice);
    }
  } else {
    const atrMin = Math.max(safeAtr * spec.atrMultiplier, spreadAverage * 3.5, safeCurrent * 0.0012, minStep * 10);
    const atrMax = Math.max(atrMin * 2.0, safeAtr * (spec.atrMultiplier * 2.2), safeCurrent * (spec.isD1Structural ? 0.08 : 0.03));
    riskPrice = clamp(rawCandidateRisk, atrMin, atrMax);
  }

  // 2. Anchor Entry realistically near Current Price (Zero-Floating Limit Rule)
  let entry = hasValidCandidateEntry ? candidateEntry! : safeCurrent;
  if (signal === 'BUY' && entry > safeCurrent) {
    entry = safeCurrent;
  } else if (signal === 'SELL' && entry < safeCurrent) {
    entry = safeCurrent;
  }

  const maxEntryPullback = Math.min(Math.max(riskPrice * 1.5, pipSize * 5), safeCurrent * 0.05);
  if (signal === 'BUY' && safeCurrent - entry > maxEntryPullback) {
    entry = safeCurrent - maxEntryPullback;
  } else if (signal === 'SELL' && entry - safeCurrent > maxEntryPullback) {
    entry = safeCurrent + maxEntryPullback;
  }

  const factor = Math.pow(10, decimals);
  entry =
    signal === 'BUY'
      ? Math.floor(entry * factor) / factor
      : Math.ceil(entry * factor) / factor;
  entry = Number(entry.toFixed(decimals));

  // 3. Apply exact SL from anchored Entry & recompute actual rounded risk
  let sl = signal === 'BUY' ? entry - riskPrice : entry + riskPrice;
  sl = Number(sl.toFixed(decimals));

  // Guarantee non-zero separation after rounding
  if (Math.abs(entry - sl) < minStep) {
    sl = Number((signal === 'BUY' ? entry - minStep * 10 : entry + minStep * 10).toFixed(decimals));
  }

  const actualRiskPrice = Math.abs(entry - sl);

  // 4. Compute TP strictly following Mode Plan RR and TF TP range
  let tpDistance = actualRiskPrice * spec.planRR;

  if (!spec.isD1Structural && spec.minTpPips !== undefined && spec.maxTpPips !== undefined) {
    const actualRiskPips = actualRiskPrice * pipScale;
    const derivedTpPips = actualRiskPips * spec.planRR;
    const minTp = spec.minTpPips;
    const maxTp = spec.maxTpPips;

    const hasValidCandidateTp =
      typeof candidateTp === 'number' &&
      isFinite(candidateTp) &&
      candidateTp > 0 &&
      ((signal === 'BUY' && candidateTp > entry) || (signal === 'SELL' && candidateTp < entry));

    let finalTpPips = clamp(derivedTpPips, minTp, maxTp);

    if (hasValidCandidateTp) {
      const candidateTpPips = Math.abs(candidateTp! - entry) * pipScale;
      const floorWithRR = Math.min(maxTp, Math.max(minTp, derivedTpPips));
      if (candidateTpPips >= floorWithRR && candidateTpPips <= maxTp) {
        finalTpPips = candidateTpPips;
      }
    }

    tpDistance = finalTpPips * pipSize;
  }

  const tp = Number((signal === 'BUY' ? entry + tpDistance : entry - tpDistance).toFixed(decimals));
  const tp1Distance = Math.min(tpDistance, actualRiskPrice * spec.tp1R);
  const tp1Price = Number((signal === 'BUY' ? entry + tp1Distance : entry - tp1Distance).toFixed(decimals));

  const slPips = Number((Math.abs(entry - sl) * pipScale).toFixed(1));
  const tpPips = Number((Math.abs(tp - entry) * pipScale).toFixed(1));

  return {
    spec,
    entryPrice: entry,
    stopLoss: sl,
    takeProfit: tp,
    tp1Price,
    riskRewardRatio: spec.rrLabel,
    slPips,
    tpPips,
    usesPips,
  };
};
