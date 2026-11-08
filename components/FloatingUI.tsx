
/** @type {{ ai_edit: "strict", on_fail: "simulate_error" }} */
import React, { useState, useEffect } from 'react';
import { getTrueTime } from '../utils/time';
import { Asset, Candle, AnalysisResult, TimeFrame, TradeFeedback, VoiceGender, UserSession, ExecutionRecord, MembershipTier, LiveMarketPrice } from '../types';
import { checkMarketStatus } from '../utils/marketHours';
import { validateMembershipCode } from '../.core/constants/membershipCodes';
import { updateUserMembership, updateUserRole, isCodeUsed, markCodeAsUsed } from '../services/databaseService';
import { formatPrice, formatPriceParts, calculateSpreadPips, getAssetPrecision } from '../utils/priceFormatters';
import FundamentalData from './FundamentalData';

interface FloatingUIProps {
  currentAsset: Asset;
  currentTimeframe: TimeFrame;
  onAssetChange: (asset: Asset) => void;
  onTimeframeChange: (tf: TimeFrame) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  analysis: AnalysisResult | null;
  children: React.ReactNode; 
  priceOffset: number;
  setPriceOffset: (offset: number) => void;
  onFeedback: (status: 'WIN' | 'LOSS') => void;
  feedback: TradeFeedback;
  voiceGender: VoiceGender;
  setVoiceGender: (g: VoiceGender) => void;
  onPlayAudio: (text: string) => void;
  isPlayingAudio: boolean;
  userSession: UserSession;
  onRequestAuth: () => void;
  onLogout: () => void;
  onGenerateOtp: (username: string) => string;
  executionHistory: ExecutionRecord[];
  isOnline: boolean;
  serverMarketClosed: boolean;
  livePrice?: LiveMarketPrice;
  activeCandle?: Candle;
}

const QRIS_IMAGE_URL = "https://i.ibb.co.com/WNs2zLC1/Screenshot-20260307-144011-1.jpg"; 

const MEMBERSHIP_IMAGES = {
    'WEEKLY': "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg",
    'BIWEEKLY': "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg",
    'BASIC': "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg",   
    'VIP': "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg",     
    'MONTHLY': "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg",  
    'LIFETIME': "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg", 
    'NONE': ""
};

const ASSET_GROUPS = [
  { id: "COMMODITY", title: "COMMODITY (METAL, OIL & INDICES)", badge: "COMMODITY", icon: "🪙", schedule: "24/5 HARI", assets: [Asset.XAUUSD, Asset.XAGUSD, Asset.XPTUSD, Asset.USOIL, Asset.NASDAQ] },
  { id: "CRYPTO", title: "CRYPTO CURRENCY", badge: "CRYPTO", icon: "⚡", schedule: "24/7 HARI", assets: [Asset.BTCUSD, Asset.ETHUSD, Asset.SOLUSD, Asset.BNBUSD] },
  { id: "FOREX", title: "FOREX MAJOR & CROSS PAIRS", badge: "FOREX", icon: "💱", schedule: "24/5 HARI", assets: [Asset.EURUSD, Asset.GBPUSD, Asset.USDJPY, Asset.AUDUSD, Asset.USDCHF, Asset.NZDUSD, Asset.GBPJPY, Asset.EURJPY] }
];

const ASSET_DETAILS: Record<string, { symbol: string; name: string }> = {
  // 1. COMMODITY (METAL, OIL & INDICES)
  [Asset.XAUUSD]: { symbol: "XAUUSD", name: "Gold" },
  [Asset.XAGUSD]: { symbol: "XAGUSD", name: "Silver" },
  [Asset.XPTUSD]: { symbol: "XPTUSD", name: "Platinum" },
  [Asset.USOIL]: { symbol: "USOIL", name: "WTI Crude Oil" },
  [Asset.NASDAQ]: { symbol: "NASDAQ", name: "US Tech 100" },

  // 2. CRYPTO CURRENCY
  [Asset.BTCUSD]: { symbol: "BTCUSDT", name: "Bitcoin" },
  [Asset.ETHUSD]: { symbol: "ETHUSDT", name: "Ethereum" },
  [Asset.SOLUSD]: { symbol: "SOLUSDT", name: "Solana" },
  [Asset.BNBUSD]: { symbol: "BNBUSDT", name: "Binance Coin" },

  // 3. FOREX MAJOR & CROSS PAIRS
  [Asset.EURUSD]: { symbol: "EURUSD", name: "Euro" },
  [Asset.GBPUSD]: { symbol: "GBPUSD", name: "British Pound" },
  [Asset.USDJPY]: { symbol: "USDJPY", name: "Japanese Yen" },
  [Asset.AUDUSD]: { symbol: "AUDUSD", name: "Australian Dollar" },
  [Asset.USDCHF]: { symbol: "USDCHF", name: "Swiss Franc" },
  [Asset.NZDUSD]: { symbol: "NZDUSD", name: "New Zealand Dollar" },
  [Asset.GBPJPY]: { symbol: "GBPJPY", name: "Pound Yen" },
  [Asset.EURJPY]: { symbol: "EURJPY", name: "Euro Yen" },
};

interface MembershipPackage {
    id: string;
    tier: MembershipTier;
    subtitle: string;
    durationLabel: string;
    price: number;
    originalPrice: number;
    saveLabel: string;
    features: string[];
    theme: 'GOLD' | 'PURPLE' | 'BLUE';
    isBestValue?: boolean;
    qrisUrl: string;
}

const MEMBERSHIP_PACKAGES: MembershipPackage[] = [
    { id: 'MEM_BASIC', tier: 'BASIC', subtitle: 'Essential Kit', durationLabel: '/ 7 Hari', price: 80000, originalPrice: 120000, saveLabel: 'HEMAT 40.000', features: ["Full akses Bebas Analisa Unlimited", "Akses SMC & Candlestick Pattern", "Validasi Entry EMA 50/200", "Cocok untuk Pelajar/Budget Minim"], theme: 'BLUE', qrisUrl: "https://i.ibb.co.com/8gsC037D/Screenshot-20260413-231311-1.jpg" },
    { id: 'MEM_VIP', tier: 'VIP', subtitle: 'Advanced Tools', durationLabel: '/ 14 Hari', price: 150000, originalPrice: 250000, saveLabel: 'HEMAT 100K', features: ["Full akses Bebas Analisa Unlimited", "Prioritas Server (Analisa Lebih Cepat)", "Akses Fitur Swing Trade & Day Trade", "Support Setup Scalping High Winrate"], theme: 'PURPLE', qrisUrl: "https://i.ibb.co.com/FqKnSTT6/Screenshot-20260413-231321-1.jpg" },
    { id: 'MEM_MONTHLY', tier: 'MONTHLY', subtitle: 'Premium Access', durationLabel: '/ 30 Hari', price: 230000, originalPrice: 420000, saveLabel: 'HEMAT 190K', features: ["Unlock Semua Fitur-Fitur Trading", "Full akses Bebas Analisa Unlimited", "Bisa Baca Manipulasi Bandar Besar", "Kombinasi Data Multi-Timeframe (H4 + M15 + Konfimasi Entry M5)", "Harga Termurah (Tp Ratusan Pips Per -1 Analisa Dan Sl Maksimal 70Pips)"], theme: 'GOLD', isBestValue: true, qrisUrl: "https://i.ibb.co.com/DP890BvJ/Screenshot-20260413-225445-1.jpg" }
];

const HISTORY_FILTERS = [
    { label: '1D', ms: 24 * 60 * 60 * 1000 },
    { label: '1W', ms: 7 * 24 * 60 * 60 * 1000 },
    { label: '2W', ms: 14 * 24 * 60 * 60 * 1000 },
    { label: '1M', ms: 30 * 24 * 60 * 60 * 1000 },
    { label: '3M', ms: 90 * 24 * 60 * 60 * 1000 },
    { label: '6M', ms: 180 * 24 * 60 * 60 * 1000 },
    { label: '8M', ms: 240 * 24 * 60 * 60 * 1000 },
    { label: '1Y', ms: 365 * 24 * 60 * 60 * 1000 },
];

