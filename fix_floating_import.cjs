const fs = require('fs');

let floating = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

floating = floating.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect } from 'react';\nimport { getTrueTime } from '../utils/time';"
);

fs.writeFileSync('components/FloatingUI.tsx', floating);
console.log("Import fixed in FloatingUI.");
