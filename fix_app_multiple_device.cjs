const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

if (!code.includes("import { getDeviceId }")) {
    code = code.replace(/import \{ setServerTimeOffset, getTrueTime \} from '\.\/utils\/time';/, "import { setServerTimeOffset, getTrueTime } from './utils/time';\nimport { getDeviceId } from './utils/deviceId';");
}

const multipleDeviceCheck = `
              if (freshData.user.deviceId && freshData.user.deviceId !== getDeviceId()) {
                  alert("Akun Anda Sedang Di Pakai Di Perangkat lain");
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
              }
`;

code = code.replace(/if \(freshData\.user\.role === 'REJECTED'\) \{/, multipleDeviceCheck + "\n              if (freshData.user.role === 'REJECTED') {");

fs.writeFileSync('App.tsx', code);
console.log("Fixed multiple device check in App.tsx");
