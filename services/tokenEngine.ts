/**
 * Smart Token Check, Quota Monitoring & Auto Fallback Engine
 * Powered by Vinzx Thinking Tiers (Google Gemini Underlying AI Engine):
 * 1. Vinzx Thinking v.11 (gemini-3.8-flash)
 * 2. Vinzx Thinking v.10 (gemini-pro-latest)
 * 3. Vinzx Thinking v.9 (gemini-3.7-flash)
 * 4. Vinzx Thinking v.8 (gemini-3.5-flash-lite)
 * 5. Vinzx Thinking v.7 (gemini-3.1-pro-preview)
 * 6. Vinzx Thinking v.7 (gemini-3.6-flash)
 * 7. Vinzx Thinking v.6 (gemini-3.5-flash)
 * 8. Vinzx Thinking v.5 (gemini-3.1-flash-lite)
 * 9. Vinzx Thinking v.4 (gemini-3-flash-preview)
 * 10. Vinzx Thinking v.3 (gemini-flash-latest)
 * 11. Vinzx Thinking v.2 (gemini-flash-lite-latest)
 */

export interface ModelTierConfig {
  priority: number;
  displayName: string;
  modelIdentifier: string;
  contextWindow: number;     // Total token capacity
  maxOutputTokens: number;   // Max output completion tokens
  tpmLimit: number;          // Tokens per minute quota limit
  rpmLimit: number;          // Requests per minute quota limit
}

export interface ModelUsageStats {
  usedTokensLastMinute: number;
  requestsLastMinute: number;
  lastUsedTimestamp: number;
  consecutiveFailures: number;
  isRateLimitedUntil: number; // timestamp until when this model is temporarily paused
}

export interface CapacityCheckResult {
  model: ModelTierConfig;
  hasCapacity: boolean;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  totalRequiredTokens: number;
  availableTokens: number;
  utilizationPercent: number;
  reason: string;
}

export interface TokenRouterDecision {
  selectedModel: ModelTierConfig;
  preCheckResults: CapacityCheckResult[];
  estimatedTotalTokens: number;
  cumulativeAvailableCapacity: number;
  routingReason: string;
}

// Dedicated Models for Chart Candlestick SMC Engine (Deep Reasoning & Multi-Timeframe)
export const CHART_PRIORITY_MODELS: ModelTierConfig[] = [
  {
    priority: 1,
    displayName: "Vinzx Thinking v.11 (Institutional SMC)",
    modelIdentifier: "gemini-3.8-flash",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    tpmLimit: 1000000,
    rpmLimit: 1000
  },
  {
    priority: 2,
    displayName: "Vinzx Thinking v.10 (Pro Deep)",
    modelIdentifier: "gemini-pro-latest",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    tpmLimit: 1000000,
    rpmLimit: 360
  },
  {
    priority: 3,
    displayName: "Vinzx Thinking v.9 (Flash Adaptive)",
    modelIdentifier: "gemini-3.7-flash",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    tpmLimit: 1000000,
    rpmLimit: 1000
  },
  {
    priority: 4,
    displayName: "Vinzx Thinking v.7 (Flash Precision)",
    modelIdentifier: "gemini-3.6-flash",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    tpmLimit: 1000000,
    rpmLimit: 1000
  },
  {
    priority: 5,
    displayName: "Vinzx Thinking v.6 (Flash Speed)",
    modelIdentifier: "gemini-3.5-flash",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    tpmLimit: 1000000,
    rpmLimit: 1000
  },
  {
    priority: 6,
    displayName: "Vinzx Thinking v.3 (Flash Latest)",
    modelIdentifier: "gemini-flash-latest",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    tpmLimit: 1000000,
    rpmLimit: 1000
  },
  {
    priority: 7,
    displayName: "Vinzx Thinking v.5 (Flash Lite)",
    modelIdentifier: "gemini-3.1-flash-lite",
    contextWindow: 1048576,
    maxOutputTokens: 8192,
    tpmLimit: 2000000,
    rpmLimit: 2000
  }
];

