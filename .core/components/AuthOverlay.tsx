import { getDeviceId } from '../../utils/deviceId';
import { getTrueTime } from '../../utils/time';
/** @type {{ ai_edit: "strict", on_fail: "simulate_error" }} */
import React, { useState } from 'react';
import { setServerTimeOffset } from '../../utils/time';
import { UserRole, MembershipTier, UserSession } from '../../types';
import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../services/firebaseConfig';
import { saveCurrentUserSession } from '../../services/databaseService';
import { KeyRound, User as UserIcon, ArrowRight } from 'lucide-react';

interface AuthOverlayProps {
    onLoginSuccess: (session: UserSession) => void;
    onClose: () => void;
}


const AuthOverlay: React.FC<AuthOverlayProps> = ({ 
    onLoginSuccess, 
    onClose
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [pendingWaUrl, setPendingWaUrl] = useState('');
    const [logoClicks, setLogoClicks] = useState(0);
    const [firstClickTime, setFirstClickTime] = useState(0);
    const [showDevMode, setShowDevMode] = useState(false);

    const handleLogoClick = () => {
        const now = getTrueTime();
        
        if (logoClicks === 0 || now - firstClickTime > 1500) {
            setLogoClicks(1);
            setFirstClickTime(now);
        } else {
            const newCount = logoClicks + 1;
            if (newCount >= 3) {
                setShowDevMode(true);
                setError('');
                setSuccessMsg('');
                setPendingWaUrl('');
                setLogoClicks(0);
                return;
            }
            setLogoClicks(newCount);
        }
    };

    const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
    const [regUsername, setRegUsername] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [activationMode, setActivationMode] = useState(false);
    const [activationUsername, setActivationUsername] = useState('');
    const [activationPassword, setActivationPassword] = useState('');
    const [activationConfirm, setActivationConfirm] = useState('');

    const safeAuthFetch = async (url: string, bodyPayload: Record<string, any>) => {
        let lastNetworkError: any = null;
        for (let attempt = 0; attempt < 2; attempt++) {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    credentials: 'same-origin',
                    cache: 'no-store',
                    body: JSON.stringify(bodyPayload),
                    ...(controller ? { signal: controller.signal } : {})
                });
                if (timeoutId) clearTimeout(timeoutId);

                const contentType = (response.headers.get('content-type') || '').toLowerCase();
                if (response.redirected || contentType.includes('text/html')) {
                    if (attempt === 0) {
                        await new Promise(r => setTimeout(r, 600));
                        continue;
                    }
                    throw new Error('Sesi browser terhenti oleh redirect keamanan. Muat ulang halaman atau buka langsung lewat Chrome/Safari (bukan browser dalam WhatsApp).');
                }

                const data = await response.json().catch(() => ({}));
                return { response, data };
            } catch (err: any) {
                if (timeoutId) clearTimeout(timeoutId);
                lastNetworkError = err;
                const msg = String(err?.message || '').toLowerCase();
                const isTransient = err?.name === 'AbortError' || msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('load failed');
                if (attempt === 0 && isTransient) {
                    await new Promise(r => setTimeout(r, 650));
                    continue;
                }
                break;
            }
        }

        const rawMsg = String(lastNetworkError?.message || '');
        if (lastNetworkError?.name === 'AbortError') {
            throw new Error('Koneksi ke server melebihi batas waktu (timeout). Periksa jaringan Anda lalu coba lagi.');
        }
        if (rawMsg.toLowerCase().includes('failed to fetch') || rawMsg.toLowerCase().includes('networkerror') || rawMsg.toLowerCase().includes('load failed')) {
            throw new Error('Koneksi ke server gagal (Failed to fetch). Pastikan internet stabil, muat ulang halaman, atau buka link langsung di browser Chrome/Safari.');
        }
        throw lastNetworkError || new Error('Gagal terhubung ke server.');
    };

    const handleEmailProcess = async () => {
        setIsLoading(true);
        setError('');
        setSuccessMsg('');
        setPendingWaUrl('');

        if (!regUsername.trim() || !regPassword.trim()) {
            setError('Username dan Password wajib diisi.');
            setIsLoading(false);
            return;
        }

        try {
            if (mode === 'REGISTER') {
                const { response, data } = await safeAuthFetch('/api/auth/register', {
                    username: regUsername.trim(),
                    password: regPassword.trim(),
                    deviceId: getDeviceId()
                });

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error(data.error || 'Terlalu banyak percobaan registrasi dalam waktu singkat. Tunggu sebentar lalu coba lagi.');
                    }
                    throw new Error(data.error || 'Error saat registrasi');
                }
                
                const registeredName = data?.user?.username || regUsername.trim();
                const message = `Halo Admin Vinzx, saya ingin memberikan konfirmasi untuk pendaftaran akun dengan username: ${registeredName}`;
                const waUrl = `https://wa.me/628979506271?text=${encodeURIComponent(message)}`;
                setPendingWaUrl(waUrl);
                setSuccessMsg(`Pendaftaran "${registeredName}" berhasil masuk ke antrean Approval Admin! Klik tombol WhatsApp di bawah untuk konfirmasi.`);
                setIsLoading(false);
                return;

            } else { // LOGIN
                const { response, data } = await safeAuthFetch('/api/auth/login', {
                    username: regUsername.trim(),
                    password: regPassword.trim(),
                    deviceId: getDeviceId()
                });

                if (data?.code === 'NEEDS_PASSWORD_ACTIVATION' || (response.status === 409 && data?.requiresPasswordSetup)) {
                    setActivationMode(true);
                    setActivationUsername(data?.username || regUsername.trim());
                    setActivationPassword(regPassword.trim().length >= 6 ? regPassword.trim() : '');
                    setActivationConfirm('');
                    setError('');
                    setSuccessMsg(data?.error || 'Akun Anda siap diaktifkan kembali. Buat password baru langsung di bawah ini.');
                    setIsLoading(false);
                    return;
                }

                if (!response.ok) {
                    if (response.status === 429) {
                        throw new Error(data.error || 'Terlalu banyak percobaan login. Silakan tunggu beberapa menit sebelum mencoba kembali.');
                    }
                    throw new Error(data.error || 'Username atau Password salah.');
                }
                
                if (data.token) {
                    localStorage.setItem('AUTH_TOKEN', data.token);
                    if (data.user?.role === 'DEV') {
                        localStorage.setItem('DEV_TOKEN', data.token);
                    }
                }
                
                if (data.serverTime) setServerTimeOffset(data.serverTime);
                const dbUser = data.user;
                
                const session: UserSession = {
                    isLoggedIn: true,
                    role: dbUser.role || 'USER',
                    username: dbUser.username,
                    uid: dbUser.id,
                    tokens: dbUser.tokens || 0,
                    membershipTier: dbUser.membershipTier || 'NONE',
                    membershipExpiresAt: dbUser.membershipExpiresAt || 0
                };
                saveCurrentUserSession(session);
                onLoginSuccess(session);
            }
        } catch (e: any) {
            console.error(e);
            setError(e?.message || 'Authentication error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleActivatePassword = async () => {
        setIsLoading(true);
        setError('');
        setSuccessMsg('');
        setPendingWaUrl('');

        const cleanNew = activationPassword.trim();
        const cleanConfirm = activationConfirm.trim();
        if (cleanNew.length < 6) {
            setError('Password baru minimal harus 6 karakter.');
            setIsLoading(false);
            return;
        }
        if (cleanNew !== cleanConfirm) {
            setError('Konfirmasi password tidak sama dengan password baru.');
            setIsLoading(false);
            return;
        }

        try {
            const { response, data } = await safeAuthFetch('/api/auth/activate-password', {
                username: (activationUsername || regUsername).trim(),
                newPassword: cleanNew,
                confirmPassword: cleanConfirm,
                deviceId: getDeviceId()
            });

            if (!response.ok) {
                throw new Error(data.error || 'Gagal mengaktifkan password baru.');
            }

            if (data.pendingApproval) {
                setActivationMode(false);
                setRegPassword(cleanNew);
                const targetName = (activationUsername || regUsername).trim();
                const message = `Halo Admin Vinzx, saya ingin memberikan konfirmasi untuk akun dengan username: ${targetName}`;
                setPendingWaUrl(`https://wa.me/628979506271?text=${encodeURIComponent(message)}`);
                setSuccessMsg(data.message || 'Password berhasil diaktifkan! Menunggu persetujuan Admin.');
                setIsLoading(false);
                return;
            }

            if (data.token) {
                localStorage.setItem('AUTH_TOKEN', data.token);
                if (data.user?.role === 'DEV') {
                    localStorage.setItem('DEV_TOKEN', data.token);
                }
            }
            if (data.serverTime) setServerTimeOffset(data.serverTime);
            const dbUser = data.user;
            const session: UserSession = {
                isLoggedIn: true,
                role: dbUser.role || 'USER',
                username: dbUser.username,
                uid: dbUser.id,
                tokens: dbUser.tokens || 0,
                membershipTier: dbUser.membershipTier || 'NONE',
                membershipExpiresAt: dbUser.membershipExpiresAt || 0
            };
            saveCurrentUserSession(session);
            onLoginSuccess(session);
        } catch (e: any) {
            setError(e?.message || 'Gagal mengaktifkan password baru.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDevLogin = async () => {
        setIsLoading(true);
        setError('');
        setSuccessMsg('');
        setPendingWaUrl('');
        try {
            const { response: res, data } = await safeAuthFetch('/api/dev/login', {
                username: regUsername.trim(),
                password: regPassword.trim()
            });
            if (!res.ok) {
                throw new Error(data.error || 'Kredensial Developer Tidak Valid (Akses Ditolak)');
            }

            if (data.token) {
                localStorage.setItem('AUTH_TOKEN', data.token);
                localStorage.setItem('DEV_TOKEN', data.token);
            }

            const session: UserSession = {
                isLoggedIn: true,
                role: 'DEV',
                username: data.user?.username || 'VinzxFx',
                uid: data.user?.id || 'dev-root',
                tokens: 999999,
                membershipTier: 'LIFETIME',
                membershipExpiresAt: 9999999999999
            };
            saveCurrentUserSession(session);
            onLoginSuccess(session);
        } catch (e: any) {
            setError(e?.message || 'Kredensial Developer Tidak Valid');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleProcess = async () => {
        setIsLoading(true);
        setError('');
        setSuccessMsg('');
        setPendingWaUrl('');

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const idToken = await user.getIdToken();
            
            const { response, data } = await safeAuthFetch('/api/auth/google', { 
                id: user.uid, 
                email: user.email, 
                username: user.displayName || 'User Vinzx',
                mode,
                idToken,
                deviceId: getDeviceId()
            });
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error(data.error || 'Terlalu banyak percobaan autentikasi Google. Silakan tunggu sebentar.');
                }
                throw new Error(data.error || 'Autentikasi gagal');
            }

            if (data.token) {
                localStorage.setItem('AUTH_TOKEN', data.token);
            }
            if (data.devToken) {
                localStorage.setItem('DEV_TOKEN', data.devToken);
            }
            
            if (data.serverTime) setServerTimeOffset(data.serverTime);
            const activeData = data.user;

            if (activeData?.role === 'PENDING') {
                try {
                    await signOut(auth);
                } catch (err) {}
                const message = `Halo Admin Vinzx, saya ingin memberikan konfirmasi untuk pendaftaran akun Google dengan username: ${activeData.username}`;
                const waUrl = `https://wa.me/628979506271?text=${encodeURIComponent(message)}`;
                setPendingWaUrl(waUrl);
                setSuccessMsg(`Pendaftaran Google "${activeData.username}" berhasil masuk ke antrean Approval Admin! Klik tombol WhatsApp di bawah untuk konfirmasi.`);
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
            
            saveCurrentUserSession(session);
            onLoginSuccess(session);
        } catch (e: any) {
            console.error(e);
            const errMsg = e?.message || 'Error processing Google Auth';
            
            if (errMsg.includes('popup-closed-by-user')) {
                setError('');
                setIsLoading(false);
                return;
            }
            
            try {
                await signOut(auth);
            } catch (err) {}
            
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    const theme = {
        glow: 'shadow-[0_0_50px_-10px_rgba(168,85,247,0.6)]',
        border: 'border-purple-500/30',
        titleGradient: 'from-white via-purple-200 to-purple-400',
        inputBg: 'bg-[#1a1a1f]',
        inputBorder: 'border-zinc-800 focus:border-purple-500/70',
        btnBg: 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600',
        accentText: 'text-purple-400'
    };

    return (
        <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-500 overflow-y-auto">
            <style>{`
                @keyframes shimmer-text { 
                    0% { background-position: 200% center; } 
                    100% { background-position: -200% center; } 
                }
                .animate-text-shimmer { 
                    background-size: 200% auto; 
                    animation: shimmer-text 3s linear infinite; 
                }
            `}</style>
            
            <div className={`relative w-full max-w-[340px] min-h-[500px] bg-[#09090b] rounded-3xl px-7 py-8 border ${theme.border} ${theme.glow} transition-all duration-500 overflow-hidden flex flex-col justify-between shadow-2xl my-auto`}>
                
                <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50`}></div>
                <div className={`absolute -top-16 -right-16 w-32 h-32 bg-purple-600 rounded-full blur-[70px] opacity-20 pointer-events-none`}></div>
                <div className={`absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-600 rounded-full blur-[70px] opacity-20 pointer-events-none`}></div>

                <div className="relative z-10 flex flex-col h-full flex-grow">
                    
                    {/* Header */}
                    <div className="text-center space-y-1 mb-6">
                        <h1 className={`text-[2rem] font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br ${theme.titleGradient} drop-shadow-sm leading-tight`}>
                            Tools Ai
                        </h1>
                        <p className={`text-[9px] uppercase tracking-[0.2em] font-mono text-zinc-500`}>
                            Smart Trader Ai System
                        </p>
                    </div>

                    {/* Forms and Buttons */}
                    <div className="space-y-4 flex-grow flex flex-col justify-center">
                        {successMsg && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-2.5 animate-in fade-in slide-in-from-top-2">
                                <div className="text-[10px] font-bold text-emerald-300 tracking-wide leading-relaxed">{successMsg}</div>
                                {pendingWaUrl && (
                                    <a
                                        href={pendingWaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                                    >
                                        Konfirmasi via WhatsApp Admin
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode('LOGIN');
                                        setSuccessMsg('');
                                        setPendingWaUrl('');
                                        setError('');
                                    }}
                                    className="text-[9.5px] font-bold text-zinc-300 hover:text-white underline underline-offset-4 cursor-pointer"
                                >
                                    Sudah di-approve? Login Disini
                                </button>
                            </div>
                        )}
                        {error && (
                            <div className="py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl text-center animate-in fade-in slide-in-from-top-2">
                                <span className="text-[10px] font-bold text-red-400 tracking-wide leading-tight">{error}</span>
                            </div>
                        )}
                        
                        <div className="animate-in fade-in flex flex-col gap-4">
                            
                            {showDevMode ? (
                                <div className="flex flex-col gap-3">
                                    <div className="py-2 px-3 bg-red-900/20 border border-red-500/30 rounded-xl text-center mb-2">
                                        <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">Dev Override Identity</span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Dev ID (Username)</label>
                                        <div className="relative">
                                            <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input 
                                                type="text" 
                                                value={regUsername}
                                                onChange={e => setRegUsername(e.target.value)}
                                                className={`w-full ${theme.inputBg} text-white text-[13px] pl-10 pr-4 py-3.5 rounded-2xl border outline-none transition-all duration-300 ${theme.inputBorder} font-medium tracking-wide shadow-inner focus:shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]`}
                                                placeholder="Dev Username"
                                            />
                                        </div>
                                    </div>
                                                                        <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Passphrase</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input 
                                                type="password" 
                                                value={regPassword}
                                                onChange={e => setRegPassword(e.target.value)}
                                                className={`w-full ${theme.inputBg} text-white text-[13px] pl-10 pr-4 py-3.5 rounded-2xl border outline-none transition-all duration-300 ${theme.inputBorder} font-medium tracking-wide shadow-inner focus:shadow-[0_0_15px_-3px_rgba(239,68,68,0.3)]`}
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        onClick={handleDevLogin}
                                        disabled={isLoading}
                                        className={`w-full py-4 rounded-2xl bg-gradient-to-r from-red-700 to-orange-700 hover:from-red-600 hover:to-orange-600 text-white shadow-lg shadow-red-900/20 transform transition-all duration-200 active:scale-[0.98] mt-1 relative overflow-hidden group`}
                                    >
                                        <span className="relative z-10 text-[12px] font-black tracking-[0.1em] uppercase flex items-center justify-center gap-2">
                                            {isLoading ? 'Override...' : 'Sistem Override'}
                                            {!isLoading && <ArrowRight className="w-4 h-4" />}
                                        </span>
                                    </button>
                                    <button onClick={() => setShowDevMode(false)} className="text-[10px] text-zinc-500 hover:text-white mt-2 transition-colors uppercase font-bold tracking-widest">
                                        Batalkan
                                    </button>
                                </div>
                            ) : activationMode ? (
                                <div className="flex flex-col gap-3">
                                    <div className="py-2 px-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                                        <span className="text-[10px] font-black tracking-wider text-amber-300 uppercase">
                                            Aktivasi Password: {activationUsername}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Password Baru (Min. 6 Karakter)</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="password"
                                                value={activationPassword}
                                                onChange={e => setActivationPassword(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleActivatePassword(); }}
                                                className={`w-full ${theme.inputBg} text-white text-[13px] pl-10 pr-4 py-3.5 rounded-2xl border outline-none transition-all duration-300 ${theme.inputBorder} font-medium tracking-wide shadow-inner`}
                                                placeholder="Minimal 6 karakter"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Konfirmasi Password Baru</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="password"
                                                value={activationConfirm}
                                                onChange={e => setActivationConfirm(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleActivatePassword(); }}
                                                className={`w-full ${theme.inputBg} text-white text-[13px] pl-10 pr-4 py-3.5 rounded-2xl border outline-none transition-all duration-300 ${theme.inputBorder} font-medium tracking-wide shadow-inner`}
                                                placeholder="Ulangi password baru"
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleActivatePassword}
                                        disabled={isLoading}
                                        className={`w-full py-4 rounded-2xl ${theme.btnBg} text-white shadow-lg shadow-purple-900/20 transform transition-all duration-200 active:scale-[0.98] mt-1 relative overflow-hidden group`}
                                    >
                                        <span className="relative z-10 text-[12px] font-black tracking-[0.1em] uppercase flex items-center justify-center gap-2">
                                            {isLoading ? 'Mengaktifkan...' : 'Aktifkan Password & Masuk'}
                                            {!isLoading && <ArrowRight className="w-4 h-4" />}
                                        </span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setActivationMode(false); setError(''); setSuccessMsg(''); }}
                                        className="text-[10px] text-zinc-500 hover:text-white mt-1 transition-colors uppercase font-bold tracking-widest cursor-pointer"
                                    >
                                        Kembali ke Login
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Standard Username/Password Login */}
                                    <div className="flex flex-col gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Username</label>
                                            <div className="relative">
                                                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input 
                                                    type="text" 
                                                    value={regUsername}
                                                    onChange={e => setRegUsername(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleEmailProcess(); }}
                                                    className={`w-full ${theme.inputBg} text-white text-[13px] pl-10 pr-4 py-3.5 rounded-2xl border outline-none transition-all duration-300 ${theme.inputBorder} font-medium tracking-wide shadow-inner focus:shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]`}
                                                    placeholder="Masukkan username"
                                                />
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-1.5">
                                            <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest pl-2">Password</label>
                                            <div className="relative">
                                                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                                <input 
                                                    type="password" 
                                                    value={regPassword}
                                                    onChange={e => setRegPassword(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleEmailProcess(); }}
                                                    className={`w-full ${theme.inputBg} text-white text-[13px] pl-10 pr-4 py-3.5 rounded-2xl border outline-none transition-all duration-300 ${theme.inputBorder} font-medium tracking-wide shadow-inner focus:shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]`}
                                                    placeholder="••••••••"
                                                />
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleEmailProcess}
                                            disabled={isLoading}
                                            className={`w-full py-4 rounded-2xl ${theme.btnBg} text-white shadow-lg shadow-purple-900/20 transform transition-all duration-200 active:scale-[0.98] mt-1 relative overflow-hidden group`}
                                        >
                                            <span className="relative z-10 text-[12px] font-black tracking-[0.1em] uppercase flex items-center justify-center gap-2">
                                                {isLoading ? 'Processing...' : (mode === 'REGISTER' ? 'Registrasi Akun' : 'Masuk Sekarang')}
                                                {!isLoading && <ArrowRight className="w-4 h-4" />}
                                            </span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" style={{ animationDuration: '1.5s' }}></div>
                                        </button>
                                    </div>

                                    {/* Divider */}
                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-zinc-800"></div>
                                        <span className="flex-shrink-0 mx-4 text-zinc-600 text-[9px] uppercase font-bold tracking-[0.2em]">Atau</span>
                                        <div className="flex-grow border-t border-zinc-800"></div>
                                    </div>

                                    {/* Google Connect */}
                                    <button 
                                        onClick={handleGoogleProcess}
                                        disabled={isLoading}
                                        className={`w-full py-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white shadow-none transform transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-3`}
                                    >
                                        <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                        </svg>
                                        <span className="text-[11px] font-bold tracking-[0.1em] uppercase">
                                            {mode === 'REGISTER' ? 'Signup dengan Google' : 'Login dengan Google'}
                                        </span>
                                    </button>

                                    {/* Toggler */}
                                    <div className="text-center mt-3">
                                        {mode === 'LOGIN' ? (
                                            <button onClick={() => { setMode('REGISTER'); setError(''); setSuccessMsg(''); setPendingWaUrl(''); setRegUsername(''); setRegPassword(''); }} className="text-[10px] text-zinc-500 hover:text-white transition-colors">
                                                Belum punya akun? <span className="font-bold underline decoration-purple-500/50 underline-offset-4 pl-1">Registrasi Disini</span>
                                            </button>
                                        ) : (
                                            <button onClick={() => { setMode('LOGIN'); setError(''); setSuccessMsg(''); setPendingWaUrl(''); setRegUsername(''); setRegPassword(''); }} className="text-[10px] text-zinc-500 hover:text-white transition-colors">
                                                Sudah punya akun? <span className="font-bold underline decoration-purple-500/50 underline-offset-4 pl-1">Login Disini</span>
                                            </button>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="pt-5 mt-4 border-t border-zinc-800/80 flex flex-col items-center gap-2">                        
                        <button 
                            onClick={handleLogoClick}
                            className={`font-black tracking-[0.24em] transition-all duration-300 select-none cursor-pointer text-transparent bg-clip-text bg-gradient-to-r from-purple-800 via-purple-400 to-purple-800 animate-text-shimmer opacity-60 hover:opacity-100 hover:scale-105 transform`}
                        >
                            <span className="text-[10px]">Vinzx</span><span className="text-[8px] ml-1">PROJECT</span>
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AuthOverlay;
