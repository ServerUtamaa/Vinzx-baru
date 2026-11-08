const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const oldDerivFallback = `    if (currentAsset === Asset.USOIL) {
        connectYahooFinanceEngine(currentAsset, currentTimeframe, checkActive);
    } else if (isDerivAsset) {
        connectDerivEngine(currentAsset, currentTimeframe, checkActive);
        
        // Add polling fallback for Deriv if WS fails
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = setInterval(() => {
            if (checkActive() && (isSyntheticRef.current || chartDataRef.current.length === 0)) {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
                connectYahooFinanceEngine(currentAsset, currentTimeframe, checkActive);
            }
        }, 3000);
    } else if (isBinanceAsset) {`;

const newDerivFallback = `    if (isDerivAsset) {
        // ALWAYS USE YAHOO FINANCE FOR FOREX & COMMODITIES TO ENSURE DATA AVAILABILITY & ACCURACY
        connectYahooFinanceEngine(currentAsset, currentTimeframe, checkActive);
    } else if (isBinanceAsset) {`;

code = code.replace(oldDerivFallback, newDerivFallback);
fs.writeFileSync('App.tsx', code);
console.log("Updated App.tsx to always use Yahoo Finance for non-crypto assets");
