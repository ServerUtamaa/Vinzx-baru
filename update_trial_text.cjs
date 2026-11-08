const fs = require('fs');
let code = fs.readFileSync('components/FloatingUI.tsx', 'utf8');

const oldLine666 = '<span className="text-[7px] font-black text-[#FFD700] drop-shadow-[0_0_3px_rgba(255,215,0,0.6)] tracking-wider">{userSession.role === \'USER\' ? \'Waktu tersisa \' : \'\'}<span className="text-yellow-400 font-mono tracking-widest">{timeLeftDisplay}</span></span>';
const newLine666 = '<span className="text-[7px] font-black text-[#FFD700] drop-shadow-[0_0_3px_rgba(255,215,0,0.6)] tracking-wider">{tier === \'TRIAL\' ? \'Free Trial (\' : (userSession.role === \'USER\' ? \'Waktu tersisa \' : \'\')}<span className="text-yellow-400 font-mono tracking-widest">{timeLeftDisplay}</span>{tier === \'TRIAL\' ? \')\' : \'\'}</span>';

code = code.replace(oldLine666, newLine666);

const oldLines922 = `{userSession.membershipTier === 'NONE' || (userSession.membershipExpiresAt && userSession.membershipExpiresAt <= getTrueTime()) \n                                                    ? "Berlangganan Sekarang" \n                                                    : timeLeftDisplay}`;
const newLines922 = `{userSession.membershipTier === 'NONE' || (userSession.membershipExpiresAt && userSession.membershipExpiresAt <= getTrueTime()) \n                                                    ? "Berlangganan Sekarang" \n                                                    : (userSession.membershipTier === 'TRIAL' ? \`Free Trial (\${timeLeftDisplay})\` : timeLeftDisplay)}`;

code = code.replace(oldLines922, newLines922);

fs.writeFileSync('components/FloatingUI.tsx', code);
console.log("Updated Trial Text");