// Dedicated Models for Fundamental Calendar Engine (Lightweight, High-Throughput, Free Token Economy)
export const FUNDAMENTAL_PRIORITY_MODELS: ModelTierConfig[] = [
  {
    priority: 1,
    displayName: "Vinzx Fundamental v.2 (Ultra Fast)",
    modelIdentifier: "gemini-3.1-flash-lite",
    contextWindow: 1048576,
    maxOutputTokens: 2048,
    tpmLimit: 2000000,
    rpmLimit: 2000
  },
  {
    priority: 2,
    displayName: "Vinzx Fundamental v.1 (Flash High-Throughput)",
    modelIdentifier: "gemini-flash-latest",
    contextWindow: 1048576,
    maxOutputTokens: 2048,
    tpmLimit: 1000000,
    rpmLimit: 1000
  },
  {
    priority: 3,
    displayName: "Vinzx Fundamental Lite (Backup)",
    modelIdentifier: "gemini-flash-lite-latest",
    contextWindow: 1048576,
    maxOutputTokens: 2048,
    tpmLimit: 2000000,
    rpmLimit: 2000
  }
];

export const PRIORITY_MODELS: ModelTierConfig[] = CHART_PRIORITY_MODELS;

export class TokenManager {
  private static instances: Map<string, TokenManager> = new Map();
  public readonly channelName: string;
  public readonly models: ModelTierConfig[];
  private usageMap: Map<string, ModelUsageStats> = new Map();
  private readonly SAFETY_MARGIN_RATIO = 1.35; // 35% safety margin
  private readonly ESTIMATED_OUTPUT_TOKENS = 1500; // Complete SMC analysis schema size

  public constructor(channelName: string = "CHART_CANDLESTICK", models: ModelTierConfig[] = CHART_PRIORITY_MODELS) {
    this.channelName = channelName;
    this.models = models;
    this.initUsageMap();
  }

  public static getInstance(channel: string = "CHART_CANDLESTICK", models?: ModelTierConfig[]): TokenManager {
    if (!TokenManager.instances.has(channel)) {
      const defaultModels = channel === "FUNDAMENTAL_IMPACT" ? FUNDAMENTAL_PRIORITY_MODELS : CHART_PRIORITY_MODELS;
      TokenManager.instances.set(channel, new TokenManager(channel, models || defaultModels));
    }
    return TokenManager.instances.get(channel)!;
  }

  private initUsageMap() {
    const now = Date.now();
    for (const model of this.models) {
      this.usageMap.set(model.modelIdentifier, {
        usedTokensLastMinute: 0,
        requestsLastMinute: 0,
        lastUsedTimestamp: now,
        consecutiveFailures: 0,
        isRateLimitedUntil: 0
      });
    }
  }

  /**
   * Fast, accurate token estimator for chart prompts & OHLC data
   * Formula: ~3.8 characters per token for numeric/code/Indonesian text + framing overhead
   */
  public estimateTokens(promptText: string, systemInstruction?: string): number {
    const totalChars = (promptText ? promptText.length : 0) + (systemInstruction ? systemInstruction.length : 0);
    // Extra safety buffer for special characters and JSON formatting
    const rawTokens = Math.ceil(totalChars / 3.8);
    const schemaBuffer = 600; // JSON Schema & structure overhead
    return Math.ceil(rawTokens + schemaBuffer);
  }

  /**
   * Cleans expired windows (sliding window for TPM/RPM)
   */
  private refreshUsage(modelKey: string): ModelUsageStats {
    let stats = this.usageMap.get(modelKey);
    const now = Date.now();
    if (!stats) {
      stats = {
        usedTokensLastMinute: 0,
        requestsLastMinute: 0,
        lastUsedTimestamp: now,
        consecutiveFailures: 0,
        isRateLimitedUntil: 0
      };
      this.usageMap.set(modelKey, stats);
      return stats;
    }

    const elapsed = now - stats.lastUsedTimestamp;
    if (elapsed > 60000) {
      // 1 minute has passed, reset the sliding window
      stats.usedTokensLastMinute = 0;
      stats.requestsLastMinute = 0;
      stats.lastUsedTimestamp = now;
    } else if (elapsed > 0) {
      // Linear decay approximation
      const decayFactor = Math.max(0, 1 - (elapsed / 60000));
      stats.usedTokensLastMinute = Math.round(stats.usedTokensLastMinute * decayFactor);
      stats.requestsLastMinute = Math.round(stats.requestsLastMinute * decayFactor);
      stats.lastUsedTimestamp = now;
    }

    return stats;
  }