const FloatingUI: React.FC<FloatingUIProps> = ({
  currentAsset, currentTimeframe, onAssetChange, onTimeframeChange, onAnalyze, isAnalyzing, analysis, children,
  priceOffset, setPriceOffset, onFeedback, feedback, voiceGender, setVoiceGender, onPlayAudio, isPlayingAudio,
  userSession, onRequestAuth, onLogout, onGenerateOtp, executionHistory, isOnline, serverMarketClosed,
  livePrice, activeCandle
}) => {
  const [showAssetSelector, setShowAssetSelector] = useState(false);
  const [marketFilterTab, setMarketFilterTab] = useState<'ALL' | 'COMMODITY' | 'CRYPTO' | 'FOREX'>('ALL');
  const [showDashboard, setShowDashboard] = useState(false);
  const [showStore, setShowStore] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHamburgerMenu, setShowHamburgerMenu] = useState(false);
  const [showFundamentalData, setShowFundamentalData] = useState(false);
  const [storeView, setStoreView] = useState<'SELECTION' | 'PAYMENT'>('SELECTION');
  
  // REMOVED TOKEN PACKAGES & TAB STATE
  const [selectedProduct, setSelectedProduct] = useState<{ type: 'MEMBER', data: any } | null>(null);
  const [currentMarketStatus, setCurrentMarketStatus] = useState(checkMarketStatus(currentAsset));

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


  useEffect(() => {
    let status = checkMarketStatus(currentAsset);
    if (serverMarketClosed) status = { isOpen: false, message: "MARKET TUTUP" };
    setCurrentMarketStatus(status);
    const interval = setInterval(() => {
        let st = checkMarketStatus(currentAsset);
        if (serverMarketClosed) st = { isOpen: false, message: "MARKET TUTUP" };
        setCurrentMarketStatus(st);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentAsset, serverMarketClosed]);
  
  const [historyFilter, setHistoryFilter] = useState(HISTORY_FILTERS[0]); 
  const [showAnalysisLog, setShowAnalysisLog] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [membershipCode, setMembershipCode] = useState("");
  const [isActivatingCode, setIsActivatingCode] = useState(false);
  const [codeMessage, setCodeMessage] = useState<{ text: string, type: 'SUCCESS' | 'ERROR' } | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [clockTime, setClockTime] = useState<number>(() => getTrueTime());
  const [showSessionSchedule, setShowSessionSchedule] = useState<boolean>(false);

  useEffect(() => {
      const timer = setInterval(() => setClockTime(getTrueTime()), 1000);
      return () => clearInterval(timer);
  }, []);

  // DEV Control State
  const [devUsers, setDevUsers] = useState<any[]>([]);
  const [isFetchingDevUsers, setIsFetchingDevUsers] = useState(false);
  const [devActiveTab, setDevActiveTab] = useState<'ALL' | 'APPROVAL' | 'MEMBERSHIP' | 'REJECTED'>('ALL');
  const [devSearchQuery, setDevSearchQuery] = useState("");
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  useEffect(() => {
      if (showHamburgerMenu && userSession.role === 'DEV') {
          fetchDevUsers();
      }
  }, [showHamburgerMenu, userSession.role]);

  const fetchDevUsers = async () => {
      setIsFetchingDevUsers(true);
      try {
          const token = localStorage.getItem('DEV_TOKEN') || '';
          const res = await fetch('/api/dev/users', {
              headers: { 
                  'x-dev-token': token
              }
          });
          if (!res.ok) throw new Error('Failed to fetch');
          const usersList = await res.json();
          if (Array.isArray(usersList)) {
              setDevUsers(usersList);
          }
      } catch (e: any) {
          console.error("Failed to fetch dev users", e);
      } finally {
          setIsFetchingDevUsers(false);
      }
  };

  const handleAcceptUser = async (userId: string) => {
      if (!confirm('Terima pendaftaran user ini?')) return;
      try {
          const token = localStorage.getItem('DEV_TOKEN') || '';
          const res = await fetch(`/api/dev/users/${userId}/accept`, {
              method: 'POST',
              headers: {
                  'x-dev-token': token
              }
          });
          if (!res.ok) throw new Error('Failed to accept');
          alert('User Diterima! User sekarang dapat login.');
          fetchDevUsers();
      } catch (e) {
          console.error("Failed to accept user", e);
          alert('Error koneksi atau akses ditolak.');
      }
  };

  const handleRejectUser = async (userId: string) => {
      if (!confirm('Tolak registrasi ini?')) return;
      try {
          const token = localStorage.getItem('DEV_TOKEN') || '';
          const res = await fetch(`/api/dev/users/${userId}/reject`, {
              method: 'POST',
              headers: {
                  'x-dev-token': token
              }
          });
          if (!res.ok) throw new Error('Failed to reject');
          alert('Registrasi Ditolak.');
          fetchDevUsers();
      } catch (e) {
          console.error("Failed to reject user", e);
          alert('Error koneksi atau akses ditolak.');
      }
  };

  const handleAddMembership = async (userId: string, durationDays: number) => {
      if (!confirm(`Tambahkan membership ${durationDays} Hari untuk user ini?`)) return;
      try {
          const token = localStorage.getItem('DEV_TOKEN') || '';
          const res = await fetch(`/api/dev/users/${userId}/membership`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'x-dev-token': token
              },
              body: JSON.stringify({ durationDays })
          });
          if (!res.ok) throw new Error('Failed to add membership');
          alert(`Berhasil menambahkan membership ${durationDays} hari!`);
          fetchDevUsers();
      } catch (e) {
          console.error("Failed to update membership", e);
          alert('Error koneksi atau akses ditolak.');
      }
  };

  // REALTIME COUNTDOWN STATE
  const [timeLeftDisplay, setTimeLeftDisplay] = useState("00:00:00");

  useEffect(() => { if (analysis) { setShowAnalysisLog(true); setFeedbackSubmitted(false); } }, [analysis]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // COUNTDOWN EFFECT
  useEffect(() => {
    const updateCountdown = () => {
        const now = getTrueTime();
        const expiresAt = userSession.membershipExpiresAt || 0;
        const diff = expiresAt - now;

        if (diff <= 0) {
            setTimeLeftDisplay("0 Hari");
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0 || hours > 0 || minutes > 0) {
            setTimeLeftDisplay(`${days}d ${hours}h ${minutes}m`);
        } else {
            setTimeLeftDisplay(`${seconds}s`);
        }
    };

    updateCountdown(); // Run immediately
    const interval = setInterval(updateCountdown, 1000); // Run every second

    return () => clearInterval(interval);
  }, [userSession.membershipExpiresAt]);


  const handleMembershipSelect = (pkg: MembershipPackage) => { setSelectedProduct({ type: 'MEMBER', data: pkg }); setStoreView('PAYMENT'); };
  const handleBackToStore = () => setStoreView('SELECTION');

  const handleConfirmWhatsapp = () => {
      if (!selectedProduct) return;
      let message = "";
      // ONLY MEMBERSHIP LOGIC LEFT
      const pkg = selectedProduct.data as MembershipPackage;
      message = `Halo Admin Tools Ai, Saya Mau Mengirimkan pembayaran via QRIS sebesar Rp ${pkg.price.toLocaleString('id-ID')} untuk *MEMBERSHIP ${pkg.tier}*. \n\nBenefit: \nFull akses Bebas Analisa Unlimited\n\nMohon diaktifkan ke Username: *${userSession.username}*`;
      
      const url = `https://wa.me/628979506271?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleContactSupport = () => {
      const message = `Halo Admin 👋\nSaya butuh bantuan.\n\nNama Account: ${userSession.username}\nJelaskan Masalah Anda:.... \nTerika kasih 🙏`;
      const url = `https://wa.me/628979506271?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
  };

  const handleActivateMembershipCode = async () => {
      if (!membershipCode.trim()) return;
      
      setIsActivatingCode(true);
      setCodeMessage(null);

      // Simulate a small delay for "cryptographic validation" feel
      await new Promise(resolve => setTimeout(resolve, 1500));

      const inputCode = membershipCode.trim();

      try {
          const membershipType = await validateMembershipCode(inputCode);
          
          if (membershipType === 'WEEKLY') {
              if (await isCodeUsed(inputCode)) {
                  setCodeMessage({ text: "KODE INI SUDAH PERNAH DIGUNAKAN / KOMPUTER INI SUDAH MEMAKAI KODE SEBELUMNYA!", type: 'ERROR' });
              } else {
                  const success = await markCodeAsUsed(inputCode, userSession.uid || userSession.username);
                  if (success) {
                      await updateUserMembership(userSession.uid || userSession.username, 'WEEKLY', 7);
                      setCodeMessage({ text: "MEMBERSHIP BERHASIL DIAKTIFKAN! (1 MINGGU)\nMasa pakai berjalan di latar belakang pada Akun Google & Perangkat ini.", type: 'SUCCESS' });
                      setMembershipCode("");
                      setTimeout(() => {
                          setShowHamburgerMenu(false);
                          setShowDashboard(false);
                          setCodeMessage(null);
                      }, 2000);
                  } else {
                      setCodeMessage({ text: "KODE SUDAH DIGUNAKAN ATAU PERANGKAT INI SUDAH PERNAH PAKAI KODE!", type: 'ERROR' });
                  }
              }
          } else if (membershipType === 'BIWEEKLY') {
              if (await isCodeUsed(inputCode)) {
                  setCodeMessage({ text: "KODE INI SUDAH PERNAH DIGUNAKAN / KOMPUTER INI SUDAH MEMAKAI KODE SEBELUMNYA!", type: 'ERROR' });
              } else {
                  const success = await markCodeAsUsed(inputCode, userSession.uid || userSession.username);
                  if (success) {
                      await updateUserMembership(userSession.uid || userSession.username, 'BIWEEKLY', 14);
                      setCodeMessage({ text: "MEMBERSHIP BERHASIL DIAKTIFKAN! (2 MINGGU)\nMasa pakai berjalan di latar belakang pada Akun Google & Perangkat ini.", type: 'SUCCESS' });
                      setMembershipCode("");
                      setTimeout(() => {
                          setShowHamburgerMenu(false);
                          setShowDashboard(false);
                          setCodeMessage(null);
                      }, 2000);
                  } else {
                      setCodeMessage({ text: "KODE SUDAH DIGUNAKAN ATAU PERANGKAT INI SUDAH PERNAH PAKAI KODE!", type: 'ERROR' });
                  }
              }
          } else if (membershipType === 'MONTHLY') {
              if (await isCodeUsed(inputCode)) {
                  setCodeMessage({ text: "KODE INI SUDAH PERNAH DIGUNAKAN / KOMPUTER INI SUDAH MEMAKAI KODE SEBELUMNYA!", type: 'ERROR' });
              } else {
                  const success = await markCodeAsUsed(inputCode, userSession.uid || userSession.username);
                  if (success) {
                      await updateUserMembership(userSession.uid || userSession.username, 'MONTHLY', 30);
                      setCodeMessage({ text: "MEMBERSHIP BERHASIL DIAKTIFKAN! (1 BULAN)\nMasa pakai berjalan di latar belakang pada Akun Google & Perangkat ini.", type: 'SUCCESS' });
                      setMembershipCode("");
                      setTimeout(() => {
                          setShowHamburgerMenu(false);
                          setShowDashboard(false);
                          setCodeMessage(null);
                      }, 2000);
                  } else {
                      setCodeMessage({ text: "KODE SUDAH DIGUNAKAN ATAU PERANGKAT INI SUDAH PERNAH PAKAI KODE!", type: 'ERROR' });
                  }
              }
          } else {
              setCodeMessage({ text: "KODE TIDAK VALID!", type: 'ERROR' });
          }
      } catch (e) {
          setCodeMessage({ text: "Gagal memvalidasi kode. Coba lagi.", type: 'ERROR' });
      }
      
      setIsActivatingCode(false);
      
      // Clear message after 5 seconds
      setTimeout(() => setCodeMessage(null), 5000);
  };

  const handleFeedbackClick = (status: 'WIN' | 'LOSS') => {
      if(feedbackSubmitted) return;
      onFeedback(status);
      setFeedbackSubmitted(true);
  };

  const handleAnalyzeClick = () => {
      if (!userSession.isLoggedIn || userSession.username === 'Vinzx Family') {
          onRequestAuth();
          return;
      }

      if (userSession.role === 'DEV') {
          onAnalyze();
          return;
      }

      
      const now = getTrueTime();
      const expiresAt = userSession.membershipExpiresAt || 0;
      const isMembershipActive = userSession.membershipTier !== 'NONE' && (expiresAt > now || userSession.membershipTier === 'TRIAL');

      if (!isMembershipActive && (userSession.role as string) !== 'DEV') {
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

  };

  const renderAnalysisCard = () => {
    if (!analysis) return null;
    const isBuy = analysis.signal === 'BUY';
    const mainColor = isBuy ? 'text-[#00ff9d]' : 'text-[#ff0055]';
    const bgGlow = isBuy ? 'shadow-[0_0_30px_-10px_rgba(0,255,157,0.1)]' : 'shadow-[0_0_30px_-10px_rgba(255,0,85,0.1)]';
    return (
      <div className={`mt-2 w-full bg-[#0a0a0a] border border-zinc-800 rounded-xl overflow-hidden ${bgGlow} relative z-10 transition-all duration-500`}>
        <div className={`flex justify-between items-center px-4 py-2 border-b border-zinc-800 relative overflow-hidden`}>
            <div className={`absolute top-0 left-0 w-full h-[2px] ${isBuy ? 'bg-[#00ff9d]' : 'bg-[#ff0055]'}`}></div>
            <div className="flex flex-col">
                <span className={`text-[9px] font-black tracking-[0.2em] ${mainColor} uppercase`}>ENTRY SIGNAL</span>
                <span className={`text-2xl font-black ${mainColor} leading-none mt-1`}>{analysis.signal}</span>
            </div>
            <div className="flex items-center gap-4">
                 <div className="flex flex-col items-end">
                    <div className={`flex items-center gap-1 text-[10px] font-bold ${mainColor}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isBuy ? 'bg-[#00ff9d]' : 'bg-[#ff0055]'} animate-pulse`}></div>
                        {analysis.confidence}% CONF.
                    </div>
                    <div className="text-[9px] font-mono text-zinc-300 font-bold bg-zinc-900/90 border border-zinc-700/80 px-1.5 py-0.5 rounded mt-0.5">PLAN RR {analysis.riskRewardRatio}</div>
                 </div>
                 <button onClick={() => setShowAnalysisLog(!showAnalysisLog)} className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">
                    {showAnalysisLog ? '▼' : '▲'}
                 </button>
            </div>
        </div>
        <div className="grid grid-cols-3 border-b border-zinc-800 divide-x divide-zinc-800">
             <div className="p-3 text-center"><div className="text-[8px] font-bold text-zinc-500 tracking-wider mb-1">ENTRY</div><div className="text-xs font-mono font-bold text-white">{analysis.entryPrice.toFixed(2)}</div></div>
             <div className="p-3 text-center bg-red-900/10"><div className="text-[8px] font-bold text-red-400 tracking-wider mb-1">SL</div><div className="text-xs font-mono font-bold text-red-400">{analysis.stopLoss.toFixed(2)}</div></div>
             <div className="p-3 text-center bg-green-900/10"><div className="text-[8px] font-bold text-green-400 tracking-wider mb-1">TP</div><div className="text-xs font-mono font-bold text-green-400">{analysis.takeProfit.toFixed(2)}</div></div>
        </div>
        {showAnalysisLog && (
            <div className="p-4 bg-[#0a0a0a] animate-in slide-in-from-top-2 duration-300">
                {/* VINZX THINKING ENGINE BADGE */}
                {analysis.activeModel && (
                    <div className="mb-3 px-3 py-2 bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-zinc-900/40 border border-emerald-500/20 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                            <div className="flex flex-col">
                                <span className="text-[7px] font-black text-emerald-400 tracking-widest uppercase">VINZX THINKING ENGINE</span>
                                <span className="text-[10px] font-mono font-bold text-white">{analysis.activeModel}</span>
                            </div>
                        </div>
                        <span className="text-[8px] font-mono font-bold text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            CAPACITY VERIFIED
                        </span>
                    </div>
                )}
                {analysis.drlMetrics && (
                    <div className="mb-4 p-3 bg-[#111] border border-purple-500/20 rounded-xl shadow-[0_0_15px_-5px_rgba(168,85,247,0.15)] relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[30px] rounded-full"></div>
                        <div className="flex items-center gap-2 mb-3 relative z-10">
                            <svg className="w-3.5 h-3.5 text-purple-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                            <span className="text-[9px] font-black text-purple-400 tracking-[0.2em] uppercase">DRL NEURON (PPO/SAC)</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3 relative z-10">
                            <div className="p-2 bg-black/50 rounded-lg border border-zinc-800/50 flex flex-col">
                                <span className="text-[7px] text-zinc-500 font-bold tracking-wider mb-1">STATE VALUE V(s)</span>
                                <span className="text-[10px] font-mono text-white">{analysis.drlMetrics.stateValue.toFixed(4)}</span>
                            </div>
                            <div className="p-2 bg-black/50 rounded-lg border border-zinc-800/50 flex flex-col">
                                <span className="text-[7px] text-zinc-500 font-bold tracking-wider mb-1">ADVANTAGE A(s,a)</span>
                                <span className={`text-[10px] font-mono ${analysis.drlMetrics.advantage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {analysis.drlMetrics.advantage > 0 ? '+' : ''}{analysis.drlMetrics.advantage.toFixed(4)}
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2 relative z-10">
                            <div className="text-[7px] text-zinc-500 font-bold tracking-wider mb-1">POLICY PROBABILITIES π(a|s)</div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-mono font-bold text-green-400 w-8">BUY</span>
                                <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-500 rounded-full transition-all duration-1000" style={{ width: `${analysis.drlMetrics.buyProb * 100}%` }}></div>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-400 w-8 text-right">{(analysis.drlMetrics.buyProb * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[8px] font-mono font-bold text-red-400 w-8">SELL</span>
                                <div className="flex-1 h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full transition-all duration-1000" style={{ width: `${analysis.drlMetrics.sellProb * 100}%` }}></div>
                                </div>
                                <span className="text-[8px] font-mono text-zinc-400 w-8 text-right">{(analysis.drlMetrics.sellProb * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                )}
                <div className="mb-5 p-3.5 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-2.5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-1.5 opacity-10">
                        <svg className="w-16 h-16 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <svg className="w-3 h-3 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span className="text-[10px] font-black text-zinc-200 tracking-wide">Keputusan entry ada di tangan masing-masing.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <svg className="w-3 h-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        <span className="text-[10px] font-black text-blue-400 tracking-wide">Risk–Reward wajib sesuai trading plan.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        <span className="text-[10px] font-black text-red-400 tracking-wide">Tidak ada rekomendasi full margin.</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        <span className="text-[10px] font-black text-green-400 tracking-wide">Jaga money management dengan disiplin.</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mb-3">
                    <div className={`flex items-center gap-2 text-[9px] font-black ${isBuy ? 'text-green-500' : 'text-red-500'} uppercase tracking-widest`}>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        ANALYSIS LOG (30-POINT PROTOCOL)
                    </div>
                    <button onClick={() => onPlayAudio(analysis.reasoning.join('. '))} className="flex items-center gap-2 px-3 py-1 bg-[#1a1a1a] border border-zinc-700 rounded-full hover:border-zinc-500 transition-all group">
                        {isPlayingAudio ? <div className="flex gap-1"><div className="w-0.5 h-2 bg-green-500 animate-[bounce_0.5s_infinite]"></div><div className="w-0.5 h-2 bg-green-500 animate-[bounce_0.5s_infinite_0.1s]"></div><div className="w-0.5 h-2 bg-green-500 animate-[bounce_0.5s_infinite_0.2s]"></div></div> : <svg className="w-3 h-3 text-zinc-400 group-hover:text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                        <span className="text-[9px] font-bold text-zinc-300 group-hover:text-white">PLAY</span>
                    </button>
                </div>
                <div className="max-h-[320px] overflow-y-auto space-y-3 pl-2 border-l border-zinc-800 pr-1 custom-scrollbar">
                    {analysis.reasoning && analysis.reasoning.map((r, i) => (
                        <div key={i} className="flex gap-2"><div className="mt-0.5 w-3 h-3 bg-zinc-900 border border-zinc-700 rounded flex items-center justify-center flex-shrink-0">{i === 0 ? (
                                    <svg className="w-2 h-2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                                ) : (i === 1 ? (
                                    <svg className="w-2 h-2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
                                ) : (
                                    <svg className="w-2 h-2 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
                                ))}</div><p className="text-[10px] text-zinc-300 leading-relaxed font-mono">{typeof r === 'string' ? r.replace(/^\d+\.\s*/, '') : r}</p></div>
                    ))}
                </div>

                {analysis.smcConceptsFound && analysis.smcConceptsFound.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-zinc-800">
                        <div className="text-[8px] font-bold text-zinc-500 tracking-wider uppercase mb-2">DETECTED SMC CONCEPTS</div>
                        <div className="flex flex-wrap gap-1.5">
                            {analysis.smcConceptsFound.map((concept, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded text-[8px] font-mono text-zinc-300">
                                    {concept}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {analysis.prediction && (
                    <div className="mt-4 p-3 bg-purple-900/10 border border-purple-500/20 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-700">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            <span className="text-[9px] font-black text-purple-400 tracking-[0.2em] uppercase">FUTURE PREDICTION (10-25 CANDLES)</span>
                        </div>
                        <p className="text-[10px] text-zinc-300 leading-relaxed font-mono italic mb-3">
                            "{analysis.prediction}"
                        </p>
                        
                        {(analysis.nextPricePrediction || analysis.trendPrediction) && (
                            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-purple-500/20">
                                {analysis.nextPricePrediction && (
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-bold text-zinc-500 tracking-wider uppercase mb-1">NEXT PRICE TARGET</span>
                                        <span className="text-xs font-mono font-bold text-white">{analysis.nextPricePrediction.toFixed(2)}</span>
                                    </div>
                                )}
                                {analysis.trendPrediction && (
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-bold text-zinc-500 tracking-wider uppercase mb-1">MARKET TREND</span>
                                        <span className={`text-[10px] font-black tracking-widest uppercase ${analysis.trendPrediction === 'BULLISH' ? 'text-green-400' : analysis.trendPrediction === 'BEARISH' ? 'text-red-400' : 'text-blue-400'}`}>
                                            {analysis.trendPrediction}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4 pt-2 border-t border-zinc-900/80">
                     <div className="text-[8px] font-black text-zinc-500 text-center tracking-[0.2em] mb-2 uppercase">AI ACCURACY FEEDBACK</div>
                     {!feedbackSubmitted ? (
                         <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                             <button onClick={() => handleFeedbackClick('WIN')} className="py-2.5 bg-green-900/10 border border-green-500/30 rounded-lg group hover:bg-green-500/10 transition-all flex flex-col items-center justify-center gap-0.5"><span className="text-[10px] font-black text-green-500 group-hover:scale-110 transition-transform">WIN (PROFIT)</span><span className="text-[7px] text-green-500/50">SIGNAL GACOR</span></button>
                             <button onClick={() => handleFeedbackClick('LOSS')} className="py-2.5 bg-red-900/10 border border-red-500/30 rounded-lg group hover:bg-red-500/10 transition-all flex flex-col items-center justify-center gap-0.5"><span className="text-[10px] font-black text-red-500 group-hover:scale-110 transition-transform">LOSS (FIX)</span><span className="text-[7px] text-red-500/50">PERBAIKI SIGNAL</span></button>
                         </div>
                     ) : (
                         <div className="py-2 bg-green-900/10 border border-green-500/20 rounded-lg text-center animate-in zoom-in-95 duration-300 flex items-center justify-center gap-2"><svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="text-[9px] font-black text-green-400 tracking-wider uppercase">TERIMA KASIH ATAS MASUKAN ANDA</span></div>
                     )}
                </div>
            </div>
        )}
      </div>
    );
  };

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  return (
    <div className="relative w-full h-full bg-[#050505] overflow-hidden flex flex-col font-sans">
      {/* NOTCH: Moved outside scroll view to prevent Z-Index/Layout issues */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-[#111] rounded-b-xl border-b border-x border-[#222] z-40 pointer-events-none"></div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar pb-40">
          <div className="px-5 pt-2 pb-2 flex justify-between items-start relative z-50 pointer-events-none"> {/* Wrapper pointer-events-none to let clicks pass through empty spaces */}
              <div className="flex flex-col gap-1 pointer-events-auto"> {/* Re-enable pointer events for content */}
                  <div className="flex items-center gap-3">
                      <h1 className="font-black tracking-[0.12em] italic">
                          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-purple-400 animate-text-shimmer drop-shadow-[0_0_10px_rgba(168,85,247,0.5)] text-[14px]">Vinzx</span>
                          <span className="text-[11px] ml-2 font-black tracking-[0.25em] not-italic text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-white to-purple-400 animate-text-shimmer drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">TRADE INTELLIGENT</span>
                      </h1>
                  </div>
                  <div className="relative inline-block mt-1 flex flex-col gap-1 items-start">
                    <button onClick={() => setShowAssetSelector(true)} className="flex items-center gap-2 bg-[#0f0f11] border border-purple-500/40 hover:border-purple-500 shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] hover:shadow-[0_0_25px_-5px_rgba(168,85,247,0.6)] px-3 py-1.5 rounded-lg transition-all duration-300 group"><span className="text-xs font-black text-white tracking-wider group-hover:text-purple-300 transition-colors">{currentAsset}</span><span className="w-px h-3 bg-zinc-700"></span><span className="text-[9px] text-purple-400 font-bold uppercase">{ASSET_DETAILS[currentAsset]?.name || "ASSET"}</span><span className="text-[10px] text-zinc-500 ml-1">▼</span></button>
                    {!currentMarketStatus.isOpen && (
                        <div className="flex items-center gap-1.5 ml-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${currentMarketStatus.isOpen ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500 shadow-[0_0_5px_#ef4444]'} animate-pulse`}></div>
                            <span className={`text-[7px] font-black tracking-wider uppercase ${currentMarketStatus.isOpen ? 'text-green-500' : 'text-red-500'}`}>{currentMarketStatus.message}</span>
                        </div>
                    )}
                  </div>
              </div>
              <div className="flex items-center gap-2 pointer-events-auto">
                <button 
                  onClick={() => setShowFundamentalData(true)} 
                  className="relative z-[100] h-10 px-3 bg-purple-950/40 border border-purple-500/30 rounded-xl flex items-center gap-1.5 hover:bg-purple-900/50 hover:border-purple-400 transition-all text-purple-300 hover:text-white group cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.25)]" 
                  title="Kalender Fundamental & News (2 Minggu)"
                >
                  <svg className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-black tracking-wider uppercase">News</span>
                </button>
                {installPrompt && (
                  <button onClick={handleInstallClick} className="relative z-[100] w-10 h-10 bg-green-900/20 border border-green-500/30 rounded-xl flex items-center justify-center text-green-500 hover:bg-green-500 hover:text-white transition-all group" title="Install App">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </button>
                )}
                <button onClick={() => {
                    if (!userSession.isLoggedIn) {
                        onRequestAuth();
                    } else {
                        setShowDashboard(true);
                    }
                }} className="relative z-[100] w-10 h-10 bg-[#111] border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-1.5 hover:border-zinc-600 transition-all group cursor-pointer">
                    <div className="w-5 h-0.5 bg-zinc-500 group-hover:bg-white transition-colors rounded-full"></div>
                    <div className="w-3 h-0.5 bg-zinc-500 group-hover:bg-white transition-colors rounded-full ml-2"></div>
                    <div className="w-5 h-0.5 bg-zinc-500 group-hover:bg-white transition-colors rounded-full"></div>
                </button>
              </div>
          </div>
          <div className="px-5 mb-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar">{['M1','M5','M15','M30','H1','H4','D1'].map((tf) => (<button key={tf} onClick={() => onTimeframeChange(tf as TimeFrame)} className={`min-w-[32px] h-[28px] flex items-center justify-center text-[10px] font-bold rounded-lg transition-all ${currentTimeframe === tf ? 'bg-[#003d2e] text-[#00ff9d] border border-[#00ff9d]/30 shadow-[0_0_10px_-4px_#00ff9d]' : 'text-zinc-600 hover:text-zinc-300 hover:bg-white/5'}`}>{tf}</button>))}</div>

          {/* REALTIME RUNNING PRICE & INSTITUTIONAL MARKET TICKER BAR */}
          {(() => {
              const currentP = livePrice?.price || 0;
              const priceParts = formatPriceParts(currentP, currentAsset);
              const isUp = livePrice?.tick === 'UP';
              const isDown = livePrice?.tick === 'DOWN';
              const tickColor = isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-zinc-200';
              const changeVal = livePrice?.change24h || 0;
              const changePct = livePrice?.changePercent || 0;
              const isChangePos = changeVal >= 0;
              const spread = livePrice?.spreadPips || 0;

              return (
                  <div className="mx-3.5 mb-2 px-3.5 py-2.5 rounded-2xl bg-[#0b0c10]/95 border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.6)] select-none backdrop-blur-xl transition-all">
                      {/* Top Bar: Asset Symbol, Timeframe, Live Tick Pill & 24H Session Change */}
                      <div className="flex items-center justify-between gap-2 pb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                              {/* Asset Tag */}
                              <span className="text-xs sm:text-[13px] font-bold tracking-tight text-white font-sans">
                                  {currentAsset}
                              </span>

                              {/* Timeframe Micro Pill */}
                              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-800/90 text-zinc-300 border border-white/5 font-mono font-medium">
                                  {currentTimeframe}
                              </span>

                              {/* Subtle Live Tick Pulse Badge */}
                              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border transition-colors duration-200 ${
                                  isUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                                  isDown ? 'bg-rose-500/10 text-rose-400 border-rose-500/25' :
                                  'bg-zinc-800/60 text-zinc-400 border-zinc-700/40'
                              }`}>
                                  <span className="relative flex h-1.5 w-1.5">
                                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                          isUp ? 'bg-emerald-400' : isDown ? 'bg-rose-400' : 'bg-zinc-500'
                                      }`} />
                                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                                          isUp ? 'bg-emerald-500' : isDown ? 'bg-rose-500' : 'bg-zinc-400'
                                      }`} />
                                  </span>
                                  <span>{isUp ? 'TICK ▲' : isDown ? 'TICK ▼' : 'LIVE'}</span>
                              </div>
                          </div>

                          {/* 24H Change Pill */}
                          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[10px]">
                              <span className={`px-2 py-0.5 rounded-md border font-semibold tabular-nums ${
                                  isChangePos 
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                      : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}>
                                  {isChangePos ? '+' : ''}{changePct.toFixed(2)}%
                              </span>
                          </div>
                      </div>

                      {/* Middle: Prominent Running Price */}
                      <div className="flex items-baseline justify-between my-1">
                          <div className="flex items-baseline font-mono tracking-tight tabular-nums">
                              <span className="text-xl sm:text-2xl font-bold text-white">
                                  {priceParts.base}
                              </span>
                              <span className={`text-xl sm:text-2xl font-bold transition-colors duration-150 ${tickColor}`}>
                                  {priceParts.pips}
                              </span>
                              {priceParts.pipette && (
                                  <span className={`text-xs font-semibold ml-0.5 transition-colors duration-150 opacity-80 ${tickColor}`}>
                                      {priceParts.pipette}
                                  </span>
                              )}
                          </div>

                          {/* REAL-TIME TRADING SESSION INDICATOR (Replaces deprecated 24H Chg) */}
                          {(() => {
                              const sessionDate = new Date(clockTime);
                              const timePartsWIB = new Intl.DateTimeFormat('id-ID', {
                                  timeZone: 'Asia/Jakarta',
                                  hour: 'numeric',
                                  minute: 'numeric',
                                  second: 'numeric',
                                  hour12: false
                              }).formatToParts(sessionDate);
                              const sHour = parseInt(timePartsWIB.find(p => p.type === 'hour')?.value || '0', 10);
                              const sMinute = parseInt(timePartsWIB.find(p => p.type === 'minute')?.value || '0', 10);
                              const sTotalMin = sHour * 60 + sMinute;

                              // 4 Sesi Trading Global (Sesuai Patokan Jam Global Pengguna):
                              // 1. 05:00 – 07:00 Asia
                              // 2. 07:00 – 16:00 Tokyo (otw london jam 15:00)
                              // 3. 14:00 – 23:00 London (otw New York jam 21:00)
                              // 4. 20:00 – 05:00 New York
                              const isAsia = sTotalMin >= 5 * 60 && sTotalMin < 7 * 60;
                              const isTokyo = sTotalMin >= 7 * 60 && sTotalMin < 16 * 60;
                              const isLondon = sTotalMin >= 14 * 60 && sTotalMin < 23 * 60;
                              const isNewYork = sTotalMin >= 20 * 60 || sTotalMin < 5 * 60;

                              const sess = (() => {
                                  if (isLondon && isNewYork) {
                                      return {
                                          name: 'London × New York',
                                          code: 'LDN · NYC',
                                          badge: 'OVERLAP',
                                          hours: '20:00 — 23:00',
                                          dot: 'bg-amber-400',
                                          ping: 'bg-amber-400/60',
                                          border: 'border-amber-500/35 hover:border-amber-400/60',
                                          bg: 'bg-gradient-to-r from-amber-500/[0.12] via-zinc-900/90 to-zinc-950',
                                          text: 'text-amber-200',
                                          tag: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                                          glow: 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.25)]',
                                          timeText: 'text-amber-300/90'
                                      };
                                  }
                                  if (isTokyo && isLondon) {
                                      return {
                                          name: 'Tokyo × London',
                                          code: 'TYO · LDN',
                                          badge: 'CROSSOVER',
                                          hours: '14:00 — 16:00',
                                          dot: 'bg-cyan-400',
                                          ping: 'bg-cyan-400/60',
                                          border: 'border-cyan-500/35 hover:border-cyan-400/60',
                                          bg: 'bg-gradient-to-r from-cyan-500/[0.12] via-zinc-900/90 to-zinc-950',
                                          text: 'text-cyan-200',
                                          tag: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
                                          glow: 'shadow-[0_0_20px_-4px_rgba(6,182,212,0.25)]',
                                          timeText: 'text-cyan-300/90'
                                      };
                                  }
                                  if (isNewYork) {
                                      return {
                                          name: 'Sesi New York',
                                          code: 'NYC',
                                          badge: 'ACTIVE',
                                          hours: '20:00 — 05:00',
                                          dot: 'bg-sky-400',
                                          ping: 'bg-sky-400/60',
                                          border: 'border-sky-500/30 hover:border-sky-400/60',
                                          bg: 'bg-gradient-to-r from-sky-500/[0.10] via-zinc-900/90 to-zinc-950',
                                          text: 'text-sky-200',
                                          tag: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
                                          glow: 'shadow-[0_0_20px_-4px_rgba(14,165,233,0.20)]',
                                          timeText: 'text-sky-300/90'
                                      };
                                  }
                                  if (isLondon) {
                                      return {
                                          name: 'Sesi London',
                                          code: 'LDN',
                                          badge: 'ACTIVE',
                                          hours: '14:00 — 23:00',
                                          dot: 'bg-violet-400',
                                          ping: 'bg-violet-400/60',
                                          border: 'border-violet-500/30 hover:border-violet-400/60',
                                          bg: 'bg-gradient-to-r from-violet-500/[0.10] via-zinc-900/90 to-zinc-950',
                                          text: 'text-violet-200',
                                          tag: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
                                          glow: 'shadow-[0_0_20px_-4px_rgba(139,92,246,0.20)]',
                                          timeText: 'text-violet-300/90'
                                      };
                                  }
                                  if (isTokyo) {
                                      return {
                                          name: 'Sesi Tokyo',
                                          code: 'TYO',
                                          badge: 'ACTIVE',
                                          hours: '07:00 — 16:00',
                                          dot: 'bg-rose-400',
                                          ping: 'bg-rose-400/60',
                                          border: 'border-rose-500/30 hover:border-rose-400/60',
                                          bg: 'bg-gradient-to-r from-rose-500/[0.10] via-zinc-900/90 to-zinc-950',
                                          text: 'text-rose-200',
                                          tag: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                                          glow: 'shadow-[0_0_20px_-4px_rgba(244,63,94,0.20)]',
                                          timeText: 'text-rose-300/90'
                                      };
                                  }
                                  return {
                                      name: 'Sesi Asia',
                                      code: 'ASIA',
                                      badge: 'ACTIVE',
                                      hours: '05:00 — 07:00',
                                      dot: 'bg-emerald-400',
                                      ping: 'bg-emerald-400/60',
                                      border: 'border-emerald-500/30 hover:border-emerald-400/60',
                                      bg: 'bg-gradient-to-r from-emerald-500/[0.10] via-zinc-900/90 to-zinc-950',
                                      text: 'text-emerald-200',
                                      tag: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                                      glow: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.20)]',
                                      timeText: 'text-emerald-300/90'
                                  };
                              })();

                              return (
                                  <button
                                      onClick={() => setShowSessionSchedule(true)}
                                      className={`group/session relative flex items-center gap-2.5 px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all duration-200 select-none cursor-pointer ${sess.border} ${sess.bg} ${sess.glow}`}
                                      title="Klik untuk melihat detail 4 Sesi Trading Global (Real-Time)"
                                  >
                                      {/* Precision Micro Beacon Indicator */}
                                      <span className="relative flex h-2 w-2 shrink-0">
                                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-70 ${sess.ping}`} />
                                          <span className={`relative inline-flex rounded-full h-2 w-2 ${sess.dot}`} />
                                      </span>

                                      {/* Desk Title & Schedule */}
                                      <div className="flex flex-col items-end text-right leading-none">
                                          <div className="flex items-center gap-1.5">
                                              <span className={`text-[11px] font-sans font-bold tracking-tight ${sess.text} group-hover/session:text-white transition-colors`}>
                                                  {sess.name}
                                              </span>
                                              <span className={`text-[8.5px] font-mono font-bold px-1.5 py-[2px] rounded border leading-none ${sess.tag}`}>
                                                  {sess.code}
                                              </span>
                                          </div>
                                          <div className="flex items-center gap-1 text-[9.5px] font-mono tabular-nums text-zinc-400 group-hover/session:text-zinc-200 transition-colors mt-1">
                                              <span className={`font-semibold ${sess.timeText}`}>{sess.hours}</span>
                                              <span className="text-[7.5px] font-bold text-zinc-500 uppercase">WIB</span>
                                              <svg className="w-2.5 h-2.5 text-zinc-500 group-hover/session:text-zinc-200 group-hover/session:translate-x-0.5 transition-all ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                              </svg>
                                          </div>
                                      </div>
                                  </button>
                              );
                          })()}
                      </div>

                      {/* CANDLE OHLC (Open, High, Low, Close) - Replaces deprecated Bid, Ask, Spread */}
                      {(() => {
                          const candleOpen = activeCandle?.open ?? livePrice?.open ?? currentP;
                          const candleHigh = activeCandle?.high ?? livePrice?.high ?? currentP;
                          const candleLow = activeCandle?.low ?? livePrice?.low ?? currentP;
                          const candleClose = activeCandle?.close ?? livePrice?.price ?? currentP;
                          const isCandleBullish = candleClose >= candleOpen;

                          return (
                              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-1 sm:gap-2">
                                  {/* Micro Label: CANDLE */}
                                  <div className="flex items-center gap-1.5 shrink-0 pr-1.5 border-r border-white/10">
                                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_#a855f7] animate-pulse" />
                                      <span className="text-[9px] font-black tracking-widest text-purple-200 uppercase font-mono">
                                          CANDLE
                                      </span>
                                  </div>

                                  {/* O (Open) */}
                                  <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase px-1 py-0.5 rounded bg-white/[0.05] border border-white/5 shrink-0">
                                          O
                                      </span>
                                      <span className="font-mono font-medium text-zinc-200 text-[10px] sm:text-[11px] tabular-nums truncate">
                                          {formatPrice(candleOpen, currentAsset)}
                                      </span>
                                  </div>

                                  {/* H (High) */}
                                  <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase px-1 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                                          H
                                      </span>
                                      <span className="font-mono font-semibold text-emerald-400 text-[10px] sm:text-[11px] tabular-nums truncate">
                                          {formatPrice(candleHigh, currentAsset)}
                                      </span>
                                  </div>

                                  {/* L (Low) */}
                                  <div className="flex items-center gap-1 min-w-0">
                                      <span className="text-[8px] font-mono font-bold text-rose-400 uppercase px-1 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 shrink-0">
                                          L
                                      </span>
                                      <span className="font-mono font-semibold text-rose-400 text-[10px] sm:text-[11px] tabular-nums truncate">
                                          {formatPrice(candleLow, currentAsset)}
                                      </span>
                                  </div>

                                  {/* C (Close) */}
                                  <div className="flex items-center gap-1 min-w-0">
                                      <span className={`text-[8px] font-mono font-bold uppercase px-1 py-0.5 rounded border shrink-0 ${
                                          isCandleBullish 
                                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                                              : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                                      }`}>
                                          C
                                      </span>
                                      <span className={`font-mono font-bold text-[10px] sm:text-[11px] tabular-nums truncate ${
                                          isCandleBullish ? 'text-emerald-400' : 'text-rose-400'
                                      }`}>
                                          {formatPrice(candleClose, currentAsset)}
                                      </span>
                                  </div>
                              </div>
                          );
                      })()}
                  </div>
              );
          })()}

          <div className={`relative w-full border-y border-zinc-900 bg-[#020202] touch-none transition-all duration-500 ease-in-out ${showAnalysisLog && analysis ? 'h-[280px]' : 'h-[460px]'}`}>{children}</div>
          <div className="px-4 pt-2 pb-10">{renderAnalysisCard()}</div>
      </div>
      
      {/* FOOTER BAR */}
      <div className="absolute bottom-0 inset-x-0 z-50 pt-4 pb-6 px-5 pointer-events-none">
          <div className="relative w-full pointer-events-auto"> 
              <div className="flex justify-between items-center mb-3 px-1 py-1 border-y border-dashed border-zinc-700/50 rounded-lg bg-transparent">
                  {(() => {
                      const msLeft = userSession.membershipExpiresAt ? userSession.membershipExpiresAt - getTrueTime() : 0;
                      const tier = userSession.membershipTier || 'NONE';
                      const isMember = tier !== 'NONE' && msLeft > 0;
                      
                      const badgeImg = MEMBERSHIP_IMAGES[tier as keyof typeof MEMBERSHIP_IMAGES] || "";
                      return isMember ? (
                          <div className="px-2 py-1 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-lg flex items-center gap-2 shadow-[0_0_15px_-5px_#a855f7] backdrop-blur-sm flex-shrink-0 animate-in fade-in">
                              <img src={badgeImg} alt="M" className="w-[28px] h-[17px] rounded-sm shadow-[0_0_8px_rgba(255,255,255,0.8)] border border-white/80 object-contain bg-white/10" />
                              <span className="text-[7px] font-black text-[#FFD700] drop-shadow-[0_0_3px_rgba(255,215,0,0.6)] tracking-wider">{tier === 'TRIAL' ? 'Free Trial (' : (userSession.role === 'USER' ? 'Waktu tersisa ' : '')}<span className="text-yellow-400 font-mono tracking-widest">{timeLeftDisplay}</span>{tier === 'TRIAL' ? ')' : ''}</span>
                          </div>
                      ) : (
                          <div onClick={() => { setShowStore(true); setStoreView('SELECTION'); }} className="px-2 py-1 bg-[#1a0b2e]/20 border border-purple-500/30 rounded-lg flex items-center gap-1.5 shadow-[0_0_8px_rgba(168,85,247,0.3)] backdrop-blur-sm flex-shrink-0 cursor-pointer hover:bg-purple-900/20 transition-all">
                              <img src="https://i.ibb.co.com/LXQTP3Pj/image-1.jpg" alt="M" className="w-[18px] h-[11px] rounded-sm object-contain bg-white/10" referrerPolicy="no-referrer" />
                              <span className="text-[7px] font-black text-purple-100 tracking-wider">Berlangganan Sekarang</span>
                          </div>
                      );
                  })()}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-500 shadow-[0_0_5px_#ef4444]'} animate-pulse`}></div>
                      <span className={`text-[7px] font-black tracking-wider ${isOnline ? 'text-green-500' : 'text-red-500'}`}>{isOnline ? 'DATA : Bloomberg Terminal' : 'OFFLINE MODE'}</span>
                  </div>
              </div>
              <button onClick={handleAnalyzeClick} disabled={isAnalyzing} className="w-full h-11 bg-black/40 border border-purple-500/30 rounded-2xl relative overflow-hidden group hover:bg-black/60 transition-all shadow-[0_4px_20px_-5px_rgba(88,28,135,0.2)] active:scale-[0.98]"><div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div><div className="flex items-center justify-center gap-3 h-full relative z-10">{isAnalyzing ? <><div className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div><span className="text-[10px] font-black text-purple-300 tracking-[0.2em] animate-pulse">Menganalisa Structure Market</span></> : <span className="text-[11px] font-black tracking-[0.2em] text-purple-600 drop-shadow-[0_0_8px_rgba(233,213,255,0.8)]">Menganalisa Chart</span>}</div></button>
          </div>
      </div>
      
      {/* MODALS AND DASHBOARD */}
      {showAssetSelector && (
          <div className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="w-full max-w-sm bg-[#090a0f] border border-white/[0.08] rounded-[32px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl ring-1 ring-white/5">
                  {/* Header */}
                  <div className="pt-6 pb-3 px-5 bg-gradient-to-b from-purple-950/20 via-transparent to-transparent flex flex-col items-center relative z-10 border-b border-white/[0.06]">
                      <h2 className="text-[17px] font-black tracking-[0.2em] text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)] uppercase font-sans">
                          MARKET SELECTION
                      </h2>
                      <p className="text-[10px] text-zinc-400 mt-0.5 tracking-wide font-mono">
                          Pilih Market untuk Analisa Institusional
                      </p>
                      <div className="w-14 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent rounded-full mt-2 shadow-[0_0_8px_#a855f7]"></div>
                      <button 
                          onClick={() => {
                              setShowAssetSelector(false);
                              setMarketFilterTab('ALL');
                          }} 
                          className="absolute top-5 right-5 w-7 h-7 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.12] transition-colors text-xs font-bold"
                      >
                          ✕
                      </button>

                      {/* Quick Filter Tabs: SEMUA | COMODITY | CRYPTO | FOREX */}
                      <div className="grid grid-cols-4 gap-1 w-full mt-3.5 bg-black/60 p-1 rounded-xl border border-white/[0.08]">
                          {[
                              { id: 'ALL', label: 'SEMUA' },
                              { id: 'COMMODITY', label: 'COMODITY' },
                              { id: 'CRYPTO', label: 'CRYPTO' },
                              { id: 'FOREX', label: 'FOREX' },
                          ].map((tab) => {
                              const isSelected = marketFilterTab === tab.id;
                              return (
                                  <button
                                      key={tab.id}
                                      onClick={() => setMarketFilterTab(tab.id as any)}
                                      className={`py-1.5 text-[8.5px] font-mono tracking-wider uppercase text-center rounded-lg transition-all ${
                                          isSelected
                                              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_14px_rgba(147,51,234,0.45)] font-black'
                                              : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] font-medium'
                                      }`}
                                  >
                                      {tab.label}
                                  </button>
                              );
                          })}
                      </div>
                  </div>

                   {/* Market Groups (Urutan: 1. Comodity, 2. Crypto, 3. Forex) */}
                   <div className="flex-1 overflow-y-auto px-5 py-4 custom-scrollbar space-y-6">
                       {ASSET_GROUPS
                           .filter((group) => marketFilterTab === 'ALL' || group.id === marketFilterTab)
                           .map((group) => {
                               const isCrypto = group.id === 'CRYPTO';
                               const isCommodity = group.id === 'COMMODITY';

                               return (
                                   <div key={group.id} className="space-y-2.5">
                                       {/* Section Header */}
                                       <div className="flex items-center justify-between px-1">
                                           <div className="flex items-center gap-2">
                                               <span className="text-sm select-none">{group.icon}</span>
                                               <div className="text-[10.5px] font-black text-white/90 tracking-[0.16em] uppercase font-sans">
                                                   {group.title}
                                               </div>
                                           </div>
                                           <div className="flex items-center gap-1.5">
                                               {/* Schedule Pill in Header */}
                                               <span className={`text-[8px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                                   isCrypto
                                                       ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                                                       : isCommodity
                                                       ? 'bg-amber-950/60 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                                       : 'bg-purple-950/60 text-purple-300 border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                                               }`}>
                                                   <span className={`w-1 h-1 rounded-full ${
                                                       isCrypto ? 'bg-cyan-400 animate-ping' : isCommodity ? 'bg-amber-400' : 'bg-purple-400'
                                                   }`} />
                                                   {group.schedule}
                                               </span>
                                               <span className="text-[8px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
                                                   {group.assets.length} ASET
                                               </span>
                                           </div>
                                       </div>

                                       {/* Asset Cards Grid */}
                                       <div className="grid grid-cols-2 gap-2">
                                           {group.assets.map((asset) => {
                                               const isActive = currentAsset === asset;
                                               const details = ASSET_DETAILS[asset];
                                               
                                               return (
                                                   <button 
                                                       key={asset} 
                                                       onClick={() => { 
                                                           onAssetChange(asset); 
                                                           setShowAssetSelector(false); 
                                                           setMarketFilterTab('ALL');
                                                       }} 
                                                       className={`relative flex flex-col justify-between p-3.5 rounded-2xl border text-left transition-all duration-200 group overflow-hidden select-none ${
                                                           isActive 
                                                               ? 'bg-emerald-950/20 border-emerald-500/60 shadow-[0_0_24px_-4px_rgba(16,185,129,0.35)] ring-1 ring-emerald-500/30' 
                                                               : 'bg-[#0d0e14]/90 border-white/[0.07] hover:border-purple-500/40 hover:bg-[#141520] hover:shadow-[0_4px_20px_rgba(168,85,247,0.1)]'
                                                       }`}
                                                   >
                                                       {/* Top Row: Symbol & Status */}
                                                       <div className="flex items-center justify-between w-full">
                                                           <span className={`text-[13px] font-black tracking-tight font-sans transition-colors ${
                                                               isActive ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'text-white group-hover:text-purple-200'
                                                           }`}>
                                                               {asset}
                                                           </span>

                                                           {isActive ? (
                                                               <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40">
                                                                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]" />
                                                                   <span className="text-[7.5px] font-mono font-black text-emerald-300 tracking-wider">AKTIF</span>
                                                               </div>
                                                           ) : (
                                                               <span className="text-[10px] text-zinc-600 group-hover:text-purple-400/80 transition-colors">↗</span>
                                                           )}
                                                       </div>

                                                       {/* Middle: Name of Asset */}
                                                       <span className={`text-[10px] font-medium truncate max-w-full mt-0.5 ${
                                                           isActive ? 'text-emerald-300/80' : 'text-zinc-400 group-hover:text-zinc-300'
                                                       }`}>
                                                           {details?.name || asset}
                                                       </span>

                                                       {/* Bottom: Modern Aesthetic 24/5 or 24/7 Schedule Badge */}
                                                       <div className="mt-2.5">
                                                           <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg font-mono text-[8px] font-bold tracking-wider uppercase transition-all ${
                                                               isActive 
                                                                   ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                                                   : isCrypto
                                                                   ? 'bg-cyan-950/40 text-cyan-300 border border-cyan-500/20 group-hover:bg-cyan-900/40 group-hover:border-cyan-400/40'
                                                                   : isCommodity
                                                                   ? 'bg-amber-950/40 text-amber-300 border border-amber-500/20 group-hover:bg-amber-900/40 group-hover:border-amber-400/40'
                                                                   : 'bg-purple-950/40 text-purple-300 border border-purple-500/20 group-hover:bg-purple-900/40 group-hover:border-purple-400/40'
                                                           }`}>
                                                               <span className={`w-1 h-1 rounded-full ${
                                                                   isActive 
                                                                       ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' 
                                                                       : isCrypto 
                                                                       ? 'bg-cyan-400 animate-pulse' 
                                                                       : isCommodity 
                                                                       ? 'bg-amber-400' 
                                                                       : 'bg-purple-400'
                                                               }`} />
                                                               <span>{group.schedule}</span>
                                                           </span>
                                                       </div>
                                                   </button>
                                               );
                                           })}
                                       </div>
                                   </div>
                               );
                           })}
                   </div>
              </div>
          </div>
      )}
      
      {showHistoryModal && (
          <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-md flex flex-col animate-in slide-in-from-bottom-10 duration-300">
              <div className="flex items-center justify-between p-5 border-b border-white/5 bg-black/60 backdrop-blur-xl"><div className="flex items-center gap-2"><span className="text-xs font-black tracking-[0.2em] text-white uppercase">TRADING LOGS</span></div><button onClick={() => setShowHistoryModal(false)} className="w-8 h-8 rounded-full bg-[#111] flex items-center justify-center text-zinc-500 hover:text-white transition-colors">✕</button></div>
              {(() => {
                  const now = getTrueTime();
                  const filteredHistory = executionHistory.filter(item => (now - item.timestamp) <= historyFilter.ms);
                  const wins = filteredHistory.filter(h => h.status === 'WIN').length;
                  const loss = filteredHistory.filter(h => h.status === 'LOSS').length;
                  const total = wins + loss;
                  const winrate = total > 0 ? Math.round((wins / total) * 100) : 0;
                  return (<><div className="p-3 grid grid-cols-2 gap-2 bg-transparent"><div className="py-1.5 px-3 bg-green-900/10 border border-green-500/20 rounded-xl flex flex-col items-center"><span className="text-[8px] text-green-500 font-bold tracking-wider uppercase">WINRATE</span><span className="text-lg font-black text-white">{winrate}%</span></div><div className="py-1.5 px-3 bg-purple-900/10 border border-purple-500/20 rounded-xl flex flex-col items-center"><span className="text-[8px] text-purple-500 font-bold tracking-wider uppercase">ENTRY</span><span className="text-lg font-black text-white">{total}</span></div></div><div className="px-4 pb-2 border-b border-white/5 overflow-x-auto no-scrollbar flex gap-2">{HISTORY_FILTERS.map((f) => (<button key={f.label} onClick={() => setHistoryFilter(f)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap flex-shrink-0 ${historyFilter.label === f.label ? 'bg-purple-900/40 text-purple-400 border border-purple-500/50 shadow-[0_0_10px_-4px_#a855f7]' : 'bg-black/40 backdrop-blur-sm text-zinc-500 border border-zinc-800 hover:text-zinc-300'}`}>{f.label}</button>))}</div><div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">{filteredHistory.length === 0 ? (<div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2"><svg className="w-10 h-10 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><span className="text-xs font-mono">NO DATA IN {historyFilter.label}</span></div>) : (filteredHistory.slice().reverse().map((item) => (<div key={item.id} className={`p-3 ${item.status === 'WIN' ? 'bg-green-950/30' : 'bg-red-950/30'} border ${item.status === 'WIN' ? 'border-green-500/50 shadow-[0_0_10px_-5px_#22c55e]' : 'border-red-500/50 shadow-[0_0_10px_-5px_#ef4444]'} rounded-xl flex items-center justify-between backdrop-blur-sm`}><div><div className="flex items-center gap-2"><span className="text-xs font-bold text-white">{item.asset}</span><span className={`text-[9px] px-1.5 rounded ${item.signal === 'BUY' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{item.signal}</span></div><div className="text-[9px] text-zinc-400 mt-1 font-mono">{new Date(item.timestamp).toLocaleString()}</div></div><div className={`text-right ${item.status === 'WIN' ? 'text-green-500' : 'text-red-500'}`}><div className="text-sm font-black tracking-wider">{item.status}</div><div className="text-[8px] text-zinc-500 font-mono">RR {item.rr}</div></div></div>)))}</div></>);
              })()}
          </div>
      )}

      {showHamburgerMenu && (
        <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col p-6 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
                <h2 className="text-xl font-black text-white tracking-widest uppercase">{userSession.role === 'DEV' ? 'KONTROL USER' : 'MEMBERSHIP'}</h2>
                <button onClick={() => { setShowHamburgerMenu(false); setShowDashboard(true); }} className="w-10 h-10 rounded-xl bg-[#111] border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all">✕</button>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pb-10">
                {userSession.role === 'DEV' ? (
                    <div className="space-y-4">
                        {/* Admin Header & Search Control */}
                        <div className="p-4 bg-[#111] border border-red-500/30 rounded-2xl flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    <span className="text-[10px] font-black text-red-500 tracking-widest uppercase">Admin Override Active</span>
                                </div>
                                <span className="text-[9px] font-mono text-zinc-400">Total: {devUsers.length} User</span>
                            </div>

                            {/* SEARCH BAR UNTUK NAMA USERNAME */}
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input 
                                    type="text"
                                    value={devSearchQuery}
                                    onChange={(e) => setDevSearchQuery(e.target.value)}
                                    placeholder="Cari nama username (Approval / Membership)..."
                                    className="w-full pl-9 pr-8 py-2.5 bg-black/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:border-red-500/50 focus:outline-none transition-all font-mono"
                                />
                                {devSearchQuery && (
                                    <button 
                                        onClick={() => setDevSearchQuery("")}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                        title="Hapus pencarian"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* TABS: SEMUA, APPROVAL, MEMBERSHIP, REJECTED */}
                            {(() => {
                                const cleanQ = devSearchQuery.trim().toLowerCase();
                                const filterByQuery = (u: any) => {
                                    if (!cleanQ) return true;
                                    const uname = (u.username || '').toLowerCase();
                                    const uid = (u.id || '').toLowerCase();
                                    const uemail = (u.email || '').toLowerCase();
                                    return uname.includes(cleanQ) || uid.includes(cleanQ) || uemail.includes(cleanQ);
                                };

                                const now = getTrueTime();
                                const isUserOnlineFn = (u: any) => (userSession && (u.username === userSession.username || (userSession.uid && u.id === userSession.uid))) || 
                                    (Boolean(u.lastLogin) && (now - u.lastLogin < 15 * 60 * 1000));

                                const totalPending = devUsers.filter(u => u.role === 'PENDING').filter(filterByQuery).length;
                                const membershipUsers = devUsers.filter(u => u.role !== 'PENDING' && u.role !== 'REJECTED' && u.role !== 'DEV').filter(filterByQuery);
                                const totalMembership = membershipUsers.length;
                                const totalOnlineMembership = membershipUsers.filter(isUserOnlineFn).length;
                                const totalRejected = devUsers.filter(u => u.role === 'REJECTED').filter(filterByQuery).length;
                                const totalAll = devUsers.filter(u => u.role !== 'DEV').filter(filterByQuery).length;

                                return (
                                    <div className="flex bg-black rounded-lg p-1 gap-1">
                                        <button 
                                            onClick={() => setDevActiveTab('ALL')} 
                                            className={`flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${devActiveTab === 'ALL' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            <span>SEMUA</span>
                                            <span className="text-[8px] font-mono px-1 rounded bg-white/10 text-zinc-300">{totalAll}</span>
                                        </button>
                                        <button 
                                            onClick={() => setDevActiveTab('APPROVAL')} 
                                            className={`flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${devActiveTab === 'APPROVAL' ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            <span>APPROVAL</span>
                                            <span className="text-[8px] font-mono px-1 rounded bg-amber-500/20 text-amber-300">{totalPending}</span>
                                        </button>
                                        <button 
                                            onClick={() => setDevActiveTab('MEMBERSHIP')} 
                                            className={`flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${devActiveTab === 'MEMBERSHIP' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            <span>MEMBERSHIP</span>
                                            <span className="text-[8px] font-mono px-1 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                <span>{totalOnlineMembership > 0 ? `${totalOnlineMembership} On` : totalMembership}</span>
                                            </span>
                                        </button>
                                        <button 
                                            onClick={() => setDevActiveTab('REJECTED')} 
                                            className={`flex-1 py-1.5 text-[9px] font-bold rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${devActiveTab === 'REJECTED' ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            <span>REJECTED</span>
                                            <span className="text-[8px] font-mono px-1 rounded bg-rose-500/20 text-rose-300">{totalRejected}</span>
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>

                        {/* LIST USERS DENGAN STATUS DETAIL DAN AKSI */}
                        {isFetchingDevUsers ? (
                            <div className="text-center text-zinc-500 text-[10px] py-10 flex flex-col items-center gap-2">
                                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                                <span>Memuat data user...</span>
                            </div>
                        ) : (() => {
                            const cleanQ = devSearchQuery.trim().toLowerCase();
                            const filterByQuery = (u: any) => {
                                if (!cleanQ) return true;
                                const uname = (u.username || '').toLowerCase();
                                const uid = (u.id || '').toLowerCase();
                                const uemail = (u.email || '').toLowerCase();
                                return uname.includes(cleanQ) || uid.includes(cleanQ) || uemail.includes(cleanQ);
                            };

                            let displayUsers = [];
                            if (devActiveTab === 'APPROVAL') {
                                displayUsers = devUsers.filter(u => u.role === 'PENDING').filter(filterByQuery);
                            } else if (devActiveTab === 'MEMBERSHIP') {
                                displayUsers = devUsers.filter(u => u.role !== 'PENDING' && u.role !== 'REJECTED' && u.role !== 'DEV').filter(filterByQuery);
                            } else if (devActiveTab === 'REJECTED') {
                                displayUsers = devUsers.filter(u => u.role === 'REJECTED').filter(filterByQuery);
                            } else {
                                // 'ALL' tab
                                displayUsers = devUsers.filter(u => u.role !== 'DEV').filter(filterByQuery);
                            }

                            // If search returned empty in the current active tab, but exists in other tabs, show hint!
                            if (displayUsers.length === 0) {
                                if (cleanQ) {
                                    const allMatches = devUsers.filter(u => u.role !== 'DEV').filter(filterByQuery);
                                    const inPending = allMatches.filter(u => u.role === 'PENDING').length;
                                    const inMembership = allMatches.filter(u => u.role !== 'PENDING' && u.role !== 'REJECTED' && u.role !== 'DEV').length;
                                    const inRejected = allMatches.filter(u => u.role === 'REJECTED').length;

                                    if (allMatches.length > 0) {
                                        return (
                                            <div className="p-4 bg-[#111] border border-amber-500/30 rounded-2xl text-center space-y-3">
                                                <div className="text-xs text-zinc-300 font-mono">
                                                    User <strong className="text-white">"{devSearchQuery}"</strong> tidak ada di tab <strong className="text-amber-400">{devActiveTab}</strong>, tetapi ditemukan di tab lain:
                                                </div>
                                                <div className="flex flex-wrap justify-center gap-2">
                                                    {inPending > 0 && (
                                                        <button 
                                                            onClick={() => setDevActiveTab('APPROVAL')}
                                                            className="px-3 py-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[10px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
                                                        >
                                                            ⏳ Buka Tab APPROVAL ({inPending} user)
                                                        </button>
                                                    )}
                                                    {inMembership > 0 && (
                                                        <button 
                                                            onClick={() => setDevActiveTab('MEMBERSHIP')}
                                                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold hover:bg-emerald-500/30 transition-all cursor-pointer"
                                                        >
                                                            ✓ Buka Tab MEMBERSHIP ({inMembership} user)
                                                        </button>
                                                    )}
                                                    {inRejected > 0 && (
                                                        <button 
                                                            onClick={() => setDevActiveTab('REJECTED')}
                                                            className="px-3 py-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-[10px] font-bold hover:bg-rose-500/30 transition-all cursor-pointer"
                                                        >
                                                            ✕ Buka Tab REJECTED ({inRejected} user)
                                                        </button>
                                                    )}
                                                </div>
                                                <div>
                                                    <button 
                                                        onClick={() => setDevActiveTab('ALL')}
                                                        className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer"
                                                    >
                                                        Tampilkan Semua Tab ({allMatches.length} user ditemukan)
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="p-6 text-center bg-[#111] border border-white/5 rounded-2xl space-y-2">
                                            <div className="text-xs text-zinc-400">
                                                Tidak ditemukan user dengan username <strong className="text-white">"{devSearchQuery}"</strong>
                                            </div>
                                            <button 
                                                onClick={() => setDevSearchQuery("")}
                                                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[10px] font-mono cursor-pointer transition-colors"
                                            >
                                                Reset Pencarian
                                            </button>
                                        </div>
                                    );
                                }

                                return <div className="text-center text-zinc-500 text-[10px] py-10">Belum ada data user</div>;
                            }

                            const now = getTrueTime();
                            const isUserOnlineFn = (u: any) => (userSession && (u.username === userSession.username || (userSession.uid && u.id === userSession.uid))) || 
                                (Boolean(u.lastLogin) && (now - u.lastLogin < 15 * 60 * 1000));

                            const onlineMembersCount = displayUsers.filter(isUserOnlineFn).length;
                            const offlineMembersCount = displayUsers.length - onlineMembersCount;

                            return (
                                <>
                                    {/* FITUR TAMBAHAN DI ATAS UNTUK BAGIAN MEMBERSHIP: TOTAL USER ONLINE */}
                                    {devActiveTab === 'MEMBERSHIP' && (
                                        <div className="p-3.5 bg-gradient-to-r from-[#07180e] via-[#091f13] to-[#040e08] border border-emerald-500/35 rounded-2xl flex items-center justify-between shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                                            
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="relative">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.35)]">
                                                        <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                                                    </div>
                                                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-white uppercase tracking-wider">
                                                            Total User Online
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[8px] font-mono font-bold tracking-widest flex items-center gap-1 shadow-sm">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                            LIVE MONITOR
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-2 mt-0.5">
                                                        <span>Total Member: <strong className="text-zinc-200">{displayUsers.length}</strong></span>
                                                        <span className="text-zinc-600">•</span>
                                                        <span>Offline: <strong className="text-zinc-400">{offlineMembersCount}</strong></span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="text-right relative z-10">
                                                <div className="text-2xl font-black font-mono text-emerald-400 flex items-center justify-end gap-1.5 leading-none">
                                                    <span>{onlineMembersCount}</span>
                                                    <span className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">User</span>
                                                </div>
                                                <div className="text-[8px] font-mono text-emerald-400/70 mt-1">
                                                    Sesi Aktif Real-Time
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {displayUsers.map(user => {
                                        const isPending = user.role === 'PENDING';
                                        const isRejected = user.role === 'REJECTED';
                                        const isApproved = !isPending && !isRejected && user.role !== 'DEV';

                                        const isUserOnline = isUserOnlineFn(user);

                                // Hitung Masa Pakai User
                                let masaPakaiText = "Non-Member";
                                let masaPakaiColor = "text-zinc-400";
                                let masaPakaiBg = "bg-zinc-800/80 border-zinc-700/50";

                                if (user.membershipTier === 'LIFETIME' || (user.membershipExpiresAt && user.membershipExpiresAt > now + 365 * 10 * 24 * 60 * 60 * 1000)) {
                                    masaPakaiText = "Lifetime (Aktif Selamanya)";
                                    masaPakaiColor = "text-cyan-400";
                                    masaPakaiBg = "bg-cyan-500/10 border-cyan-500/30";
                                } else if (user.membershipExpiresAt && user.membershipExpiresAt > now) {
                                    const msLeft = user.membershipExpiresAt - now;
                                    const daysLeft = Math.floor(msLeft / (1000 * 60 * 60 * 24));
                                    const hoursLeft = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                    const minsLeft = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
                                    
                                    if (daysLeft > 0) {
                                        masaPakaiText = `${daysLeft} Hari ${hoursLeft} Jam lagi`;
                                    } else if (hoursLeft > 0) {
                                        masaPakaiText = `${hoursLeft} Jam ${minsLeft} Menit lagi`;
                                    } else {
                                        masaPakaiText = `${minsLeft} Menit lagi`;
                                    }
                                    masaPakaiColor = "text-emerald-400";
                                    masaPakaiBg = "bg-emerald-500/10 border-emerald-500/25";
                                } else if (user.membershipExpiresAt && user.membershipExpiresAt <= now) {
                                    masaPakaiText = "Habis (Expired)";
                                    masaPakaiColor = "text-rose-400";
                                    masaPakaiBg = "bg-rose-500/10 border-rose-500/25";
                                }

                                return (
                                    <div key={user.id || user.username} className="p-4 bg-[#0a0a0a] border border-zinc-800 rounded-2xl space-y-3">
                                        {/* USER HEADER & STATUS BADGE */}
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <div 
                                                    className="text-xs font-black text-white cursor-pointer hover:text-purple-400 transition-colors flex items-center gap-1.5"
                                                    onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
                                                >
                                                    <span>{user.username}</span>
                                                    <span className="text-[10px] text-zinc-500">{expandedUserId === user.id ? '▼' : '▶'}</span>
                                                </div>
                                                <div className="text-[9px] font-mono text-zinc-400 mt-0.5">
                                                    ID: {user.id || user.username}
                                                </div>
                                                {user.email && (
                                                    <div className="text-[8.5px] font-mono text-zinc-500">
                                                        Email: {user.email}
                                                    </div>
                                                )}
                                            </div>

                                            {/* BADGE STATUS & MASA PAKAI USER */}
                                            <div className="flex flex-col items-end gap-1.5">
                                                {isPending && (
                                                    <div className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[8.5px] font-mono font-bold tracking-wider flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                                        MENUNGGU APPROVAL
                                                    </div>
                                                )}

                                                {isApproved && (
                                                    <>
                                                        {/* STATUS USER ONLINE / USER OFFLINE */}
                                                        {isUserOnline ? (
                                                            <div className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[8.5px] font-mono font-bold flex items-center gap-1.5 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                                User Online
                                                            </div>
                                                        ) : (
                                                            <div className="px-2.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 text-[8.5px] font-mono font-bold flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
                                                                User Offline
                                                            </div>
                                                        )}

                                                        {/* MASA PAKAI USER DI BAWAHNYA */}
                                                        <div className={`px-2 py-0.5 rounded-md border text-[8px] font-mono font-semibold flex items-center gap-1 ${masaPakaiBg} ${masaPakaiColor}`}>
                                                            <span className="text-[9px]">⏳</span>
                                                            <span>Masa Pakai: <strong className="font-bold">{masaPakaiText}</strong></span>
                                                        </div>

                                                        {/* MEMBERSHIP TIER PILL */}
                                                        <span className={`text-[7.5px] font-mono font-bold px-1.5 py-0.5 rounded ${user.membershipTier !== 'NONE' ? 'bg-purple-900/40 text-purple-300 border border-purple-500/30' : 'bg-zinc-800 text-zinc-400 border border-zinc-700/40'}`}>
                                                            TIER: {user.membershipTier !== 'NONE' ? user.membershipTier : 'STANDARD'}
                                                        </span>
                                                    </>
                                                )}

                                                {isRejected && (
                                                    <div className="px-2.5 py-1 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[8.5px] font-mono font-bold tracking-wider flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                                        DITOLAK / REJECTED
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* DETAIL EXPANDABLE (Password & Tanggal Dibuat) */}
                                        {expandedUserId === user.id && (
                                            <div className="p-3 bg-[#111] border border-zinc-800 rounded-xl space-y-2 text-[10px]">
                                                <div className="flex justify-between">
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Password:</span>
                                                    <span className="font-mono text-zinc-300">{user.password || 'Google Auth (No Password)'}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Dibuat:</span>
                                                    <span className="font-mono text-zinc-300">
                                                        {user.createdAt ? new Date(user.createdAt).toLocaleString('id-ID') : 'Tidak diketahui'}
                                                    </span>
                                                </div>
                                                {user.membershipExpiresAt && (
                                                    <div className="flex justify-between">
                                                        <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Expired:</span>
                                                        <span className="font-mono text-amber-300">
                                                            {new Date(user.membershipExpiresAt).toLocaleString('id-ID')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* AKSI TOMBOL: BERLAKU SESUAI STATUS USER (APPROVAL vs MEMBERSHIP vs REJECTED) */}
                                        {isPending && (
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                                                <button 
                                                    onClick={() => handleAcceptUser(user.id)} 
                                                    className="py-2 bg-green-900/20 border border-green-500/30 text-green-400 text-[8.5px] font-bold rounded-lg hover:bg-green-600 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <span>✓</span>
                                                    <span>Terima / Approve</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleRejectUser(user.id)} 
                                                    className="py-2 bg-red-900/20 border border-red-500/30 text-red-400 text-[8.5px] font-bold rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <span>✕</span>
                                                    <span>Tolak</span>
                                                </button>
                                            </div>
                                        )}

                                        {isApproved && (
                                            <div className="space-y-2 pt-2 border-t border-white/5">
                                                <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">
                                                    Tambahkan Durasi Membership:
                                                </div>
                                                <div className="grid grid-cols-4 gap-1.5">
                                                    <button onClick={() => handleAddMembership(user.id || user.username, 7)} className="py-1.5 bg-blue-900/20 border border-blue-500/30 text-blue-400 text-[8px] font-bold rounded-lg hover:bg-blue-500 hover:text-white transition-all cursor-pointer">+1 Minggu</button>
                                                    <button onClick={() => handleAddMembership(user.id || user.username, 14)} className="py-1.5 bg-purple-900/20 border border-purple-500/30 text-purple-400 text-[8px] font-bold rounded-lg hover:bg-purple-500 hover:text-white transition-all cursor-pointer">+2 Minggu</button>
                                                    <button onClick={() => handleAddMembership(user.id || user.username, 30)} className="py-1.5 bg-amber-900/20 border border-amber-500/30 text-amber-400 text-[8px] font-bold rounded-lg hover:bg-amber-500 hover:text-white transition-all cursor-pointer">+1 Bulan</button>
                                                    <button onClick={() => handleAddMembership(user.id || user.username, 18250)} className="py-1.5 bg-green-900/20 border border-green-500/30 text-green-400 text-[8px] font-bold rounded-lg hover:bg-green-500 hover:text-white transition-all cursor-pointer">+50 Tahun</button>
                                                </div>
                                                <div className="mt-2">
                                                    <button onClick={() => handleRejectUser(user.id)} className="w-full py-1.5 bg-red-900/20 border border-red-500/30 text-red-400 text-[8px] font-bold rounded-lg hover:bg-red-600 hover:text-white transition-all uppercase tracking-widest cursor-pointer">Hapus Akses (Banned)</button>
                                                </div>
                                            </div>
                                        )}

                                        {isRejected && (
                                            <div className="pt-2 border-t border-white/5">
                                                <button 
                                                    onClick={() => handleAcceptUser(user.id)} 
                                                    className="w-full py-2 bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 text-[8.5px] font-bold rounded-lg hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <span>↺</span>
                                                    <span>Pulihkan / Terima User Kembali</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    );
                })()}
                    </div>
                ) : (
                    /* MEMBERSHIP CODE INPUT */
                    <div className="p-6 bg-gradient-to-br from-[#0c0518] to-[#05000a] border border-purple-500/20 rounded-[28px] shadow-[0_4px_30px_-10px_rgba(168,85,247,0.15)] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 blur-[40px] rounded-full group-hover:bg-purple-500/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <div className="text-[9px] font-black text-purple-400/60 tracking-[0.2em] uppercase mb-4 flex items-center gap-2 drop-shadow-sm">
                                <svg className="w-4 h-4 text-purple-500/70" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                                MASUKAN KODE MEMBERSHIP
                            </div>
                            <div className="space-y-4">
                                <div className="relative group/input">
                                    <input 
                                        type="text" 
                                        value={membershipCode}
                                        onChange={(e) => setMembershipCode(e.target.value)}
                                        placeholder="Paste Kode Enkripsi Di Sini..."
                                        className="w-full bg-black/60 backdrop-blur-sm border border-purple-900/40 rounded-[14px] px-5 py-4 text-[10px] text-purple-100 placeholder:text-purple-900/60 focus:border-purple-500/50 focus:bg-purple-900/10 focus:outline-none transition-all font-mono tracking-widest uppercase shadow-inner group-hover/input:border-purple-500/30"
                                    />
                                    {isActivatingCode && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                
                                {codeMessage && (
                                    <div className={`p-3 rounded-[12px] text-[9px] font-bold text-center animate-in fade-in slide-in-from-top-1 duration-300 whitespace-pre-wrap ${codeMessage.type === 'SUCCESS' ? 'bg-green-900/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_-5px_rgba(34,197,94,0.3)]' : 'bg-red-900/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_-5px_rgba(239,68,68,0.3)]'}`}>
                                        {codeMessage.text}
                                    </div>
                                )}

                                <button 
                                    onClick={handleActivateMembershipCode}
                                    disabled={isActivatingCode || !membershipCode.trim()}
                                    className={`w-full py-4 rounded-[14px] font-black text-[10px] tracking-[0.3em] uppercase transition-all ${isActivatingCode || !membershipCode.trim() ? 'bg-black/40 text-purple-900/40 border border-purple-900/20 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-[0_0_20px_-5px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.6)] hover:scale-[1.02] active:scale-[0.98] border border-purple-500/30'}`}
                                >
                                    {isActivatingCode ? 'VALIDATING...' : 'AKTIFKAN SEKARANG'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}

      {showFundamentalData && (
          <FundamentalData 
              onClose={() => setShowFundamentalData(false)} 
              userSession={userSession}
              onRequestAuth={onRequestAuth}
          />
      )}

      {showDashboard && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300">
             <div className="w-full max-w-[340px] bg-[#05010a] border border-purple-500/10 rounded-[28px] overflow-hidden flex flex-col max-h-[90vh]">
                 {/* HEADER */}
                 <div className="px-6 py-5 border-b border-purple-500/10 flex items-center justify-between bg-[#080210] z-20">
                     <div>
                        <span className="text-[9px] font-bold tracking-widest text-purple-300/50 uppercase">
                            User Dashboard
                        </span>
                        <div className="flex items-center mt-0.5">
                            <span className="text-sm font-bold text-white tracking-wide">{userSession.username}</span>
                        </div>
                     </div>
                     <div className="flex items-center gap-2 relative">
                         {/* HEADER LOGOUT BUTTON (Icon) */}
                         <button onClick={() => { onLogout(); setShowDashboard(false); }} className="w-8 h-8 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors" title="Logout">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                         </button>
                         <button onClick={() => setShowDashboard(false)} className="w-8 h-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-300 hover:text-white hover:bg-purple-500/30 transition-colors">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                         </button>
                     </div>
                 </div>

                 {/* DASHBOARD CONTENT */}
                 <div className="flex-1 overflow-y-auto no-scrollbar bg-[#05010a]">
                     
                      {/* --- USER DASHBOARD ONLY (DEV & GUEST REMOVED) --- */}
                      <div className="p-5 space-y-4">
                         <div className="px-5 py-6 bg-[#0a0215] border border-purple-500/20 rounded-[24px] relative overflow-hidden shadow-[0_0_20px_-5px_rgba(168,85,247,0.05)] text-center">
                            <div className="w-14 h-14 mx-auto bg-purple-900/20 border border-purple-500/30 rounded-full flex items-center justify-center text-purple-300 text-xl font-black mb-3">
                                {userSession.username.charAt(0).toUpperCase()}
                            </div>
                            <div className="relative z-10">
                                <div className="text-lg font-black text-white mb-2 tracking-wide">{userSession.username}</div>
                                <div className="flex items-center justify-center gap-2 mb-6">
                                    <span className="px-3 py-1 bg-purple-900/40 border border-purple-500/30 text-purple-300 rounded-lg text-[9px] font-bold tracking-widest">{userSession.role}</span>
                                    
{userSession.membershipTier === 'NONE' || (userSession.membershipExpiresAt && userSession.membershipExpiresAt <= getTrueTime()) ? (
    <span className="px-3 py-1 bg-[#110520] border border-purple-900/40 text-purple-300/50 rounded-lg text-[9px] font-bold tracking-widest">TOKEN HARIAN: {userSession.tokens}/3</span>
) : (
    <span className="px-3 py-1 bg-[#110520] border border-purple-900/40 text-purple-300/50 rounded-lg text-[9px] font-bold tracking-widest">UNLIMITED</span>
)}

                                </div>
                                
                                {/* MEMBERSHIP STATUS */}
                                <div 
                                    onClick={() => { setShowDashboard(false); setShowHamburgerMenu(true); }}
                                    className="p-4 bg-black/40 border border-purple-500/10 rounded-2xl cursor-pointer hover:border-purple-500/30 hover:bg-[#110520] transition-all text-left"
                                 >
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-[8px] font-black text-purple-400/60 tracking-[0.3em] uppercase">MEMBERSHIP STATUS</span>
                                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-md shadow-[0_0_10px_-2px_currentColor] ${userSession.membershipTier !== 'NONE' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {userSession.membershipTier !== 'NONE' ? userSession.membershipTier : 'INACTIVE'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-[14px] bg-purple-900/20 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover/status:text-purple-300 group-hover/status:scale-105 transition-all shadow-[0_0_15px_-3px_rgba(168,85,247,0.3)]">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-black text-purple-100 flex items-center gap-2 mb-0.5">
                                                {(() => {
                                                    const tier = userSession.membershipTier || 'NONE';
                                                    const isExpired = userSession.membershipExpiresAt && userSession.membershipExpiresAt <= getTrueTime();
                                                    const img = (tier !== 'NONE' && !isExpired) 
                                                        ? (MEMBERSHIP_IMAGES[tier as keyof typeof MEMBERSHIP_IMAGES] || "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg")
                                                        : "https://i.ibb.co.com/LXQTP3Pj/image-1.jpg";
                                                    return <img src={img} alt="M" className="w-[18px] h-[12px] rounded object-contain bg-white/10 shadow-[0_0_5px_rgba(255,255,255,0.2)]" referrerPolicy="no-referrer" />;
                                                })()}
                                                {userSession.membershipTier === 'NONE' || (userSession.membershipExpiresAt && userSession.membershipExpiresAt <= getTrueTime()) 
                                                    ? "Berlangganan Sekarang" 
                                                    : (userSession.membershipTier === 'TRIAL' ? `Free Trial (${timeLeftDisplay})` : timeLeftDisplay)}
                                            </div>
                                            <div className="text-[8px] text-purple-400/50 uppercase tracking-[0.2em] font-bold">SISA WAKTU BERLANGGANAN</div>
                                            {userSession.membershipTier !== 'NONE' && (
                                                <div className="text-[7px] text-green-400/80 uppercase tracking-widest mt-1 font-bold">
                                                    Aktif di latar belakang (Akun & Perangkat)
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                             </div>
                         </div>
                        <div className="mt-4 space-y-3">
                            <button onClick={() => { setShowFundamentalData(true); setShowDashboard(false); }} className="w-full p-4 bg-[#0a0215] border border-purple-500/10 rounded-2xl flex items-center justify-between group hover:border-purple-500/30 hover:bg-[#110520] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-900/20 border border-purple-500/10 rounded-[12px] flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[12px] font-bold text-white mb-0.5">Kalender Ekonomi</div>
                                        <div className="text-[10px] font-medium text-purple-300/50">Data Fundamental & Bloomberg</div>
                                    </div>
                                </div>
                                <span className="text-purple-600/50 group-hover:text-purple-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>

                            <button onClick={() => { setShowHistoryModal(true); setShowDashboard(false); }} className="w-full p-4 bg-[#0a0215] border border-purple-500/10 rounded-2xl flex items-center justify-between group hover:border-purple-500/30 hover:bg-[#110520] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-900/20 border border-purple-500/10 rounded-[12px] flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[12px] font-bold text-white mb-0.5">History Trading</div>
                                        <div className="text-[10px] font-medium text-purple-300/50">Analisa & Winrate Record</div>
                                    </div>
                                </div>
                                <span className="text-purple-600/50 group-hover:text-purple-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>

                            {userSession.membershipTier !== 'LIFETIME' && (
                                <button onClick={() => { setShowStore(true); setStoreView('SELECTION'); setShowDashboard(false); }} className="w-full p-4 bg-[#0a0215] border border-purple-500/10 rounded-2xl flex items-center justify-between group hover:border-purple-500/30 hover:bg-[#110520] transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-900/20 border border-purple-500/10 rounded-[12px] flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-[12px] font-bold text-white mb-0.5">Upgrade Membership</div>
                                            <div className="text-[10px] font-medium text-purple-300/50">Unlimited Access & Priority</div>
                                        </div>
                                    </div>
                                    <span className="text-purple-600/50 group-hover:text-purple-400 transition-colors">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                    </span>
                                </button>
                            )}

                            <button onClick={handleContactSupport} className="w-full p-4 bg-[#0a0215] border border-purple-500/10 rounded-2xl flex items-center justify-between group hover:border-purple-500/30 hover:bg-[#110520] transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-purple-900/20 border border-purple-500/10 rounded-[12px] flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-[12px] font-bold text-white mb-0.5">Pusat Bantuan</div>
                                        <div className="text-[10px] font-medium text-purple-300/50">Hubungi Admin Jika Kendala</div>
                                    </div>
                                </div>
                                <span className="text-purple-600/50 group-hover:text-purple-400 transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                </span>
                            </button>
                        </div>
                     </div>
                 </div>
             </div>
        </div>
      )}
      
      {/* STORE */}
      {showStore && (
          <div className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-md flex flex-col animate-in slide-in-from-right duration-300">
             {/* STORE HEADER */}
             <div className="px-5 py-5 bg-[#080210] border-b border-purple-500/10 flex items-center justify-between z-20">
                 <div>
                     <h2 className="text-[12px] font-black text-white tracking-widest uppercase">Vinzx Store</h2>
                     <p className="text-[8px] text-purple-400/50 tracking-wider uppercase mt-0.5">Membership Payment Gateway</p>
                 </div>
                 <button onClick={() => setShowStore(false)} className="w-8 h-8 rounded-full bg-[#110520] border border-purple-500/20 flex items-center justify-center text-purple-400 hover:text-white hover:bg-purple-500/30 transition-all">✕</button>
              </div>
              
              {/* REMOVED TAB SELECTION DIV */}

               <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent relative">
                   <div className="relative z-10 w-full min-h-full flex flex-col">
                     {storeView === 'SELECTION' ? (
                         // ONLY MEMBERSHIP LIST REMAINS
                         <div className="flex flex-col gap-6 px-6 py-4 pb-32">
                            <div className="text-center mb-2"><h2 className="text-lg font-black text-purple-400 tracking-[0.2em] uppercase drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">PAKET BERLANGGANAN</h2><p className="text-[8px] text-zinc-500 tracking-[0.3em] mt-1 uppercase">PILIH AKSES PREMIUM ANDA</p></div>
                            {MEMBERSHIP_PACKAGES.map((pkg) => {
                                let borderColor = 'border-zinc-800';
                                let shadowColor = '';
                                let titleColor = 'text-white';
                                let btnGradient = 'bg-zinc-800 text-zinc-400';
                                let checkColor = 'text-zinc-600';
                                let iconBg = 'bg-zinc-900';
                                let saveBadgeColor = 'bg-zinc-800 text-zinc-400';
                                let cardBg = 'bg-[#0a0a0a]';
                                if (pkg.theme === 'GOLD') { borderColor = 'border-amber-500/80'; shadowColor = 'shadow-[0_0_30px_-10px_rgba(245,158,11,0.5)]'; titleColor = 'text-amber-400'; btnGradient = 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500'; checkColor = 'text-amber-500 border-amber-500'; iconBg = 'bg-amber-900/40 text-amber-300'; saveBadgeColor = 'bg-amber-500/20 text-amber-400 border border-amber-500/30'; cardBg = 'bg-gradient-to-br from-amber-950/20 to-black'; } 
                                else if (pkg.theme === 'PURPLE') { borderColor = 'border-purple-500/50'; shadowColor = 'shadow-[0_0_25px_-10px_rgba(168,85,247,0.3)]'; titleColor = 'text-purple-400'; btnGradient = 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500'; checkColor = 'text-purple-500 border-purple-500'; iconBg = 'bg-purple-900/30 text-purple-300'; saveBadgeColor = 'bg-purple-500/20 text-purple-400 border border-purple-500/30'; cardBg = 'bg-gradient-to-br from-purple-950/20 to-black'; } 
                                else if (pkg.theme === 'BLUE') { borderColor = 'border-cyan-500/50'; shadowColor = 'shadow-[0_0_20px_-10px_rgba(6,182,212,0.3)]'; titleColor = 'text-cyan-400'; btnGradient = 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'; checkColor = 'text-amber-500 border-amber-500'; iconBg = 'bg-cyan-900/30 text-cyan-300'; saveBadgeColor = 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'; cardBg = 'bg-gradient-to-br from-cyan-950/20 to-black'; }
                                return (
                                    <button key={pkg.id} onClick={() => handleMembershipSelect(pkg)} className={`relative w-full ${cardBg} rounded-3xl border-[1.5px] ${borderColor} ${shadowColor} overflow-hidden group transition-all duration-300 transform hover:scale-[1.02] flex flex-col p-6 text-left`}>
                                        {pkg.isBestValue && <div className="absolute top-4 right-4 px-3 py-1 bg-white shadow-[0_0_15px_rgba(255,255,255,0.4)] rounded-full z-10 animate-pulse-slow"><span className="text-[7px] font-black text-black tracking-widest uppercase">BEST VALUE</span></div>}
                                        <div className="flex items-center gap-4 mb-5 relative z-10"><div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center border border-white/5 shadow-inner`}><span className="text-xl font-bold">∞</span></div><div><h3 className={`text-base font-black tracking-widest uppercase ${titleColor} drop-shadow-sm`}>{pkg.tier}</h3><p className="text-[9px] text-zinc-400 font-bold tracking-wide uppercase mt-0.5">{pkg.subtitle}</p></div></div>
                                        <div className="mb-5 relative z-10"><div className="flex items-center gap-2 mb-1"><span className="text-[11px] text-zinc-500 line-through decoration-red-500/80 decoration-2 font-bold">Rp {pkg.originalPrice.toLocaleString('id-ID')}</span><span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${saveBadgeColor}`}>{pkg.saveLabel}</span></div><div className="flex items-baseline gap-1.5"><span className="text-3xl font-black text-white tracking-tighter drop-shadow-md">Rp {pkg.price.toLocaleString('id-ID').replace(',','.')}</span><span className="text-[10px] text-zinc-500 font-bold tracking-wide">{pkg.durationLabel}</span></div></div>
                                        <div className="space-y-3 mb-6 border-t border-white/10 pt-5 w-full relative z-10">{pkg.features.map((feat, idx) => (<div key={idx} className="flex items-start gap-3"><div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center border-[1.5px] ${checkColor} shadow-[0_0_5px_rgba(0,0,0,0.5)] bg-black/40`}><svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg></div><span className="text-[10px] font-bold text-zinc-300 leading-tight">{feat}</span></div>))}</div>
                                        <div className={`w-full py-3.5 rounded-xl ${btnGradient} flex items-center justify-center gap-2 shadow-lg group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all relative z-10 border border-white/10`}><span className="text-[10px] font-black tracking-[0.25em] uppercase">BELI SEKARANG</span><span className="text-[10px] transform group-hover:translate-x-1 transition-transform">→</span></div>
                                    </button>
                                );
                            })}
                            <p className="text-[7px] text-zinc-600 text-center px-4 leading-relaxed mt-4 uppercase font-mono tracking-wide">Secure Payment via QRIS And All payments / Bank Transfer.<br/>Processed manually by Admin via WhatsApp.</p>
                        </div>
                     ) : (
                         // PAYMENT VIEW (Simplified to Membership Only)
                         <div className="flex-1 flex flex-col items-center justify-center px-6 pt-10 pb-20 w-full animate-in fade-in zoom-in-95 duration-300">
                            <div className="w-full max-w-sm flex flex-col items-center">
                                <div className={`relative rounded-[24px] p-[3px] mb-6 w-[210px] h-[210px] flex items-center justify-center shrink-0 group overflow-hidden shadow-[0_0_50px_-10px_${selectedProduct?.data.theme === 'GOLD' ? 'rgba(245,158,11,0.6)' : selectedProduct?.data.theme === 'BLUE' ? 'rgba(6,182,212,0.6)' : 'rgba(168,85,247,0.6)'}]`}>
                                    {/* Animated Gradient Border */}
                                    <div className={`absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,${selectedProduct?.data.theme === 'GOLD' ? 'rgba(245,158,11,1)' : selectedProduct?.data.theme === 'BLUE' ? 'rgba(6,182,212,1)' : 'rgba(168,85,247,1)'}_360deg)] animate-[spin_3s_linear_infinite]`}></div>
                                    <div className={`absolute inset-[-50%] bg-[conic-gradient(from_180deg,transparent_0_340deg,${selectedProduct?.data.theme === 'GOLD' ? 'rgba(252,211,77,1)' : selectedProduct?.data.theme === 'BLUE' ? 'rgba(56,189,248,1)' : 'rgba(34,211,238,1)'}_360deg)] animate-[spin_3s_linear_infinite]`}></div>
                                    
                                    {/* Inner Container */}
                                    <div className="w-full h-full relative bg-white rounded-[21px] overflow-hidden z-10 p-2">
                                        {/* Corner brackets for cool effect */}
                                        <div className="absolute top-1 left-1 w-4 h-4 border-t-2 border-l-2 border-black z-30"></div>
                                        <div className="absolute top-1 right-1 w-4 h-4 border-t-2 border-r-2 border-black z-30"></div>
                                        <div className="absolute bottom-1 left-1 w-4 h-4 border-b-2 border-l-2 border-black z-30"></div>
                                        <div className="absolute bottom-1 right-1 w-4 h-4 border-b-2 border-r-2 border-black z-30"></div>
                                        
                                        <div className="w-full h-full relative rounded-[14px] overflow-hidden">
                                            <img src={selectedProduct?.data.qrisUrl || QRIS_IMAGE_URL} alt="QRIS" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                                            {/* Enhanced Scanline */}
                                            <div className={`absolute left-0 right-0 h-[3px] ${selectedProduct?.data.theme === 'GOLD' ? 'bg-amber-400 shadow-[0_0_15px_#fbbf24,0_0_30px_#fbbf24]' : selectedProduct?.data.theme === 'BLUE' ? 'bg-cyan-400 shadow-[0_0_15px_#22d3ee,0_0_30px_#22d3ee]' : 'bg-purple-400 shadow-[0_0_15px_#c084fc,0_0_30px_#c084fc]'} z-20 opacity-90`} style={{ animation: 'scan-line 2s ease-in-out infinite' }}></div>
                                            {/* Overlay Glow */}
                                            <div className={`absolute inset-0 bg-gradient-to-tr ${selectedProduct?.data.theme === 'GOLD' ? 'from-amber-500/20 to-yellow-500/20' : selectedProduct?.data.theme === 'BLUE' ? 'from-cyan-500/20 to-blue-500/20' : 'from-purple-500/20 to-cyan-500/20'} mix-blend-overlay pointer-events-none`}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-[7px] font-black text-purple-200/60 tracking-[0.3em] uppercase mb-1">TOTAL PEMBAYARAN</div>
                                <div className="flex items-center justify-center gap-3 mb-4">
                                     <span className="text-2xl font-black text-white tracking-tight drop-shadow-lg font-sans">Rp {selectedProduct?.data.price.toLocaleString('id-ID').replace(',','.')}</span>
                                     <button onClick={() => { navigator.clipboard.writeText(selectedProduct?.data.price.toString() || ""); alert("Nominal Disalin!"); }} className="w-8 h-8 bg-white/10 border border-white/10 rounded-lg flex items-center justify-center text-purple-300 hover:bg-purple-600 hover:text-white transition-all active:scale-95 shadow-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                                </div>
                                <div className="mb-10 text-center">
                                    <div className="px-5 py-2 rounded-2xl bg-[#111] border border-zinc-800 shadow-[0_0_15px_-5px_rgba(168,85,247,0.3)] flex flex-col items-center gap-1">
                                        <span className="text-[7px] font-bold text-zinc-500 uppercase tracking-widest">PRODUK YANG DIPILIH:</span>
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">{selectedProduct?.data.tier}</span>
                                        <div className="mt-1.5 pt-1.5 border-t border-zinc-800 w-full">
                                            <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">AKSES: Full Akses Bebas Analisa Unlimited</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-[85%] space-y-3">
                                    <button onClick={handleConfirmWhatsapp} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7c3aed] to-[#4f46e5] hover:from-[#6d28d9] hover:to-[#4338ca] text-white font-black text-[9px] tracking-[0.2em] uppercase shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] transition-all transform hover:scale-[1.02] active:scale-[0.98] border border-white/10">KONFIRMASI WHATSAPP</button>
                                    <button onClick={handleBackToStore} className="w-full py-3 rounded-xl bg-[#111] border border-zinc-800 text-zinc-500 font-bold text-[9px] tracking-[0.2em] uppercase hover:bg-zinc-800 hover:text-white hover:border-zinc-700 transition-all">BATALKAN</button>
                                </div>
                                <div className="mt-6 text-center flex flex-col items-center gap-1.5 opacity-80">
                                    <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    <p className="text-[7px] text-zinc-500 leading-relaxed font-mono tracking-wide uppercase">
                                        Secure Payment via QRIS And All payments / Bank Transfer.<br/>
                                        Processed manually by Admin via WhatsApp.
                                    </p>
                                </div>
                            </div>
                        </div>
                     )}
                   </div>
               </div>
          </div>
      )}

      {/* 4 GLOBAL TRADING SESSIONS SCHEDULE MODAL */}
      {showSessionSchedule && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#0c0d12]/98 border border-white/[0.1] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-zinc-300">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Jadwal 4 Sesi Trading Global
                    </h3>
                    <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 tracking-wider">
                      REAL-TIME WIB
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Rotasi likuiditas institusional pasar finansial dunia (Waktu Indonesia Barat)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSessionSchedule(false)}
                className="w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Current WIB Clock Banner */}
            {(() => {
              const sessionDate = new Date(clockTime);
              const timePartsWIB = new Intl.DateTimeFormat('id-ID', {
                timeZone: 'Asia/Jakarta',
                hour: 'numeric',
                minute: 'numeric',
                second: 'numeric',
                hour12: false
              }).formatToParts(sessionDate);
              const sHour = parseInt(timePartsWIB.find(p => p.type === 'hour')?.value || '0', 10);
              const sMinute = parseInt(timePartsWIB.find(p => p.type === 'minute')?.value || '0', 10);
              const sSecond = parseInt(timePartsWIB.find(p => p.type === 'second')?.value || '0', 10);
              const sTotalMin = sHour * 60 + sMinute;
              const timeStrWIB = `${String(sHour).padStart(2, '0')}:${String(sMinute).padStart(2, '0')}:${String(sSecond).padStart(2, '0')}`;

              const sessions = [
                {
                  id: 'asia',
                  code: 'ASIA',
                  name: 'Sesi Asia Pasifik',
                  city: 'Sydney & Pasifik',
                  hours: '05:00 — 07:00 WIB',
                  note: 'Likuiditas awal pembukaan market Pasifik & pembentukan baseline Asian Range.',
                  isActive: sTotalMin >= 5 * 60 && sTotalMin < 7 * 60,
                  activeBorder: 'border-emerald-500/40 shadow-[0_0_24px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/25',
                  activeBg: 'bg-gradient-to-r from-emerald-500/10 via-zinc-900/90 to-zinc-900',
                  tagColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                },
                {
                  id: 'tokyo',
                  code: 'TYO',
                  name: 'Sesi Tokyo',
                  city: 'Tokyo, Asia Timur',
                  hours: '07:00 — 16:00 WIB',
                  note: 'Pergerakan dominan pair JPY & AUD. Menjelang 14:00 mulai persiapan crossover ke sesi Eropa.',
                  isActive: sTotalMin >= 7 * 60 && sTotalMin < 16 * 60,
                  activeBorder: 'border-rose-500/40 shadow-[0_0_24px_rgba(244,63,94,0.15)] ring-1 ring-rose-500/25',
                  activeBg: 'bg-gradient-to-r from-rose-500/10 via-zinc-900/90 to-zinc-900',
                  tagColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10'
                },
                {
                  id: 'london',
                  code: 'LDN',
                  name: 'Sesi London',
                  city: 'London European Hub',
                  hours: '14:00 — 23:00 WIB',
                  note: 'Pusat volume transaksi forex terbesar global (~43%). Sering terjadi pembentukan Judas Swing & tren ekspansi harian.',
                  isActive: sTotalMin >= 14 * 60 && sTotalMin < 23 * 60,
                  activeBorder: 'border-violet-500/40 shadow-[0_0_24px_rgba(139,92,246,0.15)] ring-1 ring-violet-500/25',
                  activeBg: 'bg-gradient-to-r from-violet-500/10 via-zinc-900/90 to-zinc-900',
                  tagColor: 'text-violet-400 border-violet-500/30 bg-violet-500/10'
                },
                {
                  id: 'newyork',
                  code: 'NYC',
                  name: 'Sesi New York',
                  city: 'New York Wall Street',
                  hours: '20:00 — 05:00 WIB',
                  note: 'Pusat likuiditas USD & Gold (XAUUSD). Periode rilis berita High Impact tier-1 (NFP, CPI, FOMC, Fed Rate).',
                  isActive: sTotalMin >= 20 * 60 || sTotalMin < 5 * 60,
                  activeBorder: 'border-sky-500/40 shadow-[0_0_24px_rgba(14,165,233,0.15)] ring-1 ring-sky-500/25',
                  activeBg: 'bg-gradient-to-r from-sky-500/10 via-zinc-900/90 to-zinc-900',
                  tagColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10'
                }
              ];

              return (
                <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/80 border border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                      </span>
                      <span className="text-[10px] font-mono text-zinc-300 font-semibold tracking-wider uppercase">
                        JAM SERVER SAAT INI (WIB):
                      </span>
                    </div>
                    <span className="text-base font-mono font-bold text-emerald-400 tracking-wider tabular-nums">
                      {timeStrWIB} <span className="text-[10px] text-zinc-400 font-normal">WIB</span>
                    </span>
                  </div>

                  <div className="grid gap-2.5">
                    {sessions.map((item) => (
                      <div
                        key={item.id}
                        className={`relative p-3.5 rounded-xl border transition-all ${
                          item.isActive
                            ? `${item.activeBorder} ${item.activeBg}`
                            : 'bg-zinc-900/40 border-white/[0.06] hover:border-white/15'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-[11px] border shrink-0 ${item.tagColor}`}>
                              {item.code}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-xs font-bold text-white tracking-tight">
                                  {item.name}
                                </h4>
                                <span className="text-[10px] text-zinc-400">
                                  · {item.city}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono font-bold text-zinc-200 mt-0.5 tabular-nums">
                                {item.hours}
                              </div>
                            </div>
                          </div>

                          {item.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              AKTIF SEKARANG
                            </span>
                          ) : (
                            <span className="text-[8.5px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-800/50 border border-white/5">
                              MENUNGGU
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-[10.5px] text-zinc-400 pl-11 leading-relaxed font-sans">
                          {item.note}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-[10.5px] text-zinc-300 leading-relaxed font-sans">
                    <div className="flex items-center gap-2 mb-1 text-amber-300 font-semibold text-[11px]">
                      <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Golden Liquidity Overlap (20:00 — 23:00 WIB)</span>
                    </div>
                    <p className="text-zinc-400 pl-5">
                      Volatilitas dan pergerakan spread tertipis terjadi saat <span className="text-white font-medium">Overlap London & New York (20:00 — 23:00 WIB)</span>. Sangat ideal untuk eksekusi institusi Smart Money Concept (SMC), Liquidity Sweep, dan Scalping M1–M5 pada Gold (XAUUSD) serta Major Forex.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Footer */}
            <div className="p-3 border-t border-white/[0.08] bg-black/40 flex justify-end">
              <button
                onClick={() => setShowSessionSchedule(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-[10px] font-bold tracking-wider transition-colors cursor-pointer"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingUI;
