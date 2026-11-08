const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(/if \(isActive\(\) if \(checkActive\(\) && isSyntheticRef\.current\) \{if \(checkActive\(\) && isSyntheticRef\.current\) \{ isSyntheticRef\.current\) \{/g, "if (isActive() && isSyntheticRef.current) {");

fs.writeFileSync('App.tsx', code);
