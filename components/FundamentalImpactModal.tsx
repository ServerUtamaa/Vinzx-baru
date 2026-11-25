import React, { useState, useMemo, useEffect } from 'react';
import { CalendarEvent } from './FundamentalData';
import {
    Sparkles,
    TrendingUp,
    TrendingDown,
    Shuffle,
    ShieldAlert,
    X,
    Activity,
    BarChart2,
    Calendar,
    Flame,
    CheckCircle2,
    Clock,
    Zap
} from 'lucide-react';
import { UserSession } from '../types';
import {
    analyzeFilteredNewsForSectors,
    DirectionalOutcome,
    ImpactFilterMode,
    MarketSector
} from '../utils/fundamentalAnalyzer';

interface FundamentalImpactModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: CalendarEvent[];
    targetDateKey: string;
    targetDateLabel: string;
    targetCountry: string;
    targetCountryLabel: string;
    targetImpact: ImpactFilterMode;
    currentTime: number;
    userSession?: UserSession;
    onRequestAuth?: () => void;
}

export const FundamentalImpactModal: React.FC<FundamentalImpactModalProps> = ({
    isOpen,
    onClose,
    events,
    targetDateKey,
    targetDateLabel,
    targetCountry,
    targetCountryLabel,
    targetImpact,
    currentTime,
    userSession,
    onRequestAuth
}) => {
    const [activeSector, setActiveSector] = useState<MarketSector>('XAUUSD');
    const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
    const [aiDeepAnalysis, setAiDeepAnalysis] = useState<string | null>(null);

    // Clear stale AI response whenever the 3-filter combination changes
    useEffect(() => {
        setAiDeepAnalysis(null);
    }, [targetDateKey, targetCountry, targetImpact]);

    const impactLabel =
        targetImpact === 'ALL'
            ? 'SEMUA (HIGH, MED, LOW)'
            : targetImpact === 'HIGH_MEDIUM'
            ? 'HIGH & MEDIUM'
            : targetImpact;

    const report = useMemo(() => {
        return analyzeFilteredNewsForSectors(events, {
            targetDateKey,
            targetCountry,
            targetCountryLabel,
            targetImpact,
            currentTime
        });
    }, [events, targetDateKey, targetCountry, targetCountryLabel, targetImpact, currentTime]);

    const activeAnalysis = report.sectors[activeSector];

    // Deep Institutional AI Synthesis strictly for the 3 chosen filters
    const handleRunAiSynthesis = async () => {
        if (!userSession?.isLoggedIn || userSession?.username === 'Vinzx Family') {
            if (onRequestAuth) onRequestAuth();
            return;
        }
        if (isAiLoading) return;
        setIsAiLoading(true);
        try {
            const eventsSummary = report.analyzedEvents
                .map(item => {
                    const statusLabel =
                        item.status === 'ONGOING'
                            ? 'SEDANG BERJALAN'
                            : item.status === 'UPCOMING'
                            ? 'AKAN BERJALAN'
                            : 'SELESAI';
                    return `- [${statusLabel}] [${(item.event.impact || '').toUpperCase()}] ${item.timeWib} • ${item.event.country} • ${item.event.title} (Sblm: ${item.event.previous || '-'}, Prediksi: ${item.event.forecast || '-'}, Aktual: ${item.event.actual || 'MENUNGGU'}) -> ${item.directionReason}`;
                })
                .join('\n');

            const prompt = `ANALISA MENDALAM NEWS FUNDAMENTAL BERDASARKAN PILIHAN SPESIFIK USER:
- JENIS NEWS : ${impactLabel}
- TANGGAL : ${targetDateLabel} (${targetDateKey})
- NEGARA : ${targetCountryLabel} (${targetCountry})
- STATUS KATALIS : ${report.focusStatusLabel}

DAFTAR NEWS TERFILTER (FOKUS YANG SEDANG BERJALAN & AKAN BERJALAN):
${eventsSummary || 'Tidak ada event terjadwal pada kombinasi filter ini.'}

TUGAS ANALISA WAJIB (TEGAS, DETAIL, AKURAT):
Untuk setiap aset berikut:
1. GOLD / XAUUSD
2. COMMODITY (USOIL, Silver, Copper)
3. CRYPTO (BTC, ETH)
4. FOREX (Pair terkait ${targetCountry} & Majors)

Tentukan dengan tegas untuk news yang sedang berjalan / akan berjalan tersebut:
- Apakah hasilnya **BULLISH KUAT**, **BEARISH KUAT**, **DUA ARAH (SPIKE DULU LALU JUNAM)**, atau **DUA ARAH (JUNAM DULU BARU SPIKE)**?
- Jika dalam 1 waktu terdapat beberapa rilis sekaligus, tentukan **MANA HASIL YANG PALING KUAT** beserta alasannya (perbandingan Actual/Forecast/Previous & korelasi suku bunga/DXY)!
- Jelaskan area likuiditas stop hunt (spike/sweep) dan panduan eksekusi yang aman.`;

            const systemInstruction =
                'Anda adalah VINZX Institutional Fundamental Analyst. Jawab secara tajam dan tegas menentukan apakah news menghasilkan BULLISH, BEARISH, SPIKE LALU JUNAM, atau JUNAM DULU BARU SPIKE, serta mana yang paling kuat dalam 1 waktu.';

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
                if (data && data.text) setAiDeepAnalysis(data.text);
            }
        } catch (err) {
            console.error('AI fundamental synthesis failed:', err);
        } finally {
            setIsAiLoading(false);
        }
    };

    const getOutcomeBadge = (outcome: DirectionalOutcome, dominancePct: number) => {
        switch (outcome) {
            case 'BULLISH':
                return (
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        BULLISH ({dominancePct}%)
                    </span>
                );
            case 'BEARISH':
                return (
                    <span className="px-2.5 py-1 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-400/40 text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                        BEARISH ({dominancePct}%)
                    </span>
                );
            case 'SPIKE_THEN_DUMP':
                return (
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-200 border border-amber-400/50 text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                        <Shuffle className="w-3.5 h-3.5 text-amber-400" />
                        SPIKE LALU JUNAM ({dominancePct}%)
                    </span>
                );
            case 'DUMP_THEN_SPIKE':
                return (
                    <span className="px-2.5 py-1 rounded-xl bg-cyan-500/20 text-cyan-200 border border-cyan-400/50 text-[11px] font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
                        <Zap className="w-3.5 h-3.5 text-cyan-300" />
                        JUNAM LALU SPIKE ({dominancePct}%)
                    </span>
                );
        }
    };

    const getTabShortOutcome = (outcome: DirectionalOutcome) => {
        switch (outcome) {
            case 'BULLISH':
                return { text: 'BULLISH', cls: 'text-emerald-400' };
            case 'BEARISH':
                return { text: 'BEARISH', cls: 'text-rose-400' };
            case 'SPIKE_THEN_DUMP':
                return { text: 'SPIKE ➔ JUNAM', cls: 'text-amber-300' };
            case 'DUMP_THEN_SPIKE':
                return { text: 'JUNAM ➔ SPIKE', cls: 'text-cyan-300' };
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl max-h-[92vh] bg-[#090314] border border-purple-500/35 rounded-3xl flex flex-col shadow-[0_0_50px_rgba(147,51,234,0.35)] overflow-hidden">
                {/* MODAL HEADER */}
                <div className="px-5 py-4 bg-gradient-to-r from-purple-950/70 via-black to-indigo-950/60 border-b border-purple-500/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)] shrink-0">
                            <div className="w-full h-full bg-[#0d031c] rounded-[10px] flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs sm:text-base font-black text-white tracking-wider uppercase [text-shadow:0_0_12px_rgba(192,132,252,0.9),0_0_24px_rgba(168,85,247,0.6)]">
                                    Menganalisa Dampak News Fundamental
                                </h3>
                            </div>
                            <p className="text-[10.5px] text-zinc-400 font-mono mt-0.5 truncate">
                                Analisa mendalam news aktif & akan berjalan sesuai 3 filter pilihan Anda
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 hover:bg-rose-500/20 hover:border-rose-500/30 text-zinc-400 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* SELECTED 3 FILTERS SUMMARY BAR */}
                <div className="px-4 py-2.5 bg-black/60 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                        <span className="text-zinc-500 font-bold uppercase mr-1">Filter Aktif:</span>
                        <span className="px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-400/40 text-purple-200 font-bold">
                            1. News: {impactLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            2. {targetDateLabel}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-bold">
                            3. {targetCountryLabel} ({targetCountry})
                        </span>
                    </div>

                    <button
                        onClick={handleRunAiSynthesis}
                        disabled={isAiLoading}
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                            isAiLoading
                                ? 'bg-purple-800 text-purple-200 animate-pulse border border-purple-500/50'
                                : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.4)] border border-purple-400/40'
                        }`}
                    >
                        <Sparkles className={`w-3 h-3 text-amber-300 ${isAiLoading ? 'animate-spin' : ''}`} />
                        <span>{isAiLoading ? 'AI Menganalisa...' : aiDeepAnalysis ? 'Perbarui AI Mendalam' : 'Sintesis AI Institusi'}</span>
                    </button>
                </div>

                {/* ACTIVE STATUS & CONFLICT SUMMARY BAR */}
                <div className="px-4 py-2 bg-purple-950/25 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-2 text-[10.5px] shrink-0">
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                        {report.ongoingCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/25 text-rose-200 border border-rose-400/50 font-bold animate-pulse flex items-center gap-1">
                                <Flame className="w-3 h-3 text-rose-400" />
                                {report.ongoingCount} SEDANG BERJALAN
                            </span>
                        )}
                        {report.upcomingCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-400/40 font-bold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-indigo-300" />
                                {report.upcomingCount} AKAN BERJALAN
                            </span>
                        )}
                        {report.completedCount > 0 && (
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-white/10 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {report.completedCount} SELESAI
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-mono text-purple-200/80">
                        Total Terfilter: <strong>{report.totalMatched} Event</strong>
                    </span>
                </div>

                {/* SECTOR NAVIGATION TABS */}
                <div className="grid grid-cols-4 p-2 gap-1.5 bg-[#0e041f] border-b border-white/5 shrink-0">
                    {(['XAUUSD', 'COMMODITY', 'CRYPTO', 'FOREX'] as MarketSector[]).map((sec) => {
                        const item = report.sectors[sec];
                        const isActive = activeSector === sec;
                        const shortOut = getTabShortOutcome(item.outcome);
                        return (
                            <button
                                key={sec}
                                onClick={() => setActiveSector(sec)}
                                className={`py-2 px-1.5 rounded-xl transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                                    isActive
                                        ? 'bg-purple-600/30 border border-purple-400 text-white shadow-[0_0_12px_rgba(168,85,247,0.3)]'
                                        : 'bg-white/5 border border-transparent text-zinc-400 hover:text-white hover:bg-white/10'
                                }`}
                            >
                                <span className="text-base">{item.icon}</span>
                                <span className="text-[10.5px] font-bold mt-0.5">{sec}</span>
                                <span className={`text-[8px] font-mono font-bold mt-0.5 ${shortOut.cls}`}>
                                    {shortOut.text}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* MODAL BODY */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
                    {/* OPTIONAL AI DEEP SYNTHESIS CARD */}
                    {aiDeepAnalysis && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-black to-indigo-950/50 border border-purple-500/40 space-y-2.5 shadow-[0_0_30px_rgba(168,85,247,0.25)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-400" />
                                    <h5 className="text-xs font-black text-purple-200 tracking-wider uppercase">
                                        Analisa AI Mendalam ({targetCountryLabel} • {targetDateLabel})
                                    </h5>
                                </div>
                                <button
                                    onClick={() => setAiDeepAnalysis(null)}
                                    className="text-[10px] font-mono text-zinc-500 hover:text-white transition-colors cursor-pointer"
                                >
                                    Sembunyikan
                                </button>
                            </div>
                            <div className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap max-h-64 overflow-y-auto pr-1 custom-scrollbar bg-black/40 p-3 rounded-xl border border-white/5">
                                {aiDeepAnalysis}
                            </div>
                        </div>
                    )}

                    {/* KESIMPULAN 1 WAKTU & KONFLIK MULTI-NEWS */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-950/35 via-purple-950/25 to-black border border-purple-400/30 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[9.5px] font-mono font-black uppercase tracking-wider text-purple-300">
                                {activeAnalysis.strongestInOneTime}
                            </span>
                            {report.conflictDetected && (
                                <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-[8.5px] font-mono font-bold text-amber-300">
                                    KONFLIK MULTI-NEWS TERDETEKSI
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed font-mono">{report.conflictSummary}</p>
                    </div>

                    {/* SECTOR HERO BANNER */}
                    <div className="p-4 rounded-2xl border border-white/10 bg-gradient-to-br from-[#150629] via-black/80 to-[#100320] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{activeAnalysis.icon}</span>
                                <h4 className="text-base sm:text-lg font-black text-white tracking-wide">
                                    {activeAnalysis.name}
                                </h4>
                            </div>
                            <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                                {activeAnalysis.summary}
                            </p>
                        </div>

                        <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                                Arah Terkuat
                            </span>
                            {getOutcomeBadge(activeAnalysis.outcome, activeAnalysis.dominancePct)}
                            <span className="text-[10px] font-mono text-zinc-400 mt-0.5">
                                Volatilitas: <strong className="text-rose-400">{activeAnalysis.volatilityLevel}</strong>
                            </span>
                        </div>
                    </div>

                    {/* TWO PILLARS: RATIONALE + SEQUENCE IN 1 TIMEFRAME */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-purple-300 uppercase tracking-wider">
                                <Activity className="w-4 h-4 text-purple-400" />
                                <span>Alasan & Bobot Katalis</span>
                            </div>
                            <p className="text-xs text-zinc-300 leading-relaxed">
                                {activeAnalysis.primaryRationale}
                            </p>
                            <div className="pt-1 flex flex-wrap gap-1.5">
                                <span className="text-[9px] text-zinc-500 font-mono">Pair Terdampak:</span>
                                {activeAnalysis.affectedPairs.map(p => (
                                    <span key={p} className="text-[9px] font-mono px-2 py-0.5 rounded bg-black/60 text-purple-200 border border-white/5">
                                        {p}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-amber-950/15 border border-amber-500/30 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-amber-300 uppercase tracking-wider">
                                <Shuffle className="w-4 h-4 text-amber-400" />
                                <span>Skenario 1 Waktu (Urutan Gerak)</span>
                            </div>
                            <p className="text-xs text-amber-100/90 leading-relaxed">
                                {activeAnalysis.sequenceDetail}
                            </p>
                        </div>
                    </div>

                    {/* PLAYBOOK */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/30 to-black border border-purple-500/30 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                            <ShieldAlert className="w-4 h-4 text-emerald-400" />
                            <span>Panduan Eksekusi Aman</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-mono">
                            {activeAnalysis.actionablePlaybook}
                        </p>
                    </div>

                    {/* EVENT LIST MATCHING USER SELECTION */}
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-black text-zinc-300 uppercase tracking-wider">
                            <span className="flex items-center gap-1.5">
                                <BarChart2 className="w-4 h-4 text-purple-400" />
                                Rincian News Terpilih ({report.analyzedEvents.length} Event)
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                                {targetCountryLabel} • {impactLabel}
                            </span>
                        </div>

                        {report.analyzedEvents.length === 0 ? (
                            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-center text-xs font-mono text-zinc-400">
                                Tidak ada jadwal news {targetCountryLabel} dengan kategori {impactLabel} pada {targetDateLabel}.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {report.analyzedEvents.map((item, idx) => (
                                    <div key={idx} className={`p-3 rounded-xl border space-y-1.5 ${
                                        item.status === 'ONGOING'
                                            ? 'bg-rose-950/25 border-rose-400/50'
                                            : item.status === 'UPCOMING'
                                            ? 'bg-indigo-950/20 border-indigo-500/30'
                                            : 'bg-black/45 border-white/[0.08]'
                                    }`}>
                                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                                <span className="px-1.5 py-0.5 rounded bg-black/60 text-white font-bold border border-white/10">
                                                    {item.timeWib}
                                                </span>
                                                <span className="font-bold text-purple-300">{item.event.country}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                                    item.event.impact === 'High'
                                                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                                        : item.event.impact === 'Medium'
                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                        : 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/30'
                                                }`}>
                                                    {item.event.impact}
                                                </span>
                                            </div>

                                            <span className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full ${
                                                item.status === 'ONGOING'
                                                    ? 'bg-rose-500/25 text-rose-200 border border-rose-400/50 animate-pulse'
                                                    : item.status === 'UPCOMING'
                                                    ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/40'
                                                    : 'bg-zinc-800 text-zinc-400'
                                            }`}>
                                                {item.status === 'ONGOING' ? 'SEDANG BERJALAN' : item.status === 'UPCOMING' ? 'AKAN BERJALAN' : 'SELESAI'}
                                            </span>
                                        </div>

                                        <div className="text-xs font-bold text-white">{item.event.title}</div>

                                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-zinc-400">
                                            <span>Aktual: <strong className="text-white">{item.event.actual || '-'}</strong></span>
                                            <span>Prediksi: <strong className="text-zinc-200">{item.event.forecast || '-'}</strong></span>
                                            <span>Sblm: <strong className="text-zinc-300">{item.event.previous || '-'}</strong></span>
                                        </div>

                                        <div className="text-[10px] font-mono text-purple-200/85 bg-black/35 px-2.5 py-1.5 rounded-lg border border-white/[0.06]">
                                            {item.directionReason}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className="px-5 py-3 bg-[#0d031c] border-t border-purple-500/20 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500">
                        Institutional News Engine • {targetCountryLabel} • {targetDateLabel}
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                    >
                        Tutup Analisa
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FundamentalImpactModal;
