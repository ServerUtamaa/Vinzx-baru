const fs = require('fs');
let appCode = fs.readFileSync('App.tsx', 'utf8');

appCode = appCode.replace(
    "const [showWelcome, setShowWelcome] = useState(true);",
    "const [showWelcome, setShowWelcome] = useState(true);\n  const [showBannedPopup, setShowBannedPopup] = useState(false);"
);

const fetchUserOld = `      const fetchUserData = async () => {
          const freshData = await getUserData(userSession.username, userSession.uid);
          if (freshData) {`;

const fetchUserNew = `      const fetchUserData = async () => {
          const freshData = await getUserData(userSession.username, userSession.uid);
          if (freshData) {
              if (freshData.user.role === 'REJECTED') {
                  setShowBannedPopup(true);
                  import('firebase/auth').then(({ getAuth, signOut }) => {
                      import('./services/firebaseConfig').then(({ auth }) => {
                          signOut(auth);
                      });
                  });
                  localStorage.removeItem('CURRENT_USER_SESSION');
                  setUserSession({
                      isLoggedIn: false,
                      role: 'USER',
                      username: 'Guest',
                      tokens: 0,
                      membershipTier: 'NONE',
                      membershipExpiresAt: 0
                  });
                  return;
              }`;

appCode = appCode.replace(fetchUserOld, fetchUserNew);

// Add popup markup before </main> or at the end of the return statement before closing div
// The return statement usually has <div className="min-h-screen...
// Let's find </main> or the last </div>
const renderOld = `            <FloatingUI`;
const renderNew = `            {showBannedPopup && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#0a0a0a] border border-red-500/30 p-8 rounded-3xl max-w-md w-full shadow-[0_0_50px_-12px_rgba(239,68,68,0.5)] text-center relative overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 blur-[50px] rounded-full"></div>
                        
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 relative z-10">
                            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                        </div>
                        
                        <h2 className="text-2xl font-black text-white mb-2 relative z-10">AKUN DIBANNED</h2>
                        <p className="text-sm text-zinc-400 mb-8 relative z-10 font-medium leading-relaxed">
                            Akun Anda Di Hapus (Banned Secara Permanen) Oleh Developer Vinzxxfx.
                        </p>
                        
                        <button 
                            onClick={() => setShowBannedPopup(false)}
                            className="w-full py-4 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all uppercase tracking-widest text-sm relative z-10"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
            
            <FloatingUI`;

appCode = appCode.replace(renderOld, renderNew);

fs.writeFileSync('App.tsx', appCode);
console.log("Fixed App.tsx banned logic");
