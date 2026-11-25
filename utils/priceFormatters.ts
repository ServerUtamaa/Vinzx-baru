import { Asset } from '../types';

/**
 * Returns the exact standard decimal precision for financial markets.
 * - Standard Forex pairs (EURUSD, GBPUSD, AUDUSD, NZDUSD, USDCHF): 5 decimals (pipettes)
 * - JPY Forex pairs (USDJPY, GBPJPY, EURJPY): 3 decimals (pipettes)
 * - Gold & Precious Metals (XAUUSD, XAGUSD, XPTUSD): 2 decimals
 * - Commodities & Indices (USOIL, NASDAQ): 2 decimals
 * - Crypto (BTCUSD, ETHUSD, SOLUSD, BNBUSD): 2 decimals
 */
export const getAssetPrecision = (asset: Asset | string): number => {
    const a = (asset || '').toUpperCase();
    if (a.includes('JPY')) return 3;
    if (['EURUSD', 'GBPUSD', 'AUDUSD', 'USDCHF', 'NZDUSD'].some(p => a.includes(p))) return 5;
    if (['XAUUSD', 'XAGUSD', 'XPTUSD', 'USOIL', 'GOLD', 'SILVER'].some(p => a.includes(p))) return 2;
    if (a.includes('NASDAQ') || a.includes('NDX')) return 2;
    if (['BTC', 'ETH', 'SOL', 'BNB'].some(c => a.includes(c))) return 2;
    return 5;
};

/**
 * Returns the multiplier to calculate pip value.
 * - Standard Forex: 10,000 (0.0001 = 1 pip)
 * - JPY Forex: 100 (0.01 = 1 pip)
 * - Gold (XAUUSD) & Platinum (XPTUSD): 10 (0.10 = 1 pip, $1 move = 10 pips)
 * - Silver (XAGUSD): 100 (0.01 = 1 pip, $0.10 move = 10 pips)
 * - Others (Crypto, Indices, Oil): 1 (point-based)
 */
export const getPipScale = (asset: Asset | string): number => {
    const a = (asset || '').toUpperCase();
    if (a.includes('JPY')) return 100;
    if (['EURUSD', 'GBPUSD', 'AUDUSD', 'USDCHF', 'NZDUSD'].some(p => a.includes(p))) return 10000;
    if (a.includes('XAUUSD') || a.includes('GOLD') || a.includes('XPTUSD') || a.includes('PLATINUM')) return 10;
    if (a.includes('XAGUSD') || a.includes('SILVER')) return 100;
    return 1;
};

export const assetUsesPips = (asset: Asset | string): boolean => {
    const a = (asset || '').toUpperCase();
    return (
        a.includes('JPY') ||
        ['EURUSD', 'GBPUSD', 'AUDUSD', 'USDCHF', 'NZDUSD', 'XAUUSD', 'XAGUSD', 'XPTUSD', 'GOLD', 'SILVER', 'PLATINUM'].some(p => a.includes(p))
    );
};

/**
 * Formats a number with the exact number of decimal places for the given asset.
 */
export const formatPrice = (price: number, asset: Asset | string, withSeparators = false): string => {
    if (typeof price !== 'number' || isNaN(price)) return '0.00';
    const precision = getAssetPrecision(asset);
    
    if (withSeparators && price >= 1000) {
        return price.toLocaleString('en-US', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        });
    }
    return price.toFixed(precision);
};

/**
 * Splits price into MT5 / TradingView style components:
 * base (e.g. "1.08"), pips (e.g. "45"), pipette (e.g. "6")
 */
export interface PriceParts {
    base: string;
    pips: string;
    pipette: string;
    full: string;
}

export const formatPriceParts = (price: number, asset: Asset | string): PriceParts => {
    if (typeof price !== 'number' || isNaN(price) || price === 0) {
        return { base: '0.0', pips: '00', pipette: '0', full: '0.00000' };
    }

    const precision = getAssetPrecision(asset);
    const full = price.toFixed(precision);

    if (precision === 5) {
        // e.g. "1.08456" -> base: "1.08", pips: "45", pipette: "6"
        const parts = full.split('.');
        if (parts.length === 2 && parts[1].length >= 5) {
            const dec = parts[1];
            return {
                base: `${parts[0]}.${dec.slice(0, 2)}`,
                pips: dec.slice(2, 4),
                pipette: dec.slice(4, 5),
                full
            };
        }
    } else if (precision === 3) {
        // e.g. "157.774" -> base: "157.", pips: "77", pipette: "4"
        const parts = full.split('.');
        if (parts.length === 2 && parts[1].length >= 3) {
            const dec = parts[1];
            return {
                base: `${parts[0]}.`,
                pips: dec.slice(0, 2),
                pipette: dec.slice(2, 3),
                full
            };
        }
    } else if (precision === 2) {
        // e.g. "2734.55" -> base: "2,734.", pips: "5", pipette: "5"
        const parts = full.split('.');
        const wholeFormatted = Number(parts[0]).toLocaleString('en-US');
        if (parts.length === 2 && parts[1].length >= 2) {
            return {
                base: `${wholeFormatted}.`,
                pips: parts[1][0],
                pipette: parts[1][1],
                full
            };
        }
    }

    return {
        base: full.slice(0, -1),
        pips: full.slice(-1),
        pipette: '',
        full
    };
};

