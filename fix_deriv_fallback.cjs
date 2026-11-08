const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

const updatedLogic = `
    if (currentAsset === Asset.USOIL) {
        connectYahooFinanceEngine(currentAsset, currentTimeframe, checkActive);
    } else if (isDerivAsset) {
        connectDerivEngine(currentAsset, currentTimeframe, checkActive);
        
        // Add polling fallback for Deriv if WS fails
        pollIntervalRef.current = setInterval(() => {
            if (isActive() && isSyntheticRef.current) {
                // If deriv WS failed, use Yahoo as fallback
                connectYahooFinanceEngine(currentAsset, currentTimeframe, checkActive);
                // Stop this specific fallback poller, since connectYahooFinanceEngine sets its own
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
            }
        }, 3000);
    } else if (isBinanceAsset) {
        connectBinanceEngine(currentAsset, currentTimeframe, checkActive);
    }
`;

code = code.replace(
    /if \(isDerivAsset \|\| currentAsset === Asset\.USOIL\) \{\n        \/\/ Fallback to Yahoo if Deriv fails\n        connectDerivEngine\(currentAsset, currentTimeframe, checkActive\);\n    \} else if \(isBinanceAsset\) \{/g,
    updatedLogic
);

fs.writeFileSync('App.tsx', code);
console.log("Fixed deriv fallback logic");
