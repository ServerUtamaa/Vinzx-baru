const fs = require('fs');
let code = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

const effectCode = `
  useEffect(() => {
      if (userSession.isLoggedIn && userSession.role !== 'DEV') {
          const isMembershipActive = userSession.membershipTier !== 'NONE' && (userSession.membershipExpiresAt ? userSession.membershipExpiresAt > getTrueTime() : true);
          if (!isMembershipActive && userSession.tokens <= 0) {
              setShowStore(true);
              setStoreView('SELECTION');
              setShowDashboard(false);
          }
      }
  }, [userSession]);
`;

// Insert the effect after setCurrentMarketStatus(status);
const insertionPoint = `const [currentMarketStatus, setCurrentMarketStatus] = useState(checkMarketStatus(currentAsset));`;
code = code.replace(insertionPoint, insertionPoint + "\n" + effectCode);

fs.writeFileSync('components/FloatingUI.tsx', code);
console.log("Patched FloatingUI.tsx auto store!");
