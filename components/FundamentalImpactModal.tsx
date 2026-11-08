import React, { useState, useMemo } from 'react';
import { CalendarEvent } from './FundamentalData';
import { 
    Sparkles, 
    TrendingUp, 
    TrendingDown, 
    Shuffle, 
    Coins, 
    Flame, 
    ShieldAlert, 
    Clock, 
    X, 
    ChevronRight, 
    AlertTriangle, 
    Layers, 
    Activity, 
    CheckCircle2,
    BarChart2,
    Calendar,
    Globe
} from 'lucide-react';
import { UserSession } from '../types';

interface FundamentalImpactModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: CalendarEvent[];
    todayKey: string;
    availableDates: {
        key: string;
        dateNum: number;
        shortDay: string;
        shortMonth: string;
        highCount: number;
        mediumCount: number;
        isToday: boolean;
        isTomorrow: boolean;
        fullLabel: string;
    }[];
    userSession?: UserSession;
    onRequestAuth?: () => void;
}

type MarketSector = 'CRYPTO' | 'XAUUSD' | 'COMMODITY' | 'FOREX';
type MarketBias = 'BULLISH' | 'BEARISH' | 'DUA ARAH';

interface SectorAnalysis {
    sector: MarketSector;
    name: string;
    icon: string;
    bias: MarketBias;
    biasScore: number;
    volatilityLevel: 'EKSTRIM' | 'TINGGI' | 'MODERAT';
    summary: string;
    primaryRationale: string;
    whipsawScenario: string;
    actionablePlaybook: string;
    affectedPairs: string[];
}

