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
 * - Gold (XAUUSD): 10 (0.10 = 1 pip, $1 move = 10 pips)
 * - Others: 1
 */
export const getPipScale = (asset: Asset | string): number => {
    const a = (asset || '').toUpperCase();
    if (a.includes('JPY')) return 100;
    if (['EURUSD', 'GBPUSD', 'AUDUSD', 'USDCHF', 'NZDUSD'].some(p => a.includes(p))) return 10000;
    if (a.includes('XAUUSD') || a.includes('GOLD')) return 10;
    return 1;
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
