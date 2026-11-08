const fs = require('fs');

let authOverlay = fs.readFileSync('.core/components/AuthOverlay.tsx', 'utf8');

authOverlay = authOverlay.replace(
    "body: JSON.stringify({ username: regUsername, password: regPassword })",
    "body: JSON.stringify({ username: regUsername.trim(), password: regPassword.trim() })"
);

authOverlay = authOverlay.replace(
    "if (regUsername === 'VinzxFx' && regPassword === 'Ayas_ganteng') {",
    "if (regUsername.trim() === 'VinzxFx' && regPassword.trim() === 'Ayas_ganteng') {"
);

fs.writeFileSync('.core/components/AuthOverlay.tsx', authOverlay);
console.log("Trim applied to AuthOverlay");
