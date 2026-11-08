const fs = require('fs');

let auth = fs.readFileSync('.core/components/AuthOverlay.tsx', 'utf8');

auth = auth.replace(
    "import React, { useState } from 'react';",
    "import React, { useState } from 'react';\nimport { setServerTimeOffset } from '../../utils/time';"
);

// Login and register responses
auth = auth.replace(
    "const dbUser = data.user;",
    "if (data.serverTime) setServerTimeOffset(data.serverTime);\n                const dbUser = data.user;"
);

// Google response
auth = auth.replace(
    "const activeData = data.user;",
    "if (data.serverTime) setServerTimeOffset(data.serverTime);\n            const activeData = data.user;"
);

fs.writeFileSync('.core/components/AuthOverlay.tsx', auth);
console.log("AuthOverlay time updated.");
