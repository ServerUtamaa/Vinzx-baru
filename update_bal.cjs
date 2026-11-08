const fs = require('fs');
let code = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

const oldBal = '<span className="px-3 py-1 bg-[#110520] border border-purple-900/40 text-purple-300/50 rounded-lg text-[9px] font-bold tracking-widest">BAL {userSession.tokens}</span>';

const newBal = `
{userSession.membershipTier === 'NONE' || (userSession.membershipExpiresAt && userSession.membershipExpiresAt <= getTrueTime()) ? (
    <span className="px-3 py-1 bg-[#110520] border border-purple-900/40 text-purple-300/50 rounded-lg text-[9px] font-bold tracking-widest">TOKEN HARIAN: {userSession.tokens}/3</span>
) : (
    <span className="px-3 py-1 bg-[#110520] border border-purple-900/40 text-purple-300/50 rounded-lg text-[9px] font-bold tracking-widest">UNLIMITED</span>
)}
`;

code = code.replace(oldBal, newBal);

fs.writeFileSync('components/FloatingUI.tsx', code);
console.log("Updated BAL to Token in FloatingUI.tsx");
