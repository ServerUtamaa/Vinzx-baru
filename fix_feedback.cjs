const fs = require('fs');

let fb = fs.readFileSync('core/feedbackEngine.ts', 'utf8');

if (!fb.includes('syncToCloud')) {
    fb = "import { syncToCloud } from './cloudFeedbackSync';\n" + fb;

    fb = fb.replace("localStorage.setItem('X12_TRADE_MEMORY', JSON.stringify(parsed));",
    "localStorage.setItem('X12_TRADE_MEMORY', JSON.stringify(parsed));\n        syncToCloud('X12_TRADE_MEMORY', parsed);");

    fb = fb.replace("localStorage.setItem('X12_DIAGNOSTICS', JSON.stringify(fixes));",
    "localStorage.setItem('X12_DIAGNOSTICS', JSON.stringify(fixes));\n            syncToCloud('X12_DIAGNOSTICS', fixes);");

    fb = fb.replace("localStorage.setItem('X12_BLACKLIST', JSON.stringify(blacklist));",
    "localStorage.setItem('X12_BLACKLIST', JSON.stringify(blacklist));\n        syncToCloud('X12_BLACKLIST', blacklist);");
    
    // Replace the other blacklist one
    fb = fb.replace("localStorage.setItem('X12_BLACKLIST', JSON.stringify(blacklist));",
    "localStorage.setItem('X12_BLACKLIST', JSON.stringify(blacklist));\n            syncToCloud('X12_BLACKLIST', blacklist);");

    fb = fb.replace("localStorage.setItem('X12_REINFORCEMENT', JSON.stringify(reinforcement));",
    "localStorage.setItem('X12_REINFORCEMENT', JSON.stringify(reinforcement));\n        syncToCloud('X12_REINFORCEMENT', reinforcement);");
    
    fs.writeFileSync('core/feedbackEngine.ts', fb);
    console.log("feedbackEngine.ts updated with cloud sync!");
}
