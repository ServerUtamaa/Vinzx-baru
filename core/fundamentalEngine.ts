/**
 * VINZX FUNDAMENTAL INTELLIGENCE ENGINE
 * Comprehensive Economic News, Multi-Asset Impact & Volatility Range System
 * Covers: Forex (EUR, USD, GBP, JPY, AUD, NZD, CAD, CHF, CNY), Commodities (XAUUSD, XAGUSD, USOIL), Indices, Crypto (BTC, ETH, SOL)
 */

export interface RawCalendarEvent {
  title: string;
  country: string;
  currency?: string;
  date: string;
  impact: 'High' | 'Medium' | 'Low' | string;
  forecast?: string;
  previous?: string;
  revisedPrevious?: string;
  actual?: string;
  unit?: string;
  category?: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  country: string;
  currency: string;
  date: Date;
  timeString: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  importanceScore: number; // 0 - 100
  previous: string;
  revisedPrevious: string;
  forecast: string;
  actual: string;
  isActualPending: boolean;
  isForecastUnknown: boolean;
  unit: string;
  numericPrevious: number | null;
  numericRevised: number | null;
  numericForecast: number | null;
  numericActual: number | null;
  surpriseValue: number | null;
  normalizedSurprise: number | null;
  surpriseCategory: 'Extreme Positive' | 'Strong Positive' | 'Moderate Positive' | 'Neutral' | 'Moderate Negative' | 'Strong Negative' | 'Extreme Negative' | 'PENDING';
  headlineSurprise: string;
  revisionEffect: 'EXPANDING' | 'CONTRACTING' | 'NEUTRAL' | 'NONE';
  trendEffect: string;
  centralBankRelevance: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

export interface NewsCluster {
  id: string;
  currency: string;
  startTime: Date;
  endTime: Date;
  timeRangeString: string;
  events: EconomicEvent[];
  highestImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  clusterImpactScore: number;
  combinedPressure: number; // -100 to +100
  grossPositive: number;
  grossNegative: number;
  netPressure: number;
  conflictLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  clusterDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
  sequentialEffect: Array<{
    sequenceIndex: number;
    title: string;
    role: 'INITIAL_REACTION' | 'CONFIRMATION_CONTRADICTION' | 'FINAL_CONFIRMATION_REVERSAL';
    note: string;
  }>;
}

export interface CurrencyStrengthScore {
  currency: string;
  score: number; // -100 to +100
  classification: 'Extremely Strong' | 'Strong' | 'Moderate' | 'Neutral' | 'Moderate Weak' | 'Strong Weakness' | 'Extremely Weak';
  dominantEventsCount: number;
}

export interface AssetImpactItem {
  assetSymbol: string;
  category: 'FOREX' | 'COMMODITY' | 'CRYPTO' | 'INDEX';
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  driverReason: string;
  expectedMoveLow: string;
  expectedMoveBase: string;
  expectedMoveHigh: string;
  expectedMoveExtreme: string;
}

export interface ReactionProbabilities {
  flyOneWay: number;     // 0 - 100%
  spikeReversal: number;  // 0 - 100%
  twoWayVolatility: number; // 0 - 100%
  neutral: number;        // 0 - 100%
  dominantReaction: 'FLY / ONE-WAY' | 'SPIKE / REVERSAL' | 'TWO-WAY VOLATILITY' | 'NEUTRAL';
  expectedVolatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

export interface FundamentalIntelligenceReport {
  timestamp: string;
  primaryEvent: EconomicEvent;
  cluster: NewsCluster | null;
  currencyPressureScore: number; // -100 to +100
  fundamentalDirection: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
  fundamentalStrength: number; // 0 - 100
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  timeUntilNews: string;
  marketPricing: 'PRICED-IN' | 'PARTIALLY PRICED-IN' | 'NOT PRICED-IN' | 'UNKNOWN';
  marketRegime: 'TRENDING' | 'RANGING' | 'COMPRESSED' | 'EXPANDING' | 'OVEREXTENDED';
  reactionProbabilities: ReactionProbabilities;
  currencyMatrix: Record<string, CurrencyStrengthScore>;
  assetImpacts: Record<string, AssetImpactItem>;
  riskAssessment: {
    spreadRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    fakeBreakoutRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    reversalRisk: 'LOW' | 'MEDIUM' | 'HIGH';
    twoWayRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  reasons: string[];
  terminalReportText: string;
}

// -------------------------------------------------------------
// HELPER PARSERS
// -------------------------------------------------------------

export function parseNumericValue(raw?: string): { num: number | null; unit: string } {
  if (!raw || raw.trim() === '' || raw.trim() === '-' || raw.toLowerCase().includes('pending')) {
    return { num: null, unit: '' };
  }
  const clean = raw.trim();
  // Match currency or unit signs: %, K, M, B, etc.
  const match = clean.match(/^([+-]?[\d,.]+)\s*([%kKmMbBtT]?.*)$/);
  if (match) {
    const numPart = match[1].replace(/,/g, '');
    const parsed = parseFloat(numPart);
    return {
      num: isNaN(parsed) ? null : parsed,
      unit: match[2]?.trim() || ''
    };
  }
  const directFloat = parseFloat(clean.replace(/,/g, ''));
  return {
    num: isNaN(directFloat) ? null : directFloat,
    unit: ''
  };
}

export function normalizeCurrency(countryOrCurrency: string): string {
  const code = (countryOrCurrency || '').toUpperCase().trim();
  const map: Record<string, string> = {
    'US': 'USD', 'USA': 'USD', 'UNITED STATES': 'USD',
    'EU': 'EUR', 'EMU': 'EUR', 'EURO AREA': 'EUR', 'GERMANY': 'EUR', 'FRANCE': 'EUR', 'ITALY': 'EUR',
    'UK': 'GBP', 'GB': 'GBP', 'BRITAIN': 'GBP', 'UNITED KINGDOM': 'GBP',
    'JP': 'JPY', 'JAPAN': 'JPY',
    'AU': 'AUD', 'AUSTRALIA': 'AUD',
    'NZ': 'NZD', 'NEW ZEALAND': 'NZD',
    'CA': 'CAD', 'CANADA': 'CAD',
    'CH': 'CHF', 'SWITZERLAND': 'CHF',
    'CN': 'CNY', 'CHINA': 'CNY'
  };
  return map[code] || code;
}

export function calculateEventImportance(title: string, impact: string, country: string): { score: number; centralBank: 'HIGH' | 'MEDIUM' | 'LOW' } {
  const t = title.toLowerCase();
  const imp = impact.toLowerCase();
  let baseScore = imp.includes('high') ? 80 : (imp.includes('medium') ? 50 : 25);
  let cbRelevance: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  // Major Tier-1 Economic Catalysts
  if (t.includes('interest rate') || t.includes('fed rate') || t.includes('fomc') || t.includes('ecb rate') || t.includes('monetary policy')) {
    baseScore = 98;
    cbRelevance = 'HIGH';
  } else if (t.includes('cpi') || t.includes('inflation') || t.includes('pce')) {
    baseScore = 94;
    cbRelevance = 'HIGH';
  } else if (t.includes('non-farm') || t.includes('nfp') || t.includes('unemployment rate') || t.includes('employment change')) {
    baseScore = 92;
    cbRelevance = 'HIGH';
  } else if (t.includes('gdp') || t.includes('gross domestic product')) {
    baseScore = 88;
    cbRelevance = 'MEDIUM';
  } else if (t.includes('pmi') || t.includes('retail sales') || t.includes('ism')) {
    baseScore = 84;
    cbRelevance = 'MEDIUM';
  } else if (t.includes('crude oil') || t.includes('inventory') || t.includes('eia')) {
    baseScore = 78;
    cbRelevance = 'LOW';
  }

  // Major Currency Boost
  const cur = normalizeCurrency(country);
  if (['USD', 'EUR'].includes(cur)) baseScore += 2;

  return {
    score: Math.min(100, Math.max(10, baseScore)),
    centralBank: cbRelevance
  };
}

// -------------------------------------------------------------
// EVENT SANITIZER
// -------------------------------------------------------------

export function sanitizeCalendarEvents(rawEvents: RawCalendarEvent[]): EconomicEvent[] {
  return rawEvents.map((raw, idx) => {
    const currency = normalizeCurrency(raw.currency || raw.country);
    const date = new Date(raw.date);
    const impactUpper = (raw.impact || 'LOW').toUpperCase();
    const impact = impactUpper.includes('HIGH') ? 'HIGH' : (impactUpper.includes('MED') ? 'MEDIUM' : 'LOW');
    
    const prevParsed = parseNumericValue(raw.previous);
    const revParsed = parseNumericValue(raw.revisedPrevious);
    const foreParsed = parseNumericValue(raw.forecast);
    const actParsed = parseNumericValue(raw.actual);

    const isActualPending = actParsed.num === null;
    const isForecastUnknown = foreParsed.num === null;

    let surpriseVal: number | null = null;
    let normSurprise: number | null = null;
    let surpriseCategory: EconomicEvent['surpriseCategory'] = 'PENDING';
    let headlineSurprise = 'Actual Pending';

    if (!isActualPending && !isForecastUnknown && actParsed.num !== null && foreParsed.num !== null) {
      surpriseVal = Number((actParsed.num - foreParsed.num).toFixed(4));
      // Normalization scale based on magnitude
      const denominator = Math.abs(foreParsed.num) > 0.0001 ? Math.abs(foreParsed.num) : 1;
      normSurprise = Number(((surpriseVal / denominator) * 10).toFixed(2));

      if (normSurprise >= 3.0) surpriseCategory = 'Extreme Positive';
      else if (normSurprise >= 1.5) surpriseCategory = 'Strong Positive';
      else if (normSurprise >= 0.4) surpriseCategory = 'Moderate Positive';
      else if (normSurprise > -0.4) surpriseCategory = 'Neutral';
      else if (normSurprise > -1.5) surpriseCategory = 'Moderate Negative';
      else if (normSurprise > -3.0) surpriseCategory = 'Strong Negative';
      else surpriseCategory = 'Extreme Negative';

      headlineSurprise = `${surpriseVal > 0 ? '+' : ''}${surpriseVal} ${actParsed.unit || ''} (${surpriseCategory})`;
    } else if (!isActualPending && actParsed.num !== null && prevParsed.num !== null) {
      // Compare vs previous if forecast is missing
      surpriseVal = Number((actParsed.num - prevParsed.num).toFixed(4));
      headlineSurprise = `vs Prev: ${surpriseVal > 0 ? '+' : ''}${surpriseVal} ${actParsed.unit || ''}`;
      surpriseCategory = surpriseVal > 0 ? 'Moderate Positive' : (surpriseVal < 0 ? 'Moderate Negative' : 'Neutral');
    }

    // Revision Effect
    let revisionEffect: EconomicEvent['revisionEffect'] = 'NONE';
    if (revParsed.num !== null && prevParsed.num !== null) {
      if (revParsed.num > prevParsed.num) revisionEffect = 'EXPANDING';
      else if (revParsed.num < prevParsed.num) revisionEffect = 'CONTRACTING';
      else revisionEffect = 'NEUTRAL';
    }

    const { score, centralBank } = calculateEventImportance(raw.title, impact, currency);

    return {
      id: `ev-${idx}-${raw.title.slice(0, 15).replace(/\s+/g, '-')}-${date.getTime()}`,
      title: raw.title,
      country: raw.country || currency,
      currency,
      date,
      timeString: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      impact,
      importanceScore: score,
      previous: raw.previous || 'UNKNOWN',
      revisedPrevious: raw.revisedPrevious || raw.previous || 'UNKNOWN',
      forecast: raw.forecast || 'UNKNOWN',
      actual: raw.actual || 'PENDING',
      isActualPending,
      isForecastUnknown,
      unit: actParsed.unit || foreParsed.unit || prevParsed.unit || '',
      numericPrevious: prevParsed.num,
      numericRevised: revParsed.num,
      numericForecast: foreParsed.num,
      numericActual: actParsed.num,
      surpriseValue: surpriseVal,
      normalizedSurprise: normSurprise,
      surpriseCategory,
      headlineSurprise,
      revisionEffect,
      trendEffect: isActualPending ? 'Awaiting Data Release' : (surpriseCategory.includes('Positive') ? 'Bullish Acceleration' : (surpriseCategory.includes('Negative') ? 'Bearish Contraction' : 'Neutral Equilibrium')),
      centralBankRelevance: centralBank,
      category: raw.category || 'Macroeconomic'
    };
  });
}

// -------------------------------------------------------------
// NEWS CLUSTER ENGINE (±5m, ±15m, ±30m, ±60m)
// -------------------------------------------------------------

export function detectNewsClusters(events: EconomicEvent[], windowMinutes: number = 30): NewsCluster[] {
  if (events.length === 0) return [];

  // Group events by currency first
  const byCurrency: Record<string, EconomicEvent[]> = {};
  events.forEach(e => {
    if (!byCurrency[e.currency]) byCurrency[e.currency] = [];
    byCurrency[e.currency].push(e);
  });

  const clusters: NewsCluster[] = [];

  Object.entries(byCurrency).forEach(([curr, curEvents]) => {
    curEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    let currentGroup: EconomicEvent[] = [];

    curEvents.forEach((ev) => {
      if (currentGroup.length === 0) {
        currentGroup.push(ev);
      } else {
        const lastEvent = currentGroup[currentGroup.length - 1];
        const diffMs = Math.abs(ev.date.getTime() - lastEvent.date.getTime());
        const diffMins = diffMs / (1000 * 60);

        if (diffMins <= windowMinutes) {
          currentGroup.push(ev);
        } else {
          // Finalize cluster
          clusters.push(buildClusterFromGroup(curr, currentGroup));
          currentGroup = [ev];
        }
      }
    });

    if (currentGroup.length > 0) {
      clusters.push(buildClusterFromGroup(curr, currentGroup));
    }
  });

  // Sort clusters chronologically
  return clusters.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

function buildClusterFromGroup(currency: string, group: EconomicEvent[]): NewsCluster {
  const startTime = group[0].date;
  const endTime = group[group.length - 1].date;
  const hasHigh = group.some(e => e.impact === 'HIGH');
  const hasMed = group.some(e => e.impact === 'MEDIUM');
  const highestImpact = hasHigh ? 'HIGH' : (hasMed ? 'MEDIUM' : 'LOW');

  let grossPositive = 0;
  let grossNegative = 0;

  group.forEach(e => {
    const weight = e.importanceScore / 100;
    if (e.isActualPending) {
      // In pending state, look at forecast vs previous bias
      if (e.numericForecast !== null && e.numericPrevious !== null) {
        if (e.numericForecast > e.numericPrevious) grossPositive += 15 * weight;
        else if (e.numericForecast < e.numericPrevious) grossNegative += 15 * weight;
      } else {
        grossPositive += 5 * weight;
        grossNegative += 5 * weight;
      }
    } else {
      if (e.surpriseCategory.includes('Positive')) {
        grossPositive += 35 * weight;
      } else if (e.surpriseCategory.includes('Negative')) {
        grossNegative += 35 * weight;
      } else {
        grossPositive += 5 * weight;
        grossNegative += 5 * weight;
      }
    }
  });

  const netPressure = Math.round(grossPositive - grossNegative);
  const totalVolume = grossPositive + grossNegative;
  const conflictRatio = totalVolume > 0 ? Math.min(grossPositive, grossNegative) / totalVolume : 0;
  const conflictLevel = conflictRatio > 0.35 ? 'HIGH' : (conflictRatio > 0.15 ? 'MEDIUM' : 'LOW');

  let clusterDirection: NewsCluster['clusterDirection'] = 'NEUTRAL';
  if (conflictLevel === 'HIGH' && Math.abs(netPressure) < 15) {
    clusterDirection = 'MIXED';
  } else if (netPressure >= 15) {
    clusterDirection = 'BULLISH';
  } else if (netPressure <= -15) {
    clusterDirection = 'BEARISH';
  }

  // Sequences
  const sequentialEffect = group.map((e, idx) => {
    let role: NewsCluster['sequentialEffect'][0]['role'] = 'INITIAL_REACTION';
    let note = 'Initial market reaction & spread spike';
    if (idx === 1) {
      role = 'CONFIRMATION_CONTRADICTION';
      note = 'Confirms or contradicts initial impulse';
    } else if (idx >= 2) {
      role = 'FINAL_CONFIRMATION_REVERSAL';
      note = 'Final directional push or liquidity sweep reversal';
    }
    return {
      sequenceIndex: idx + 1,
      title: e.title,
      role,
      note
    };
  });

  return {
    id: `cluster-${currency}-${startTime.getTime()}`,
    currency,
    startTime,
    endTime,
    timeRangeString: `${startTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${endTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
    events: group,
    highestImpact,
    clusterImpactScore: Math.max(...group.map(e => e.importanceScore)),
    combinedPressure: Math.min(100, Math.max(-100, netPressure * 2)),
    grossPositive: Math.round(grossPositive),
    grossNegative: Math.round(grossNegative),
    netPressure,
    conflictLevel,
    clusterDirection,
    sequentialEffect
  };
}

// -------------------------------------------------------------
// CURRENCY STRENGTH MATRIX (-100 to +100)
// USD, EUR, GBP, JPY, AUD, NZD, CAD, CHF, CNY
// -------------------------------------------------------------

export function calculateCurrencyStrengthMatrix(events: EconomicEvent[]): Record<string, CurrencyStrengthScore> {
  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'NZD', 'CAD', 'CHF', 'CNY'];
  const matrix: Record<string, CurrencyStrengthScore> = {};

  currencies.forEach(cur => {
    const curEvents = events.filter(e => e.currency === cur);
    let score = 0;

    if (curEvents.length === 0) {
      // Neutral default
      matrix[cur] = {
        currency: cur,
        score: 0,
        classification: 'Neutral',
        dominantEventsCount: 0
      };
      return;
    }

    curEvents.forEach(e => {
      const weight = (e.importanceScore / 100);
      if (e.isActualPending) {
        if (e.numericForecast !== null && e.numericPrevious !== null) {
          const delta = e.numericForecast - e.numericPrevious;
          score += (delta > 0 ? 12 : (delta < 0 ? -12 : 0)) * weight;
        }
      } else {
        if (e.surpriseCategory === 'Extreme Positive') score += 40 * weight;
        else if (e.surpriseCategory === 'Strong Positive') score += 28 * weight;
        else if (e.surpriseCategory === 'Moderate Positive') score += 15 * weight;
        else if (e.surpriseCategory === 'Moderate Negative') score -= 15 * weight;
        else if (e.surpriseCategory === 'Strong Negative') score -= 28 * weight;
        else if (e.surpriseCategory === 'Extreme Negative') score -= 40 * weight;
      }
    });

    const clampedScore = Math.min(100, Math.max(-100, Math.round(score)));

    let classification: CurrencyStrengthScore['classification'] = 'Neutral';
    if (clampedScore >= 80) classification = 'Extremely Strong';
    else if (clampedScore >= 60) classification = 'Strong';
    else if (clampedScore >= 30) classification = 'Moderate';
    else if (clampedScore > -30) classification = 'Neutral';
    else if (clampedScore > -60) classification = 'Moderate Weak';
    else if (clampedScore > -80) classification = 'Strong Weakness';
    else classification = 'Extremely Weak';

    matrix[cur] = {
      currency: cur,
      score: clampedScore,
      classification,
      dominantEventsCount: curEvents.length
    };
  });

  return matrix;
}

// -------------------------------------------------------------
// REACTION CLASSIFIER (FLY, SPIKE, TWO-WAY, NEUTRAL)
// -------------------------------------------------------------

export function classifyMarketReaction(cluster: NewsCluster | null, primaryEvent: EconomicEvent): ReactionProbabilities {
  const isPending = primaryEvent.isActualPending;
  const isHighImpact = primaryEvent.impact === 'HIGH';
  const conflict = cluster ? cluster.conflictLevel : 'LOW';
  const importance = primaryEvent.importanceScore;

  let fly = 20;
  let spike = 35;
  let twoWay = 25;
  let neutral = 20;

  if (isPending) {
    // Pre-news distribution
    if (isHighImpact) {
      spike = 40;
      twoWay = 30;
      fly = 20;
      neutral = 10;
    } else {
      neutral = 40;
      spike = 30;
      twoWay = 20;
      fly = 10;
    }
  } else {
    // Post-news actual reaction
    if (primaryEvent.surpriseCategory.includes('Extreme') || primaryEvent.surpriseCategory.includes('Strong')) {
      if (conflict === 'LOW') {
        fly = 65;
        spike = 20;
        twoWay = 10;
        neutral = 5;
      } else {
        twoWay = 50;
        spike = 30;
        fly = 15;
        neutral = 5;
      }
    } else if (primaryEvent.surpriseCategory === 'Neutral') {
      neutral = 60;
      spike = 20;
      twoWay = 15;
      fly = 5;
    } else {
      // Moderate surprise
      if (conflict === 'HIGH') {
        twoWay = 45;
        spike = 35;
        fly = 10;
        neutral = 10;
      } else {
        spike = 40;
        fly = 35;
        twoWay = 15;
        neutral = 10;
      }
    }
  }

  // Normalize to 100%
  const total = fly + spike + twoWay + neutral;
  fly = Math.round((fly / total) * 100);
  spike = Math.round((spike / total) * 100);
  twoWay = Math.round((twoWay / total) * 100);
  neutral = 100 - (fly + spike + twoWay);

  const maxVal = Math.max(fly, spike, twoWay, neutral);
  let dominantReaction: ReactionProbabilities['dominantReaction'] = 'SPIKE / REVERSAL';
  if (maxVal === fly) dominantReaction = 'FLY / ONE-WAY';
  else if (maxVal === spike) dominantReaction = 'SPIKE / REVERSAL';
  else if (maxVal === twoWay) dominantReaction = 'TWO-WAY VOLATILITY';
  else dominantReaction = 'NEUTRAL';

  let expectedVolatility: ReactionProbabilities['expectedVolatility'] = 'MEDIUM';
  if (importance >= 90) expectedVolatility = 'EXTREME';
  else if (importance >= 75) expectedVolatility = 'HIGH';
  else if (importance >= 50) expectedVolatility = 'MEDIUM';
  else expectedVolatility = 'LOW';

  return {
    flyOneWay: fly,
    spikeReversal: spike,
    twoWayVolatility: twoWay,
    neutral,
    dominantReaction,
    expectedVolatility
  };
}

// -------------------------------------------------------------
// CROSS-ASSET IMPACT & EXPECTED RANGE ENGINE
// Forex (pips), Gold (USD/pts), Oil (USD), Index (pts), Crypto (%/USD)
// -------------------------------------------------------------

export function calculateAssetImpacts(
  matrix: Record<string, CurrencyStrengthScore>,
  primaryCluster: NewsCluster | null,
  primaryEvent: EconomicEvent
): Record<string, AssetImpactItem> {
  const usdScore = matrix['USD']?.score ?? 0;
  const eurScore = matrix['EUR']?.score ?? 0;
  const gbpScore = matrix['GBP']?.score ?? 0;
  const jpyScore = matrix['JPY']?.score ?? 0;

  const isHigh = primaryEvent.impact === 'HIGH';
  const mult = isHigh ? 1.8 : 1.0;

  const assets: Record<string, AssetImpactItem> = {};

  // 1. EURUSD
  const eurusdDiff = eurScore - usdScore;
  assets['EURUSD'] = {
    assetSymbol: 'EURUSD',
    category: 'FOREX',
    direction: eurusdDiff >= 20 ? 'BULLISH' : (eurusdDiff <= -20 ? 'BEARISH' : 'NEUTRAL'),
    confidence: Math.abs(eurusdDiff) > 40 ? 'HIGH' : (Math.abs(eurusdDiff) > 15 ? 'MEDIUM' : 'LOW'),
    driverReason: `EUR diff ${eurusdDiff > 0 ? '+' : ''}${eurusdDiff} vs USD (EUR: ${eurScore} | USD: ${usdScore})`,
    expectedMoveLow: `${Math.round(15 * mult)}–${Math.round(25 * mult)} pips`,
    expectedMoveBase: `${Math.round(25 * mult)}–${Math.round(50 * mult)} pips`,
    expectedMoveHigh: `${Math.round(50 * mult)}–${Math.round(90 * mult)} pips`,
    expectedMoveExtreme: `${Math.round(90 * mult)}+ pips`
  };

  // 2. GBPUSD
  const gbpusdDiff = gbpScore - usdScore;
  assets['GBPUSD'] = {
    assetSymbol: 'GBPUSD',
    category: 'FOREX',
    direction: gbpusdDiff >= 20 ? 'BULLISH' : (gbpusdDiff <= -20 ? 'BEARISH' : 'NEUTRAL'),
    confidence: Math.abs(gbpusdDiff) > 40 ? 'HIGH' : (Math.abs(gbpusdDiff) > 15 ? 'MEDIUM' : 'LOW'),
    driverReason: `GBP diff ${gbpusdDiff > 0 ? '+' : ''}${gbpusdDiff} vs USD (GBP: ${gbpScore} | USD: ${usdScore})`,
    expectedMoveLow: `${Math.round(18 * mult)}–${Math.round(30 * mult)} pips`,
    expectedMoveBase: `${Math.round(30 * mult)}–${Math.round(65 * mult)} pips`,
    expectedMoveHigh: `${Math.round(65 * mult)}–${Math.round(110 * mult)} pips`,
    expectedMoveExtreme: `${Math.round(110 * mult)}+ pips`
  };

  // 3. USDJPY
  const usdjpyDiff = usdScore - jpyScore;
  assets['USDJPY'] = {
    assetSymbol: 'USDJPY',
    category: 'FOREX',
    direction: usdjpyDiff >= 20 ? 'BULLISH' : (usdjpyDiff <= -20 ? 'BEARISH' : 'NEUTRAL'),
    confidence: Math.abs(usdjpyDiff) > 40 ? 'HIGH' : (Math.abs(usdjpyDiff) > 15 ? 'MEDIUM' : 'LOW'),
    driverReason: `USD diff ${usdjpyDiff > 0 ? '+' : ''}${usdjpyDiff} vs JPY (USD: ${usdScore} | JPY: ${jpyScore})`,
    expectedMoveLow: `${Math.round(20 * mult)}–${Math.round(35 * mult)} pips`,
    expectedMoveBase: `${Math.round(35 * mult)}–${Math.round(75 * mult)} pips`,
    expectedMoveHigh: `${Math.round(75 * mult)}–${Math.round(130 * mult)} pips`,
    expectedMoveExtreme: `${Math.round(130 * mult)}+ pips`
  };

  // 4. XAUUSD (Gold)
  // Gold correlates negatively with USD strength & Treasury yields, positively with safe haven demand
  const goldDirection = usdScore >= 25 ? 'BEARISH' : (usdScore <= -25 ? 'BULLISH' : 'NEUTRAL');
  assets['XAUUSD'] = {
    assetSymbol: 'XAUUSD',
    category: 'COMMODITY',
    direction: goldDirection,
    confidence: Math.abs(usdScore) > 35 ? 'HIGH' : 'MEDIUM',
    driverReason: `USD Pressure (${usdScore > 0 ? '+' : ''}${usdScore}) + Real Yield correlation & Safe Haven flows`,
    expectedMoveLow: `$${(8 * mult).toFixed(1)}–$${(15 * mult).toFixed(1)}`,
    expectedMoveBase: `$${(15 * mult).toFixed(1)}–$${(30 * mult).toFixed(1)}`,
    expectedMoveHigh: `$${(30 * mult).toFixed(1)}–$${(55 * mult).toFixed(1)}`,
    expectedMoveExtreme: `$${(55 * mult).toFixed(1)}+`
  };

  // 5. XAGUSD (Silver)
  const silverDirection = usdScore >= 25 ? 'BEARISH' : (usdScore <= -25 ? 'BULLISH' : 'NEUTRAL');
  assets['XAGUSD'] = {
    assetSymbol: 'XAGUSD',
    category: 'COMMODITY',
    direction: silverDirection,
    confidence: Math.abs(usdScore) > 35 ? 'HIGH' : 'MEDIUM',
    driverReason: `High-beta precious metals reaction to USD differential & industrial demand expectations`,
    expectedMoveLow: `$${(0.25 * mult).toFixed(2)}–$${(0.50 * mult).toFixed(2)}`,
    expectedMoveBase: `$${(0.50 * mult).toFixed(2)}–$${(1.10 * mult).toFixed(2)}`,
    expectedMoveHigh: `$${(1.10 * mult).toFixed(2)}–$${(2.20 * mult).toFixed(2)}`,
    expectedMoveExtreme: `$${(2.20 * mult).toFixed(2)}+`
  };

  // 6. USOIL (WTI Crude Oil)
  // Affected by global growth PMI / inventory / USD
  const isOilNews = primaryEvent.title.toLowerCase().includes('oil') || primaryEvent.title.toLowerCase().includes('inventory');
  let oilDirection: AssetImpactItem['direction'] = 'NEUTRAL';
  if (isOilNews) {
    if (primaryEvent.surpriseCategory.includes('Negative')) oilDirection = 'BULLISH'; // Drawdown = bullish
    else if (primaryEvent.surpriseCategory.includes('Positive')) oilDirection = 'BEARISH'; // Build = bearish
  } else {
    oilDirection = usdScore >= 30 ? 'BEARISH' : (usdScore <= -30 ? 'BULLISH' : 'NEUTRAL');
  }

  assets['USOIL'] = {
    assetSymbol: 'USOIL',
    category: 'COMMODITY',
    direction: oilDirection,
    confidence: isOilNews ? 'HIGH' : 'MEDIUM',
    driverReason: isOilNews ? `EIA Petroleum Inventory balance & refinery utilization shock` : `USD currency pricing factor + Macro global demand outlook`,
    expectedMoveLow: `$${(0.40 * mult).toFixed(2)}–$${(0.80 * mult).toFixed(2)}`,
    expectedMoveBase: `$${(0.80 * mult).toFixed(2)}–$${(1.80 * mult).toFixed(2)}`,
    expectedMoveHigh: `$${(1.80 * mult).toFixed(2)}–$${(3.50 * mult).toFixed(2)}`,
    expectedMoveExtreme: `$${(3.50 * mult).toFixed(2)}+`
  };

  // 7. BTC (Bitcoin)
  // Macro liquidity + DXY pressure + Risk-On/Risk-Off
  const btcDirection = usdScore >= 35 ? 'BEARISH' : (usdScore <= -35 ? 'BULLISH' : 'NEUTRAL');
  assets['BTC'] = {
    assetSymbol: 'BTC',
    category: 'CRYPTO',
    direction: btcDirection,
    confidence: 'MEDIUM',
    driverReason: `Global fiat liquidity factor (USD: ${usdScore}) + High-beta risk appetite correlation`,
    expectedMoveLow: `0.8%–1.8% ($600–$1,400)`,
    expectedMoveBase: `1.8%–3.8% ($1,400–$2,800)`,
    expectedMoveHigh: `3.8%–6.5% ($2,800–$4,800)`,
    expectedMoveExtreme: `6.5%+ ($5,000+)`
  };

  // 8. ETH (Ethereum)
  assets['ETH'] = {
    assetSymbol: 'ETH',
    category: 'CRYPTO',
    direction: btcDirection,
    confidence: 'MEDIUM',
    driverReason: `Crypto market beta + DeFi/Stablecoin on-chain capital flow sensitivity to Fed rates`,
    expectedMoveLow: `1.2%–2.5% ($35–$75)`,
    expectedMoveBase: `2.5%–5.0% ($75–$160)`,
    expectedMoveHigh: `5.0%–8.5% ($160–$280)`,
    expectedMoveExtreme: `8.5%+ ($300+)`
  };

  return assets;
}

// -------------------------------------------------------------
// MASTER REPORT GENERATOR (Section 27 Output Structure)
// -------------------------------------------------------------

export function generateFundamentalReport(
  targetEvent: EconomicEvent,
  allEvents: EconomicEvent[],
  customCluster?: NewsCluster | null
): FundamentalIntelligenceReport {
  const sanitizedEvents = sanitizeCalendarEvents(allEvents as any);
  const matchedEvent = sanitizedEvents.find(e => e.id === targetEvent.id) || targetEvent;
  
  // Find or use cluster
  const clusters = detectNewsClusters(sanitizedEvents, 30);
  const cluster = customCluster || clusters.find(c => c.events.some(e => e.id === matchedEvent.id)) || null;

  // Currency Matrix
  const currencyMatrix = calculateCurrencyStrengthMatrix(sanitizedEvents);
  const currencyScore = currencyMatrix[matchedEvent.currency]?.score ?? 0;

  // Fundamental Direction & Strength
  let direction: FundamentalIntelligenceReport['fundamentalDirection'] = 'NEUTRAL';
  if (currencyScore >= 20) direction = 'BULLISH';
  else if (currencyScore <= -20) direction = 'BEARISH';
  else if (cluster && cluster.conflictLevel === 'HIGH') direction = 'MIXED';

  const strength = Math.min(100, Math.max(15, Math.abs(currencyScore) + (matchedEvent.importanceScore * 0.3)));
  const confidence: FundamentalIntelligenceReport['confidence'] = matchedEvent.impact === 'HIGH' && (matchedEvent.surpriseCategory.includes('Extreme') || matchedEvent.surpriseCategory.includes('Strong')) ? 'HIGH' : (matchedEvent.impact === 'LOW' ? 'LOW' : 'MEDIUM');

  // Time Countdown
  const now = Date.now();
  const diff = matchedEvent.date.getTime() - now;
  let timeUntilNews = 'COMPLETED / PAST';
  if (diff > 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    timeUntilNews = hours > 0 ? `${hours}h ${mins}m ${secs}s` : `${mins}m ${secs}s`;
  }

  // Market Pricing
  const isFarAhead = diff > 86400000;
  const marketPricing: FundamentalIntelligenceReport['marketPricing'] = isFarAhead ? 'NOT PRICED-IN' : (diff > 3600000 ? 'PARTIALLY PRICED-IN' : (matchedEvent.isActualPending ? 'PRICED-IN' : 'UNKNOWN'));
  const marketRegime: FundamentalIntelligenceReport['marketRegime'] = matchedEvent.importanceScore > 85 ? 'EXPANDING' : 'COMPRESSED';

  // Reaction Classifier & Asset Impacts
  const reactionProbabilities = classifyMarketReaction(cluster, matchedEvent);
  const assetImpacts = calculateAssetImpacts(currencyMatrix, cluster, matchedEvent);

  // Risk Assessment
  const isHighImpact = matchedEvent.impact === 'HIGH';
  const riskAssessment: FundamentalIntelligenceReport['riskAssessment'] = {
    spreadRisk: isHighImpact ? 'HIGH' : 'MEDIUM',
    liquidityRisk: isHighImpact ? 'HIGH' : 'LOW',
    fakeBreakoutRisk: reactionProbabilities.spikeReversal > 30 ? 'HIGH' : 'MEDIUM',
    reversalRisk: reactionProbabilities.twoWayVolatility > 25 ? 'HIGH' : 'MEDIUM',
    twoWayRisk: cluster && cluster.conflictLevel === 'HIGH' ? 'HIGH' : 'MEDIUM'
  };

  // Reasons (3 to 7 concise factual bullets)
  const reasons: string[] = [
    `Katalis ${matchedEvent.title} (${matchedEvent.currency}) memiliki Fundamental Importance Score ${matchedEvent.importanceScore}/100 dengan relevansi bank sentral ${matchedEvent.centralBankRelevance}.`,
    matchedEvent.isActualPending
      ? `Data Actual berstatus PENDING. Estimasi pasar mengacu pada Forecast ${matchedEvent.forecast} vs Previous ${matchedEvent.previous}.`
      : `Data Actual dirilis ${matchedEvent.actual} dengan Headline Surprise: ${matchedEvent.headlineSurprise}.`,
    cluster && cluster.events.length > 1
      ? `Terdeteksi ${cluster.events.length} event dalam News Cluster ${matchedEvent.currency} dengan Conflict Level ${cluster.conflictLevel} dan Net Pressure ${cluster.netPressure > 0 ? '+' : ''}${cluster.netPressure}.`
      : `Event berdiri independen tanpa rilis beruntun dalam rentang ±30 menit.`,
    `Currency Strength Matrix ${matchedEvent.currency} terhitung ${currencyScore > 0 ? '+' : ''}${currencyScore} (${currencyMatrix[matchedEvent.currency]?.classification || 'Neutral'}).`,
    `Probabilitas karakter reaksi pasar didominasi oleh ${reactionProbabilities.dominantReaction} (${Math.max(reactionProbabilities.flyOneWay, reactionProbabilities.spikeReversal, reactionProbabilities.twoWayVolatility)}%) dengan expected volatility ${reactionProbabilities.expectedVolatility}.`
  ];

  // Section 27 Exact ASCII Terminal Format
  const dateFormatted = matchedEvent.date.toISOString().split('T')[0];
  const timeFormatted = matchedEvent.timeString + ' UTC';

  const terminalText = `
━━━━━━━━━━━━━━━━━━━━
VINZX FUNDAMENTAL INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━

DATE:
${dateFormatted}

TIME:
${timeFormatted}

EVENT:
${matchedEvent.title}

CURRENCY:
${matchedEvent.currency}

IMPACT:
${matchedEvent.impact}

TIME UNTIL NEWS:
${timeUntilNews}

━━━━━━━━━━━━━━━━━━━━
NEWS DATA
━━━━━━━━━━━━━━━━━━━━

Previous:
${matchedEvent.previous}

Revised:
${matchedEvent.revisedPrevious}

Forecast:
${matchedEvent.forecast}

Actual:
${matchedEvent.actual}

Surprise:
${matchedEvent.headlineSurprise}

━━━━━━━━━━━━━━━━━━━━
FUNDAMENTAL ANALYSIS
━━━━━━━━━━━━━━━━━━━━

Currency Pressure:
${currencyScore > 0 ? '+' : ''}${currencyScore}

Fundamental Direction:
${direction}

Fundamental Strength:
${Math.round(strength)}/100

Confidence:
${confidence}

━━━━━━━━━━━━━━━━━━━━
NEWS CLUSTER
━━━━━━━━━━━━━━━━━━━━

Related News:
${cluster ? cluster.events.map(e => `- ${e.timeString} ${e.title} (${e.impact})`).join('\n') : '- None (Single Event)'}

Cluster Impact:
${cluster ? cluster.highestImpact : matchedEvent.impact}

Conflict:
${cluster ? cluster.conflictLevel : 'LOW'}

Cluster Direction:
${cluster ? cluster.clusterDirection : direction}

━━━━━━━━━━━━━━━━━━━━
MARKET REACTION
━━━━━━━━━━━━━━━━━━━━

Reaction Type:

FLY:
${reactionProbabilities.flyOneWay}%

SPIKE:
${reactionProbabilities.spikeReversal}%

TWO-WAY:
${reactionProbabilities.twoWayVolatility}%

NEUTRAL:
${reactionProbabilities.neutral}%

Expected Volatility:
${reactionProbabilities.expectedVolatility}

━━━━━━━━━━━━━━━━━━━━
EXPECTED RANGE
━━━━━━━━━━━━━━━━━━━━

FOREX:
${assetImpacts['EURUSD']?.expectedMoveBase || '25–50 pips'}

GOLD:
${assetImpacts['XAUUSD']?.expectedMoveBase || '$15–$30'}

OIL:
${assetImpacts['USOIL']?.expectedMoveBase || '$0.80–$1.80'}

CRYPTO:
${assetImpacts['BTC']?.expectedMoveBase || '1.8%–3.8%'}

━━━━━━━━━━━━━━━━━━━━
ASSET IMPACT
━━━━━━━━━━━━━━━━━━━━

EURUSD:
${assetImpacts['EURUSD']?.direction || 'NEUTRAL'}

GBPUSD:
${assetImpacts['GBPUSD']?.direction || 'NEUTRAL'}

USDJPY:
${assetImpacts['USDJPY']?.direction || 'NEUTRAL'}

XAUUSD:
${assetImpacts['XAUUSD']?.direction || 'NEUTRAL'}

XAGUSD:
${assetImpacts['XAGUSD']?.direction || 'NEUTRAL'}

USOIL:
${assetImpacts['USOIL']?.direction || 'NEUTRAL'}

BTC:
${assetImpacts['BTC']?.direction || 'NEUTRAL'}

ETH:
${assetImpacts['ETH']?.direction || 'NEUTRAL'}

━━━━━━━━━━━━━━━━━━━━
RISK
━━━━━━━━━━━━━━━━━━━━

Spread Risk:
${riskAssessment.spreadRisk}

Liquidity Risk:
${riskAssessment.liquidityRisk}

Fake Breakout Risk:
${riskAssessment.fakeBreakoutRisk}

Reversal Risk:
${riskAssessment.reversalRisk}

Two-Way Risk:
${riskAssessment.twoWayRisk}

━━━━━━━━━━━━━━━━━━━━
FINAL STATUS
━━━━━━━━━━━━━━━━━━━━

Fundamental Bias:
${direction} (${currencyScore > 0 ? '+' : ''}${currencyScore})

Reaction Type:
${reactionProbabilities.dominantReaction}

Expected Volatility:
${reactionProbabilities.expectedVolatility}

Expected Range:
${assetImpacts['EURUSD']?.expectedMoveBase} (EURUSD) | ${assetImpacts['XAUUSD']?.expectedMoveBase} (XAUUSD)

Confidence:
${confidence}

Reason:
${reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━
`.trim();

  return {
    timestamp: new Date().toISOString(),
    primaryEvent: matchedEvent,
    cluster,
    currencyPressureScore: currencyScore,
    fundamentalDirection: direction,
    fundamentalStrength: Math.round(strength),
    confidence,
    timeUntilNews,
    marketPricing,
    marketRegime,
    reactionProbabilities,
    currencyMatrix,
    assetImpacts,
    riskAssessment,
    reasons,
    terminalReportText: terminalText
  };
}