/**
 * Calculates spread in pips between Bid and Ask.
 */
export const calculateSpreadPips = (bid: number, ask: number, asset: Asset | string): number => {
    if (!bid || !ask || ask <= bid) return 0;
    const pipScale = getPipScale(asset);
    const rawDiff = ask - bid;
    return Number((rawDiff * pipScale).toFixed(1));
};

/**
 * Calculates difference in pips between two prices.
 */
export const calculatePipsDiff = (current: number, previous: number, asset: Asset | string): number => {
    if (!current || !previous) return 0;
    const pipScale = getPipScale(asset);
    return Number(((current - previous) * pipScale).toFixed(1));
};

/**
 * Returns the exact price delta representing N pips (default: 10 pips) for tick direction transitions.
 * - XAUUSD / XPTUSD: 10 pips = 1.00 (e.g. 3,665.15 -> 3,666.15 UP, -> 3,664.15 DOWN)
 * - XAGUSD: 10 pips = 0.10
 * - Standard Forex (EURUSD, GBPUSD, etc.): 10 pips = 0.0010
 * - JPY Forex (USDJPY, GBPJPY, etc.): 10 pips = 0.10
 * - USOIL / SOLUSD / BNBUSD: 10 ticks = 0.10
 * - ETHUSD: 10 ticks = 1.00
 * - BTCUSD / NASDAQ: 10 points = 10.00
 */
export const getTickThresholdPriceDiff = (asset: Asset | string, pips: number = 10): number => {
    const a = (asset || '').toUpperCase();
    if (a.includes('XAUUSD') || a.includes('GOLD') || a.includes('XPTUSD') || a.includes('PLATINUM')) {
        return pips / 10;
    }
    if (a.includes('XAGUSD') || a.includes('SILVER') || a.includes('JPY')) {
        return pips / 100;
    }
    if (['EURUSD', 'GBPUSD', 'AUDUSD', 'USDCHF', 'NZDUSD'].some(p => a.includes(p))) {
        return pips / 10000;
    }
    if (a.includes('USOIL') || a.includes('SOL') || a.includes('BNB')) {
        return pips * 0.01;
    }
    if (a.includes('ETH')) {
        return pips * 0.1;
    }
    return pips;
};

export interface StepTickResult {
    tick: 'UP' | 'DOWN' | 'NEUTRAL';
    anchorPrice: number;
    triggered: boolean;
}

/**
 * Evaluates tick direction using a strict N-pip (default 10 pips) step from anchorPrice.
 * Tick only flips to UP when currentPrice rises >= 10 pips from anchorPrice,
 * or DOWN when currentPrice drops >= 10 pips from anchorPrice.
 */
export const evaluateStepTick = (
    currentPrice: number,
    anchorPrice: number,
    prevTick: 'UP' | 'DOWN' | 'NEUTRAL',
    asset: Asset | string,
    thresholdPips: number = 10
): StepTickResult => {
    if (!currentPrice || !isFinite(currentPrice)) {
        return { tick: prevTick, anchorPrice, triggered: false };
    }
    if (!anchorPrice || anchorPrice <= 0 || !isFinite(anchorPrice)) {
        return { tick: prevTick || 'NEUTRAL', anchorPrice: currentPrice, triggered: false };
    }
    const step = getTickThresholdPriceDiff(asset, thresholdPips);
    const epsilon = step * 1e-6;
    const delta = currentPrice - anchorPrice;

    if (delta >= step - epsilon) {
        return { tick: 'UP', anchorPrice: currentPrice, triggered: true };
    }
    if (delta <= -(step - epsilon)) {
        return { tick: 'DOWN', anchorPrice: currentPrice, triggered: true };
    }
    return { tick: prevTick, anchorPrice, triggered: false };
};

