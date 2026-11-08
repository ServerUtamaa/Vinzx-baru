/**
 * VINZX FUNDAMENTAL AI SERVICE
 * Seamlessly integrates Vinzx Thinking Engine (Google Gemini) with
 * the Quantitative Fundamental Intelligence Engine.
 */

import { FundamentalIntelligenceReport, EconomicEvent, NewsCluster } from '../core/fundamentalEngine';
import { fundamentalTokenEngine as tokenEngine, FUNDAMENTAL_PRIORITY_MODELS } from './tokenEngine';

export class FundamentalAiService {
  private static instance: FundamentalAiService;

  public static getInstance(): FundamentalAiService {
    if (!FundamentalAiService.instance) {
      FundamentalAiService.instance = new FundamentalAiService();
    }
    return FundamentalAiService.instance;
  }

  /**
   * Generates deep institutional AI synthesis via Vinzx Thinking Engine
   */
  public async synthesizeWithAi(
    report: FundamentalIntelligenceReport,
    onProgress?: (step: string) => void
  ): Promise<{ deepAnalysis: string; engineUsed: string }> {
    onProgress?.("Menyiapkan parameter data fundamental & cluster...");

    const primary = report.primaryEvent;
    const cluster = report.cluster;

    const prompt = `
Anda adalah VINZX Fundamental Intelligence Engine, sistem AI khusus untuk menganalisis Economic News, Fundamental Market Data, dan dampaknya terhadap Forex, Commodities (Gold/XAUUSD, Silver/XAGUSD, USOIL), Indices (NAS100), dan Crypto (BTC, ETH, SOL).

PATUHI ATURAN:
1. NEWS ≠ DIRECT BUY/SELL.
   NEWS → FUNDAMENTAL PRESSURE → MARKET EXPECTATION → SURPRISE → LIQUIDITY → VOLATILITY → PRICE REACTION.
2. JIKA ACTUAL BELUM TERSEDIA: Nyatakan 'ACTUAL PENDING', jangan mengarang angka.
3. JIKA FORECAST TIDAK ADA: Nyatakan 'FORECAST UNKNOWN', jangan mengarang angka.
4. JANGAN MEMPREDIKSI HARGA PASTI: Selalu gunakan EXPECTED RANGE (Low Case, Base Case, High Case, Extreme Case).
5. ANALISIS MULTI-ASSET:
   - FOREX (pips)
   - GOLD (USD / Point movement)
   - USOIL (USD movement)
   - CRYPTO (Percentage % & USD movement)
6. REACTION CLASSIFIER: Tentukan propabilitas FLY / ONE-WAY, SPIKE / REVERSAL, TWO-WAY VOLATILITY, dan NEUTRAL.
7. MULTI-NEWS CONFLICT: Hitung apakah ada kontradiksi fundamental antar rilis berita berdekatan.

DATA EVENT AKTIF:
- Event: ${primary.title} (${primary.country} / ${primary.currency})
- Tanggal & Jam: ${primary.date.toISOString()} (${primary.timeString} UTC)
- Impact: ${primary.impact} (Importance Score: ${primary.importanceScore}/100)
- Previous: ${primary.previous}
- Revised Previous: ${primary.revisedPrevious}
- Forecast: ${primary.forecast}
- Actual: ${primary.actual} (${primary.headlineSurprise})
- Relevansi Bank Sentral: ${primary.centralBankRelevance}

NEWS CLUSTER (±30 Menit):
${cluster ? cluster.events.map(e => `- ${e.timeString}: ${e.title} [${e.impact}] Prev:${e.previous} Frc:${e.forecast} Act:${e.actual}`).join('\n') : 'Single standalone event'}
- Net Cluster Pressure: ${cluster?.netPressure ?? 0}
- Conflict Level: ${cluster?.conflictLevel ?? 'LOW'}

CURRENCY STRENGTH MATRIX:
${Object.entries(report.currencyMatrix).map(([c, s]) => `${c}: ${s.score > 0 ? '+' : ''}${s.score} (${s.classification})`).join(' | ')}

OUTPUT FORMAT WAJIB (Gunakan format persis seperti di bawah):
━━━━━━━━━━━━━━━━━━━━
VINZX FUNDAMENTAL INTELLIGENCE
━━━━━━━━━━━━━━━━━━━━

DATE:
${primary.date.toISOString().split('T')[0]}

TIME:
${primary.timeString} UTC

EVENT:
${primary.title}

CURRENCY:
${primary.currency}

IMPACT:
${primary.impact}

TIME UNTIL NEWS:
${report.timeUntilNews}

━━━━━━━━━━━━━━━━━━━━
NEWS DATA
━━━━━━━━━━━━━━━━━━━━

Previous:
${primary.previous}

Revised:
${primary.revisedPrevious}

Forecast:
${primary.forecast}

Actual:
${primary.actual}

Surprise:
${primary.headlineSurprise}

━━━━━━━━━━━━━━━━━━━━
FUNDAMENTAL ANALYSIS
━━━━━━━━━━━━━━━━━━━━

Currency Pressure:
${report.currencyPressureScore > 0 ? '+' : ''}${report.currencyPressureScore}

Fundamental Direction:
${report.fundamentalDirection}

Fundamental Strength:
${report.fundamentalStrength}/100

Confidence:
${report.confidence}

━━━━━━━━━━━━━━━━━━━━
NEWS CLUSTER
━━━━━━━━━━━━━━━━━━━━

Related News:
${cluster ? cluster.events.map(e => `- ${e.timeString} ${e.title} (${e.impact})`).join('\n') : '- None (Single Event)'}

Cluster Impact:
${cluster ? cluster.highestImpact : primary.impact}

Conflict:
${cluster ? cluster.conflictLevel : 'LOW'}

Cluster Direction:
${cluster ? cluster.clusterDirection : report.fundamentalDirection}

━━━━━━━━━━━━━━━━━━━━
MARKET REACTION
━━━━━━━━━━━━━━━━━━━━

Reaction Type:

FLY:
${report.reactionProbabilities.flyOneWay}%

SPIKE:
${report.reactionProbabilities.spikeReversal}%

TWO-WAY:
${report.reactionProbabilities.twoWayVolatility}%

NEUTRAL:
${report.reactionProbabilities.neutral}%

Expected Volatility:
${report.reactionProbabilities.expectedVolatility}

━━━━━━━━━━━━━━━━━━━━
EXPECTED RANGE
━━━━━━━━━━━━━━━━━━━━

FOREX:
${report.assetImpacts['EURUSD']?.expectedMoveBase || '25–50 pips'}

GOLD:
${report.assetImpacts['XAUUSD']?.expectedMoveBase || '$15–$30'}

OIL:
${report.assetImpacts['USOIL']?.expectedMoveBase || '$0.80–$1.80'}

CRYPTO:
${report.assetImpacts['BTC']?.expectedMoveBase || '1.8%–3.8%'}

━━━━━━━━━━━━━━━━━━━━
ASSET IMPACT
━━━━━━━━━━━━━━━━━━━━

EURUSD:
${report.assetImpacts['EURUSD']?.direction || 'NEUTRAL'}

GBPUSD:
${report.assetImpacts['GBPUSD']?.direction || 'NEUTRAL'}

USDJPY:
${report.assetImpacts['USDJPY']?.direction || 'NEUTRAL'}

XAUUSD:
${report.assetImpacts['XAUUSD']?.direction || 'NEUTRAL'}

XAGUSD:
${report.assetImpacts['XAGUSD']?.direction || 'NEUTRAL'}

USOIL:
${report.assetImpacts['USOIL']?.direction || 'NEUTRAL'}

BTC:
${report.assetImpacts['BTC']?.direction || 'NEUTRAL'}

ETH:
${report.assetImpacts['ETH']?.direction || 'NEUTRAL'}

━━━━━━━━━━━━━━━━━━━━
RISK
━━━━━━━━━━━━━━━━━━━━

Spread Risk:
${report.riskAssessment.spreadRisk}

Liquidity Risk:
${report.riskAssessment.liquidityRisk}

Fake Breakout Risk:
${report.riskAssessment.fakeBreakoutRisk}

Reversal Risk:
${report.riskAssessment.reversalRisk}

Two-Way Risk:
${report.riskAssessment.twoWayRisk}

━━━━━━━━━━━━━━━━━━━━
FINAL STATUS
━━━━━━━━━━━━━━━━━━━━

Fundamental Bias:
${report.fundamentalDirection}

Reaction Type:
${report.reactionProbabilities.dominantReaction}

Expected Volatility:
${report.reactionProbabilities.expectedVolatility}

Expected Range:
${report.assetImpacts['EURUSD']?.expectedMoveBase} (EURUSD) | ${report.assetImpacts['XAUUSD']?.expectedMoveBase} (XAUUSD)

Confidence:
${report.confidence}

Reason:
${report.reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}
━━━━━━━━━━━━━━━━━━━━
`;

    // Attempt AI routing with dedicated Fundamental Token Engine
    const systemInstruction = "You are VINZX Fundamental Intelligence Engine. You adhere strictly to institutional market logic, economic calendar data, currency differentials, multi-asset correlations, and volatility range expectations without fabricating data.";

    const estimatedInput = tokenEngine.estimateTokens(prompt, systemInstruction);

    for (const modelConfig of FUNDAMENTAL_PRIORITY_MODELS) {
      const capacity = tokenEngine.checkCapacity(modelConfig, estimatedInput);
      if (!capacity.hasCapacity) continue;

      try {
        onProgress?.(`Menghubungkan ke ${modelConfig.displayName}...`);
        const res = await fetch('/api/generate/fundamental', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelName: modelConfig.modelIdentifier,
            prompt,
            systemInstruction,
            category: 'FUNDAMENTAL'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.text) {
            tokenEngine.recordSuccess(modelConfig.modelIdentifier, estimatedInput, 1200);
            return {
              deepAnalysis: data.text,
              engineUsed: modelConfig.displayName
            };
          }
        }
        tokenEngine.recordFailure(modelConfig.modelIdentifier, res.status === 429);
      } catch (err: any) {
        tokenEngine.recordFailure(modelConfig.modelIdentifier, false);
      }
    }

    // High quality deterministic fallback
    return {
      deepAnalysis: report.terminalReportText,
      engineUsed: 'Vinzx Thinking v.11 (Institutional Core)'
    };
  }
}

export const fundamentalAiService = FundamentalAiService.getInstance();
