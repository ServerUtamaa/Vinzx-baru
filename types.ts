
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export enum Asset {
  // 1. COMMODITY (METAL, OIL & INDICES)
  XAUUSD = 'XAUUSD', // Gold
  XAGUSD = 'XAGUSD', // Silver
  XPTUSD = 'XPTUSD', // Platinum
  USOIL = 'USOIL',   // WTI Crude Oil
  NASDAQ = 'NASDAQ', // US Tech 100

  // 2. CRYPTO (BINANCE REAL-TIME)
  BTCUSD = 'BTCUSD',
  ETHUSD = 'ETHUSD',
  SOLUSD = 'SOLUSD',
  BNBUSD = 'BNBUSD', // ADDED BNB
  
  // 3. FOREX MAJORS & CROSS PAIRS
  EURUSD = 'EURUSD',
  GBPUSD = 'GBPUSD',
  USDJPY = 'USDJPY',
  AUDUSD = 'AUDUSD',
  USDCHF = 'USDCHF',
  NZDUSD = 'NZDUSD',
  GBPJPY = 'GBPJPY',
  EURJPY = 'EURJPY',
}

export type TimeFrame = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1';

export type TradeFeedback = 'WIN' | 'LOSS' | null;

export type VoiceGender = 'MALE' | 'FEMALE';

export type UserRole = 'GUEST' | 'USER' | 'DEV' | 'PENDING' | 'REJECTED';

export type MembershipTier = 'NONE' | 'TRIAL' | 'BASIC' | 'WEEKLY' | 'BIWEEKLY' | 'VIP' | 'MONTHLY' | 'LIFETIME';

export interface UserSession {
    isLoggedIn: boolean;
    role: UserRole;
    username: string;
    uid?: string; // ADDED: Firebase user UID to map user's Google account
    tokens: number; // ADDED: Token System
    membershipTier?: MembershipTier; // NEW: Track UI Membership
    membershipExpiresAt?: number;    // NEW: Track UI Expiry
    deviceId?: string;               // NEW: Persistent Guest ID
}

// --- DATABASE STRUCTURE ---
export interface ExecutionRecord {
    id: string;
    asset: Asset;
    signal: 'BUY' | 'SELL';
    entry: number;
    sl: number;
    tp: number;
    status: 'WIN' | 'LOSS';
    timestamp: number;
    rr: string;
}

export interface TradeMemory {
  asset: string;
  timeframe: string;
  setupType: string;
  signal: 'BUY' | 'SELL';
  result: 'WIN' | 'LOSS';
  timestamp: number;
  confidence: number;
  session: 'ASIA' | 'LONDON' | 'NEWYORK';
  confluences: string[];
}

export interface PairBehavior {
  asset: string;
  volatilityModel: 'HIGH' | 'MEDIUM' | 'LOW';
  spreadAverage: number;
  bestSession: 'ASIA' | 'LONDON' | 'NEWYORK' | 'ALL';
  blacklistPatterns: string[];
}

export interface UserRecord {
    id: string;
    username: string;
    passwordHash: string; // Encrypted Password
    role: UserRole;
    tokens: number;
    integritySignature?: string; // NEW: ANTI-HACK SIGNATURE (HMAC)
    createdAt: number;
    lastLogin: number;
    history?: ExecutionRecord[]; // NEW: Trade History
    // NEW: MEMBERSHIP FIELDS
    membershipTier?: MembershipTier;
    membershipExpiresAt?: number;
    deviceId?: string; // NEW: Persistent Guest ID
}

export interface OtpRecord {
    username: string;
    code: string;
    expiresAt: number; // Timestamp
}

export interface AnalysisResult {
  signal: 'BUY' | 'SELL';
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: string;
  reasoning: string[];
  smcConceptsFound: string[];
  timestamp: string;
  timeframe: string;
  activeModel?: string; // Model used by Smart Token Router
  tokenCapacityInfo?: string; // Token capacity status
  learningKey?: string;
  setupSignature?: string;
  prediction?: string; // NEW: Future prediction
  nextPricePrediction?: number; // Exact price prediction
  trendPrediction?: string; // BULLISH, BEARISH, RANGING
  drlMetrics?: {
    stateValue: number;
    advantage: number;
    buyProb: number;
    sellProb: number;
  };
}

export interface GeminiResponseSchema {
  signal: string;
  confidence: number;
  entry: number;
  sl: number;
  tp: number;
  rr: string;
  reasoning: string[];
  concepts: string[];
  prediction?: string; // NEW: Future prediction
  next_price_prediction?: number;
  trend_prediction?: string;
  drl_metrics?: {
    state_value: number;
    advantage: number;
    buy_prob: number;
    sell_prob: number;
  };
}

export interface FundamentalAnalysisResult {
    date: string;
    time: string;
    event: string;
    currency: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    timeUntilNews: string;
    newsData: {
        previous: string;
        revised: string;
        forecast: string;
        actual: string;
        surprise: string;
    };
    analysis: {
        currencyPressure: number;
        direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
        strength: number;
        confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    cluster?: {
        relatedNews: string[];
        impact: number;
        conflict: 'LOW' | 'MEDIUM' | 'HIGH';
        direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
    };
    reaction: {
        type: 'FLY' | 'SPIKE' | 'TWO-WAY' | 'NEUTRAL';
        probabilities: {
            fly: number;
            spike: number;
            twoWay: number;
            neutral: number;
        };
        expectedVolatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    };
    expectedRange: {
        forex: string;
        gold: string;
        oil: string;
        crypto: string;
    };
    assetImpact: {
        [key: string]: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'MIXED';
    };
    risk: {
        spread: 'LOW' | 'MEDIUM' | 'HIGH';
        liquidity: 'LOW' | 'MEDIUM' | 'HIGH';
        fakeBreakout: 'LOW' | 'MEDIUM' | 'HIGH';
        reversal: 'LOW' | 'MEDIUM' | 'HIGH';
        twoWay: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    finalStatus: {
        bias: string;
        reactionType: string;
        expectedVolatility: string;
        expectedRange: string;
        confidence: string;
        reasons: string[];
    };
}

export interface LiveMarketPrice {
    price: number;
    bid: number;
    ask: number;
    spreadPips: number;
    change24h: number;
    changePercent: number;
    high: number;
    low: number;
    open: number;
    tick: 'UP' | 'DOWN' | 'NEUTRAL';
    lastTickTime: number;
    precision: number;
    timeframe: TimeFrame;
}
