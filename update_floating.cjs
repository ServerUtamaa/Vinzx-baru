const fs = require('fs');
let code = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

const replaceLogic = `
      const now = getTrueTime();
      const expiresAt = userSession.membershipExpiresAt || 0;
      const isMembershipActive = userSession.membershipTier !== 'NONE' && (expiresAt > now || userSession.membershipTier === 'TRIAL');

      if (!isMembershipActive && userSession.role !== 'DEV') {
          if (userSession.tokens > 0) {
              onAnalyze();
              return;
          } else {
              setShowStore(true);
              setStoreView('SELECTION');
              setShowDashboard(false);
              return;
          }
      }
      onAnalyze();
`;

code = code.replace(/const now = getTrueTime\(\);\s*const expiresAt = userSession\.membershipExpiresAt \|\| 0;\s*const isMembershipActive = userSession\.membershipTier !== 'NONE' && expiresAt > now;\s*\/\/ Logic: If No Active Membership -> REDIRECT TO STORE\s*if \(!isMembershipActive\) \{\s*setShowStore\(true\);\s*setStoreView\('SELECTION'\);\s*setShowDashboard\(false\);\s*\} else \{\s*onAnalyze\(\);\s*\}/, replaceLogic);

fs.writeFileSync('components/FloatingUI.tsx', code);
console.log("Updated FloatingUI.tsx");
