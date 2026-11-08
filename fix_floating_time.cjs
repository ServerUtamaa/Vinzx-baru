const fs = require('fs');

let floating = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

floating = floating.replace(
    "import React, { useState, useEffect, useRef } from 'react';",
    "import React, { useState, useEffect, useRef } from 'react';\nimport { getTrueTime } from '../utils/time';"
);

// We only want to replace Date.now() when checking membership expiration, or maybe everywhere in FloatingUI?
// Replacing everywhere is safer for countdowns!
floating = floating.replace(/Date\.now\(\)/g, "getTrueTime()");

fs.writeFileSync('components/FloatingUI.tsx', floating);
console.log("FloatingUI time updated.");
