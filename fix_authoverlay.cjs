const fs = require('fs');
let appCode = fs.readFileSync('.core/components/AuthOverlay.tsx', 'utf8');

const target = `            if (data.serverTime) setServerTimeOffset(data.serverTime);
            const activeData = data.user;


            const session: UserSession = {
                isLoggedIn: true,
                role: activeData?.role || 'USER',
                username: activeData?.username || user.displayName || 'User Vinzx',
                uid: activeData?.id || user.uid,
                tokens: activeData?.tokens || 0,
                membershipTier: activeData?.membershipTier || 'NONE',
                membershipExpiresAt: activeData?.membershipExpiresAt || 0
            };
            
            if (session.role === 'DEV') {
                localStorage.setItem('DEV_TOKEN', 'vinzx-dev-override');
            }
            saveCurrentUserSession(session);
            onLoginSuccess(session);
        } catch (e: any) {`;

const replace = `            if (data.serverTime) setServerTimeOffset(data.serverTime);
            const activeData = data.user;

            if (mode === 'REGISTER' && activeData?.role === 'PENDING') {
                const message = \`Halo Admin Vinzx, saya ingin memberikan konfirmasi untuk pendaftaran akun Google dengan username: \${activeData.username}\`;
                window.open(\`https://wa.me/628979506271?text=\${encodeURIComponent(message)}\`, '_blank');
                
                setError('Pendaftaran berhasil! Mengalihkan ke WhatsApp untuk persetujuan admin...');
                setIsLoading(false);
                return;
            }

            const session: UserSession = {
                isLoggedIn: true,
                role: activeData?.role || 'USER',
                username: activeData?.username || user.displayName || 'User Vinzx',
                uid: activeData?.id || user.uid,
                tokens: activeData?.tokens || 0,
                membershipTier: activeData?.membershipTier || 'NONE',
                membershipExpiresAt: activeData?.membershipExpiresAt || 0
            };
            
            if (session.role === 'DEV') {
                localStorage.setItem('DEV_TOKEN', 'vinzx-dev-override');
            }
            saveCurrentUserSession(session);
            onLoginSuccess(session);
        } catch (e: any) {`;

appCode = appCode.replace(target, replace);
fs.writeFileSync('.core/components/AuthOverlay.tsx', appCode);
console.log("Fixed AuthOverlay.tsx");
