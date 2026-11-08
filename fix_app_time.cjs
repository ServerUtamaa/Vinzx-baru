const fs = require('fs');

let app = fs.readFileSync('App.tsx', 'utf8');

// Add import
app = app.replace(
    "import { checkMarketStatus } from './utils/marketHours';",
    "import { checkMarketStatus } from './utils/marketHours';\nimport { setServerTimeOffset, getTrueTime } from './utils/time';"
);

// Replace const now = Date.now(); in App.tsx
app = app.replace(/const now = Date\.now\(\);/g, "const now = getTrueTime();");

// We need to inject setServerTimeOffset(data.serverTime) after we fetch user data
// In checkLocalAuth:
app = app.replace(
    "const data = await res.json();\n                            // Handle expiration logic if any",
    "const data = await res.json();\n                            if (data.serverTime) setServerTimeOffset(data.serverTime);\n                            // Handle expiration logic if any"
);

// In checkServerConnection loop
app = app.replace(
    "const data = await res.json();\n                                let finalTier = data.membershipTier || 'NONE';",
    "const data = await res.json();\n                                if (data.serverTime) setServerTimeOffset(data.serverTime);\n                                let finalTier = data.membershipTier || 'NONE';"
);

// Also in the interval for polling:
app = app.replace(
    "const freshData = await fetchRes.json();\n              if (freshData && freshData.user) {",
    "const freshData = await fetchRes.json();\n              if (freshData.serverTime) setServerTimeOffset(freshData.serverTime);\n              if (freshData && freshData.user) {"
);

fs.writeFileSync('App.tsx', app);
console.log("App.tsx time updated.");