export const FundamentalImpactModal: React.FC<FundamentalImpactModalProps> = ({
    isOpen,
    onClose,
    events,
    todayKey,
    availableDates,
    userSession,
    onRequestAuth
}) => {
    const [selectedDateKey, setSelectedDateKey] = useState<string>(todayKey);
    const [activeSector, setActiveSector] = useState<MarketSector>('XAUUSD');
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiDeepAnalysis, setAiDeepAnalysis] = useState<string | null>(null);

    // Reset AI analysis when date changes
    const handleSelectDate = (key: string) => {
        setSelectedDateKey(key);
        setAiDeepAnalysis(null);
    };

    // Filter relevant High and Medium impact events for the selected date
    const selectedDateEvents = useMemo(() => {
        const getEventJakartaDateKey = (dateStr: string) => {
            const d = new Date(dateStr);
            const dateInJakarta = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const pad = (n: number) => String(n).padStart(2, '0');
            return `${dateInJakarta.getFullYear()}-${pad(dateInJakarta.getMonth() + 1)}-${pad(dateInJakarta.getDate())}`;
        };

        return events.filter(e => {
            const key = getEventJakartaDateKey(e.date);
            const isTargetDate = key === selectedDateKey;
            const isImpactRelevant = e.impact === 'High' || e.impact === 'Medium';
            return isTargetDate && isImpactRelevant;
        });
    }, [events, selectedDateKey]);

    // High & Medium breakdown
    const highEvents = useMemo(() => selectedDateEvents.filter(e => e.impact === 'High'), [selectedDateEvents]);
    const mediumEvents = useMemo(() => selectedDateEvents.filter(e => e.impact === 'Medium'), [selectedDateEvents]);

    // Dedicated Fundamental AI Synthesis (Separated Token Pool - Protected from Candlestick Chart Quota)
    const handleRunAiSynthesis = async () => {
        if (!userSession?.isLoggedIn || userSession?.username === 'Vinzx Family') {
            if (onRequestAuth) {
                onRequestAuth();
            }
            return;
        }

        if (isAiLoading) return;
        setIsAiLoading(true);
        try {
            const eventsSummary = selectedDateEvents.map(e => 
                `- [${(e.impact || '').toUpperCase()}] ${e.country} ${e.title} (Prev: ${e.previous || '-'}, Frc: ${e.forecast || '-'}, Act: ${e.actual || 'PENDING'})`
            ).join('\n');

            const prompt = `Analisa institusional komprehensif untuk katalis berita ekonomi tanggal ${selectedDateKey}:

DATA KATALIS:
${eventsSummary || 'Tidak ada berita High/Medium terjadwal pada hari ini. Analisis baseline makro.'}

BERIKAN ANALISIS INSTITUSIONAL MULTI-ASET (GACOR, TAJAM, AKURAT):
1. BIAS & SENTIMEN MAKRO UTAMA (Hawkish / Dovish / Netral)
2. PROYEKSI CRYPTO (BTC, ETH): Arah (BULLISH / BEARISH / DUA ARAH), likuiditas DXY, range %.
3. PROYEKSI XAUUSD (GOLD): Arah (BULLISH / BEARISH / DUA ARAH), korelasi real yields & safe-haven, range USD.
4. PROYEKSI KOMODITAS (USOIL): Arah (BULLISH / BEARISH / DUA ARAH), faktor permintaan industri & korelasi CAD.
5. PROYEKSI FOREX MAJORS (EURUSD, GBPUSD, USDJPY): Arah dan selisih suku bunga.
6. PERINGATAN WHIPSAW & ATURAN 15 MENIT: Area stop hunt likuiditas dan panduan eksekusi yang aman.`;

            const systemInstruction = "Anda adalah VINZX Fundamental Intelligence Engine v.2.0. Berikan analisis fundamental institusional yang tajam, akurat, dan berbobot menggunakan konsep Smart Money & Intermarket Correlations.";

            const res = await fetch('/api/generate/fundamental', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelName: 'gemini-3.1-flash-lite',
                    prompt,
                    systemInstruction,
                    category: 'FUNDAMENTAL'
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data && data.text) {
                    setAiDeepAnalysis(data.text);
                }
            }
        } catch (err) {
            console.error('AI fundamental synthesis failed:', err);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Calculate Institutional Market Projections
    const marketAnalysis = useMemo((): Record<MarketSector, SectorAnalysis> => {
        let usdScore = 0; // positive = strong USD, negative = weak USD
        let eurGbpScore = 0;
        let inflationPressure = 0;
        let rateHikeExpectation = 0;
        let uncertaintyFactor = 0;

        selectedDateEvents.forEach(e => {
            const title = (e.title || '').toLowerCase();
            const cur = (e.country || '').toUpperCase();
            const isHigh = e.impact === 'High';
            const weight = isHigh ? 3 : 1.5;

            // Analyze USD catalysts
            if (cur === 'USD') {
                if (title.includes('interest rate') || title.includes('fed funds') || title.includes('fomc')) {
                    rateHikeExpectation += weight;
                    uncertaintyFactor += 4;
                }
                if (title.includes('cpi') || title.includes('inflation') || title.includes('pce')) {
                    inflationPressure += weight;
                    usdScore += weight * 0.8;
                }
                if (title.includes('non-farm') || title.includes('payrolls') || title.includes('unemployment rate')) {
                    usdScore += weight * 0.7;
                    uncertaintyFactor += 3;
                }
                if (title.includes('jobless claims') || title.includes('unemployment claims')) {
                    usdScore -= weight * 0.4;
                }
                if (title.includes('gdp')) {
                    usdScore += weight * 0.6;
                }
                if (title.includes('powell speaks')) {
                    uncertaintyFactor += 3;
                }
            } else if (cur === 'EUR' || cur === 'GBP') {
                if (title.includes('interest rate') || title.includes('cpi') || title.includes('gdp')) {
                    eurGbpScore += weight;
                }
            }
        });

        const hasHighImpactUSD = highEvents.some(e => (e.country || '').toUpperCase() === 'USD');

        const determineBias = (score: number, uncertainty: number): MarketBias => {
            if (uncertainty >= 6 || Math.abs(score) < 1.2) {
                return 'DUA ARAH';
            }
            return score > 0 ? 'BULLISH' : 'BEARISH';
        };

        // 1. CRYPTO (BTC, ETH)
        const cryptoScore = -usdScore + (inflationPressure > 2 ? 1 : 0);
        const cryptoBias = determineBias(cryptoScore, uncertaintyFactor);

        // 2. XAUUSD (GOLD / EMAS)
        const goldScore = -usdScore;
        const goldBias = determineBias(goldScore, uncertaintyFactor >= 5 ? uncertaintyFactor : 0);

        // 3. COMMODITY (USOIL, SILVER)
        const commodityScore = -usdScore * 0.7;
        const commodityBias = determineBias(commodityScore, uncertaintyFactor + 1);

        // 4. FOREX (EUR/USD, GBP/USD, USD/JPY)
        const forexVsUsdScore = eurGbpScore - usdScore;
        const forexBias = determineBias(forexVsUsdScore, uncertaintyFactor);

        return {
            CRYPTO: {
                sector: 'CRYPTO',
                name: 'Crypto (Bitcoin, Ethereum, Altcoins)',
                icon: '🪙',
                bias: cryptoBias,
                biasScore: Math.max(-100, Math.min(100, Math.round(cryptoScore * 25))),
                volatilityLevel: hasHighImpactUSD ? 'EKSTRIM' : 'TINGGI',
                summary: cryptoBias === 'BULLISH' 
                    ? `Pelemahan indeks Dolar (DXY) diperkirakan membuka aliran likuiditas risk-on ke Bitcoin & pasar kripto.`
                    : cryptoBias === 'BEARISH'
                    ? `Penguatan Dolar AS dan ekspektasi pengetatan suku bunga memicu tekanan jual likuiditas pada aset berisiko kripto.`
                    : `Volatilitas dua arah tajam! Likuiditas buy-stop dan sell-stop berpotensi dibersihkan sebelum arah tren terbentuk.`,
                primaryRationale: `Kripto berkorelasi kuat dengan ketersediaan likuiditas global (M2) dan arah indeks US Dollar (DXY). Rilis berita ${highEvents.length > 0 ? highEvents.map(h => h.title).slice(0, 2).join(', ') : 'fundamental'} menjadi katalis volatilitas utama pada Bitcoin & Ethereum.`,
                whipsawScenario: `Skenario Manipulasi: Harga kripto seringkali melakukan 'fakeout pump' untuk memicu FOMO buyer tepat saat rilis, kemudian dump tajam membersihkan leverage long position, atau sebaliknya sweep low sebelum reli.`,
                actionablePlaybook: `Hindari entry posisi futures dengan leverage tinggi 15 menit sebelum & 15 menit sesudah news. Tunggu candle M15 ditutup dan pastikan konfirmasi Break of Structure (BOS) sebelum follow momentum.`,
                affectedPairs: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT']
            },
            XAUUSD: {
                sector: 'XAUUSD',
                name: 'XAUUSD (Gold / Emas Murni)',
                icon: '🟡',
                bias: goldBias,
                biasScore: Math.max(-100, Math.min(100, Math.round(goldScore * 25))),
                volatilityLevel: hasHighImpactUSD ? 'EKSTRIM' : 'TINGGI',
                summary: goldBias === 'BULLISH'
                    ? `Emas berpotensi reli kuat akibat pelemahan imbal hasil obligasi AS dan devaluasi mata uang Dolar.`
                    : goldBias === 'BEARISH'
                    ? `Emas tertekan ke zona diskon akibat lonjakan Dolar AS dan naiknya real yields obligasi pemerintah AS.`
                    : `Zona Whipsaw Ekstrim! Emas diperkirakan menyapu likuiditas 30-50 pips di kedua sisi (Equal High & Low) sebelum melanjutkan arah utama.`,
                primaryRationale: `Emas diperdagangkan dalam denominasi USD. Setiap kenaikan tajam pada data ${highEvents.length > 0 ? highEvents[0].title : 'High Impact USD'} menekan harga emas, sedangkan data yang lebih lemah dari ekspektasi menjadi pendorong roket kenaikan emas.`,
                whipsawScenario: `Skenario False Breakout: Saat news dirilis, candle M1/M5 sering membentuk shadow panjang menyapu Stop Loss retail di atas resistance dan di bawah support secara simultan (Institutional Stop Hunt).`,
                actionablePlaybook: `Gunakan strategi 'Post-News Mitigation': Jangan masuk saat detik rilis news. Tunggu retest ke zona Fair Value Gap (FVG) atau Order Block (OB) yang terbentuk setelah news rilis dengan Risk/Reward minimal 1:2.5.`,
                affectedPairs: ['XAU/USD (Gold)', 'XAG/USD (Silver)', 'Gold Futures']
            },
            COMMODITY: {
                sector: 'COMMODITY',
                name: 'Commodities (USOIL / Minyak, Perak, Tembaga)',
                icon: '🛢️',
                bias: commodityBias,
                biasScore: Math.max(-100, Math.min(100, Math.round(commodityScore * 25))),
                volatilityLevel: hasHighImpactUSD ? 'TINGGI' : 'MODERAT',
                summary: commodityBias === 'BULLISH'
                    ? `Sentimen ekspansi manufaktur dan pelemahan Dolar mendorong kenaikan harga komoditas energi & industri.`
                    : commodityBias === 'BEARISH'
                    ? `Kekhawatiran penurunan konsumsi industri dan penguatan USD menekan harga USOIL dan komoditas global.`
                    : `Pasar komoditas berkonsolidasi dalam rentang range dengan potensi fake breakout pada batas atas & bawah.`,
                primaryRationale: `Harga energi seperti WTI Crude Oil dan logam industri sangat sensitif terhadap data PMI Manufaktur, data inventori, serta kekuatan nilai tukar US Dollar.`,
                whipsawScenario: `Whipsaw Range: Terjadi reaksi tarik ulur antara sentimen suplai fisik vs sentimen moneter suku bunga Dolar AS.`,
                actionablePlaybook: `Perhatikan level Support & Resistance kunci pada timeframe H1. Entry hanya setelah terjadi konfirmasi penolakan (rejection candle / pin bar) dari level psikologis round number.`,
                affectedPairs: ['USOIL (WTI)', 'UKOIL (Brent)', 'XAG/USD', 'Copper']
            },
            FOREX: {
                sector: 'FOREX',
                name: 'Forex Major Pairs (EUR, GBP, JPY, AUD, CAD)',
                icon: '💱',
                bias: forexBias,
                biasScore: Math.max(-100, Math.min(100, Math.round(forexVsUsdScore * 25))),
                volatilityLevel: hasHighImpactUSD ? 'EKSTRIM' : 'TINGGI',
                summary: forexBias === 'BULLISH'
                    ? `Pasangan mata uang mayor (EUR/USD, GBP/USD, AUD/USD) diproyeksikan menguat terhadap US Dollar.`
                    : forexBias === 'BEARISH'
                    ? `US Dollar mendominasi pasar, menekan EUR/USD & GBP/USD turun dan mendorong USD/JPY naik.`
                    : `Dua Arah / Choppy Market! Terjadi divergensi sentimen antar bank sentral yang memicu spike spread melebar.`,
                primaryRationale: `Perbedaan selisih suku bunga (Interest Rate Differential) dan ekspektasi kebijakan moneter bank sentral (The Fed, ECB, BoE, BoJ) menjadi penggerak utama arus modal valuta asing.`,
                whipsawScenario: `Spread Spike Trap: Menjelang dan sesaat setelah rilis, spread antar broker melebar drastis. Posisi breakout instan sering terkena slippage fatal.`,
                actionablePlaybook: `Untuk trader scalping M5/M15: Tunggu 15 menit pasca-rilis hingga spread normal. Identifikasi Change of Character (CHoCH) pada pair EUR/USD atau GBP/USD sebelum open posisi.`,
                affectedPairs: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD']
            }
        };
    }, [selectedDateEvents, highEvents, selectedDateKey]);

    const activeAnalysis = marketAnalysis[activeSector];

    const getBiasBadge = (bias: MarketBias) => {
        switch (bias) {
            case 'BULLISH':
                return (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        BULLISH 🟢
                    </span>
                );
            case 'BEARISH':
                return (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/40 text-xs font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        BEARISH 🔴
                    </span>
                );
            case 'DUA ARAH':
                return (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                        <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                        DUA ARAH (WHIPSAW) 🟡
                    </span>
                );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl max-h-[92vh] bg-[#090314] border border-purple-500/30 rounded-3xl flex flex-col shadow-[0_0_50px_rgba(147,51,234,0.35)] overflow-hidden">
                {/* MODAL HEADER */}
                <div className="px-5 py-4 bg-gradient-to-r from-purple-950/70 via-black to-indigo-950/60 border-b border-purple-500/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
                            <div className="w-full h-full bg-[#0d031c] rounded-[10px] flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-black text-white tracking-wider uppercase whitespace-nowrap [text-shadow:0_0_12px_rgba(192,132,252,0.9),0_0_24px_rgba(168,85,247,0.6)]">
                                    Menganalisa Dampak News Fundamental
                                </h3>
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                    MULTI-SECTOR
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                                Proyeksi pergerakan akurat: Crypto • XAUUSD • Commodity • Forex
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 hover:border-rose-500/30 text-zinc-400 hover:text-white flex items-center justify-center transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* DATE SELECTOR STRIP */}
                <div className="px-4 py-2.5 bg-black/50 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-400" />
                        Pilih Hari:
                    </span>
                    {availableDates.map(d => {
                        const isSelected = selectedDateKey === d.key;
                        return (
                            <button
                                key={d.key}
                                onClick={() => handleSelectDate(d.key)}
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                                    isSelected
                                    ? 'bg-purple-600 text-white font-bold border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.4)]'
                                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span>{d.isToday ? 'Hari Ini' : d.isTomorrow ? 'Besok' : `${d.shortDay} ${d.dateNum}`}</span>
                                {d.highCount > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_#f43f5e]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ISOLATED TOKEN STATUS & SAFETY BADGE */}
                <div className="px-4 py-1.5 bg-[#0b0318] border-b border-purple-500/15 flex items-center justify-between gap-2 text-[10px] font-mono shrink-0">
                    <div className="flex items-center gap-1.5 text-purple-300">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse shrink-0" />
                        <span className="truncate">
                            <strong>Token API Khusus:</strong> Menganalisa Dampak News Fundamental berjalan mandiri
                        </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold whitespace-nowrap">
                        🔒 Token Candlestick Aman
                    </span>
                </div>

                {/* ACTIVE NEWS CATALYST SUMMARY BAR */}
                <div className="px-5 py-2.5 bg-purple-950/20 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-zinc-300">Katalis Hari Ini:</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                            🔴 {highEvents.length} High Impact
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                            🟠 {mediumEvents.length} Medium Impact
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRunAiSynthesis}
                            disabled={isAiLoading}
                            className={`px-3 py-1 rounded-xl text-[10px] font-mono font-black tracking-wider uppercase transition-all flex items-center gap-1.5 ${
                                isAiLoading
                                ? 'bg-purple-800 text-purple-200 animate-pulse border border-purple-500/50'
                                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/40'
                            }`}
                        >
                            <Sparkles className={`w-3 h-3 text-amber-300 ${isAiLoading ? 'animate-spin' : ''}`} />
                            <span>{isAiLoading ? 'AI Menganalisa...' : aiDeepAnalysis ? 'Perbarui Sintesis AI' : 'Sintesis AI Institusi'}</span>
                        </button>
                    </div>
                </div>

                {/* SECTOR NAVIGATION TABS */}
                <div className="grid grid-cols-4 p-2 gap-1.5 bg-[#0e041f] border-b border-white/5 shrink-0">
                    {(['XAUUSD', 'CRYPTO', 'FOREX', 'COMMODITY'] as MarketSector[]).map((sec) => {
                        const item = marketAnalysis[sec];
                        const isActive = activeSector === sec;
                        return (
                            <button
                                key={sec}
                                onClick={() => setActiveSector(sec)}
                                className={`py-2 px-2 rounded-xl transition-all flex flex-col items-center justify-center text-center ${
                                    isActive
                                    ? 'bg-purple-600/30 border border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                                    : 'bg-white/5 border border-transparent text-zinc-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                <span className="text-[11px] font-bold mt-0.5">{sec}</span>
                                <span className={`text-[8px] font-mono font-bold mt-0.5 ${
                                    item.bias === 'BULLISH' ? 'text-emerald-400' : item.bias === 'BEARISH' ? 'text-rose-400' : 'text-amber-400'
                                }`}>
                                    {item.bias}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* MODAL BODY (DETAIL ANALYSIS PER SECTOR) */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
                    {/* OPTIONAL AI DEEP SYNTHESIS CARD */}
                    {aiDeepAnalysis && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-black to-indigo-950/50 border border-purple-500/40 space-y-3 shadow-[0_0_30px_rgba(168,85,247,0.25)] animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <h5 className="text-xs font-black text-purple-200 tracking-wider uppercase">
                                        Hasil Sintesis AI Makro & Intermarket
                                    </h5>
                                    <span className="text-[8px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                                        VINZX THINKING
                                    </span>
                                </div>
                                <button
                                    onClick={() => setAiDeepAnalysis(null)}
                                    className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors"
                                >
                                    Sembunyikan
                                </button>
                            </div>
                            <div className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap max-h-64 overflow-y-auto pr-1 custom-scrollbar bg-black/40 p-3 rounded-xl border border-white/5">
                                {aiDeepAnalysis}
                            </div>
                        </div>
                    )}
                    {/* SECTOR HERO BANNER */}
                    <div className="p-4 sm:p-5 rounded-2xl border border-white/10 bg-gradient-to-br from-[#150629] via-black/80 to-[#100320] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{activeAnalysis.icon}</span>
                                <h4 className="text-base sm:text-lg font-black text-white tracking-wide">
                                    {activeAnalysis.name}
                                </h4>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                                {activeAnalysis.summary}
                            </p>
                        </div>

                        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                                Bias Fundamental
                            </span>
                            {getBiasBadge(activeAnalysis.bias)}
                            <span className="text-[10px] font-mono text-zinc-400 mt-1">
                                Volatilitas: <strong className="text-rose-400">{activeAnalysis.volatilityLevel}</strong>
                            </span>
                        </div>
                    </div>

                    {/* THREE KEY INSTITUTIONAL PILLARS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. RATIONALE & CORRELATION */}
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-purple-300 uppercase tracking-wider">
                                <Activity className="w-4 h-4 text-purple-400" />
                                <span>Alasan & Korelasi Makro</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                {activeAnalysis.primaryRationale}
                            </p>
                            <div className="pt-2 flex flex-wrap gap-1.5">
                                <span className="text-[9px] text-zinc-500 font-mono">Aset Terdampak:</span>
                                {activeAnalysis.affectedPairs.map(p => (
                                    <span key={p} className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/60 text-purple-200 border border-white/5">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 2. WHIPSAW / DUA ARAH MANIPULATION SCENARIO */}
                        <div className="p-4 rounded-2xl bg-amber-950/15 border border-amber-500/30 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase tracking-wider">
                                <Shuffle className="w-4 h-4 text-amber-400" />
                                <span>Waspada Skenario Dua Arah (Whipsaw)</span>
                            </div>
                            <p className="text-xs text-amber-100/90 leading-relaxed">
                                {activeAnalysis.whipsawScenario}
                            </p>
                            <span className="inline-block text-[10px] font-mono text-amber-400/90 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                ⚠️ Waspadai Stop Hunt 15 Menit Awal
                            </span>
                        </div>
                    </div>

                    {/* ACTIONABLE INSTITUTIONAL SMC PLAYBOOK */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 to-black border border-purple-500/30 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                            <ShieldAlert className="w-4 h-4 text-emerald-400" />
                            <span>Panduan Eksekusi Institusi (Actionable Playbook)</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-mono">
                            {activeAnalysis.actionablePlaybook}
                        </p>
                    </div>

                    {/* ACTIVE NEWS IMPACT DRIVERS FOR THIS DATE */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-black text-zinc-300 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                                <BarChart2 className="w-4 h-4 text-purple-400" />
                                Rincian Berita Pemicu ({selectedDateEvents.length} Event)
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500">
                                High & Medium Only
                            </span>
                        </div>

                        {selectedDateEvents.length === 0 ? (
                            <div className="p-4 rounded-xl bg-black/30 border border-white/5 text-center text-xs font-mono text-zinc-500">
                                Tidak ada berita High / Medium Impact pada tanggal ini. Pasar cenderung bergerak teknikal reguler.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {selectedDateEvents.map((ev, idx) => {
                                    const eventDate = new Date(ev.date);
                                    const timeStr = eventDate.toLocaleTimeString('id-ID', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        timeZone: 'Asia/Jakarta'
                                    }) + ' WIB';

                                    return (
                                        <div key={idx} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between text-xs">
                                            <div className="space-y-0.5 min-w-0 pr-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-bold font-mono px-1.5 py-0.2 rounded bg-white/10 text-white">
                                                        {ev.country}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-zinc-400">
                                                        {timeStr}
                                                    </span>
                                                </div>
                                                <h6 className="text-[11px] font-bold text-zinc-200 truncate">
                                                    {ev.title}
                                                </h6>
                                            </div>

                                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                                                ev.impact === 'High' 
                                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' 
                                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                            }`}>
                                                {ev.impact}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="px-5 py-3 bg-[#0d031c] border-t border-purple-500/20 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500">
                        Institutional Algorithm • Intermarket Correlation Engine
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
                    >
                        Tutup Analisa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FundamentalImpactModal;