  /**
   * Pre-check individual model capacity against safety buffer & TPM/context limits
   */
  public checkCapacity(model: ModelTierConfig, estimatedInputTokens: number): CapacityCheckResult {
    const stats = this.refreshUsage(model.modelIdentifier);
    const now = Date.now();

    // Check if temporarily locked out (e.g. recent 429 quota exhaustion)
    if (stats.isRateLimitedUntil > now) {
      const waitSeconds = Math.ceil((stats.isRateLimitedUntil - now) / 1000);
      return {
        model,
        hasCapacity: false,
        estimatedInputTokens,
        estimatedOutputTokens: this.ESTIMATED_OUTPUT_TOKENS,
        totalRequiredTokens: estimatedInputTokens + this.ESTIMATED_OUTPUT_TOKENS,
        availableTokens: 0,
        utilizationPercent: 100,
        reason: `Rate limited / Quota exhausted for another ${waitSeconds}s`
      };
    }

    const estimatedOutput = this.ESTIMATED_OUTPUT_TOKENS;
    const requiredWithMargin = Math.ceil((estimatedInputTokens + estimatedOutput) * this.SAFETY_MARGIN_RATIO);

    // Context window check
    if (requiredWithMargin > model.contextWindow) {
      return {
        model,
        hasCapacity: false,
        estimatedInputTokens,
        estimatedOutputTokens: estimatedOutput,
        totalRequiredTokens: requiredWithMargin,
        availableTokens: model.contextWindow,
        utilizationPercent: 100,
        reason: `Request exceeds context window (${requiredWithMargin} > ${model.contextWindow})`
      };
    }

    // TPM (Tokens Per Minute) quota check
    const currentUsed = stats.usedTokensLastMinute;
    const availableTpm = Math.max(0, model.tpmLimit - currentUsed);

    if (requiredWithMargin > availableTpm) {
      return {
        model,
        hasCapacity: false,
        estimatedInputTokens,
        estimatedOutputTokens: estimatedOutput,
        totalRequiredTokens: requiredWithMargin,
        availableTokens: availableTpm,
        utilizationPercent: Math.min(100, Math.round((currentUsed / model.tpmLimit) * 100)),
        reason: `TPM limit reached (${requiredWithMargin} tokens needed, ${availableTpm} remaining)`
      };
    }

    // RPM (Requests Per Minute) check
    if (stats.requestsLastMinute >= model.rpmLimit) {
      return {
        model,
        hasCapacity: false,
        estimatedInputTokens,
        estimatedOutputTokens: estimatedOutput,
        totalRequiredTokens: requiredWithMargin,
        availableTokens: availableTpm,
        utilizationPercent: 100,
        reason: `RPM limit reached (${stats.requestsLastMinute}/${model.rpmLimit} req/min)`
      };
    }

    const utilization = Math.round(((currentUsed + requiredWithMargin) / model.tpmLimit) * 100);

    return {
      model,
      hasCapacity: true,
      estimatedInputTokens,
      estimatedOutputTokens: estimatedOutput,
      totalRequiredTokens: requiredWithMargin,
      availableTokens: availableTpm - requiredWithMargin,
      utilizationPercent: utilization,
      reason: "Capacity verified & safe with 35% margin"
    };
  }

  /**
   * Cumulative Token Checking & Smart Routing
   * Evaluates models in order of priority.
   * If priority 1 fails, performs cumulative checking (model 1 + model 2, etc.)
   * and routes to the highest priority model with verified capacity.
   */
  public routeModel(prompt: string, systemInstruction?: string): TokenRouterDecision {
    const estimatedInput = this.estimateTokens(prompt, systemInstruction);
    const requiredTotal = Math.ceil((estimatedInput + this.ESTIMATED_OUTPUT_TOKENS) * this.SAFETY_MARGIN_RATIO);
    
    const preCheckResults: CapacityCheckResult[] = [];
    let selectedModel: ModelTierConfig | null = null;
    let routingReason = "";
    let cumulativeCapacity = 0;

    for (const model of this.models) {
      const check = this.checkCapacity(model, estimatedInput);
      preCheckResults.push(check);

      if (check.hasCapacity) {
        cumulativeCapacity += check.availableTokens;
        if (!selectedModel) {
          selectedModel = model;
          routingReason = `Model terpilih: ${model.displayName} (Prioritas #${model.priority}). Kapasitas token terverifikasi aman (${check.availableTokens.toLocaleString()} tokens tersisa, util: ${check.utilizationPercent}%).`;
        }
      }
    }

    if (!selectedModel) {
      // None of the models had individual capacity
      throw new Error(`INSUFFICIENT_CAPACITY: Tidak ada model AI (${this.channelName}) yang memiliki sisa kuota/token yang cukup untuk menyelesaikan seluruh analisa (Dibutuhkan: ~${requiredTotal} tokens).`);
    }

    return {
      selectedModel,
      preCheckResults,
      estimatedTotalTokens: requiredTotal,
      cumulativeAvailableCapacity: cumulativeCapacity,
      routingReason
    };
  }

  /**
   * Records usage after a successful request
   */
  public recordSuccess(modelIdentifier: string, inputTokens: number, outputTokens: number = 1500) {
    const stats = this.refreshUsage(modelIdentifier);
    const total = inputTokens + outputTokens;
    stats.usedTokensLastMinute += total;
    stats.requestsLastMinute += 1;
    stats.consecutiveFailures = 0;
    stats.lastUsedTimestamp = Date.now();
  }

  /**
   * Records failure (e.g., 429 quota exhaustion or API error)
   */
  public recordFailure(modelIdentifier: string, isQuotaExhausted: boolean = false) {
    const stats = this.refreshUsage(modelIdentifier);
    stats.consecutiveFailures += 1;
    
    if (isQuotaExhausted) {
      // Penalize model with a 60-second cooldown
      stats.isRateLimitedUntil = Date.now() + 60000;
      console.warn(`[${this.channelName}] Model ${modelIdentifier} quota habis (429). Memulai masa istirahat 60 detik.`);
    } else if (stats.consecutiveFailures >= 2) {
      // Penalize model with a 15-second cooldown on consecutive network/system errors
      stats.isRateLimitedUntil = Date.now() + 15000;
      console.warn(`[${this.channelName}] Model ${modelIdentifier} gagal berturut-turut ${stats.consecutiveFailures}x. Mengalihkan jalur...`);
    }
  }

  /**
   * Returns current monitoring status across this engine's models
   */
  public getStatusOverview(): Array<{ model: string; priority: number; status: 'ONLINE' | 'BUSY' | 'COOLDOWN'; usedTokens: number; remainingCapacity: number }> {
    const now = Date.now();
    return this.models.map(m => {
      const stats = this.refreshUsage(m.modelIdentifier);
      const isCooldown = stats.isRateLimitedUntil > now;
      const isBusy = stats.usedTokensLastMinute > (m.tpmLimit * 0.8);
      const remaining = Math.max(0, m.tpmLimit - stats.usedTokensLastMinute);
      
      return {
        model: m.displayName,
        priority: m.priority,
        status: isCooldown ? 'COOLDOWN' : (isBusy ? 'BUSY' : 'ONLINE'),
        usedTokens: stats.usedTokensLastMinute,
        remainingCapacity: remaining
      };
    });
  }
}

// Dedicated Isolated Token Engines for Chart & Fundamental
export const chartTokenEngine = TokenManager.getInstance("CHART_CANDLESTICK");
export const fundamentalTokenEngine = TokenManager.getInstance("FUNDAMENTAL_IMPACT");
export const tokenEngine = chartTokenEngine; // backward-compatibility default

