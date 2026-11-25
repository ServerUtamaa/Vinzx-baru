import React, { useMemo, useState } from 'react';
import { CalendarEvent } from './FundamentalData';
import { analyzeTwoWeekMacroOutlook } from '../utils/fundamentalAnalyzer';
import { Calendar, Flame, Globe, Sparkles, TrendingUp, X, Layers, ShieldAlert } from 'lucide-react';
import { UserSession } from '../types';

interface TwoWeekOutlookModalProps {
    isOpen: boolean;
    onClose: () => void;
    events: CalendarEvent[];
    currentTime: number;
    userSession?: UserSession;
    onRequestAuth?: () => void;
}

export const TwoWeekOutlookModal: React.FC<TwoWeekOutlookModalProps> = ({
    isOpen,
    onClose,
    events,
    currentTime,
    userSession,
    onRequestAuth
}) => {
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiOutlookText, setAiOutlookText] = useState<string | null>(null);

    const report = useMemo(() => analyzeTwoWeekMacroOutlook(events, currentTime), [events, currentTime]);

    const handleRunTwoWeekAi = async () => {
        if (!userSession?.isLoggedIn || userSession?.username === 'Vinzx Family') {
            if (onRequestAuth) onRequestAuth();
            return;
        }
        if (isAiLoading) return;
        setIsAiLoading(true);
        try {
            const topPeakSummary = report.peakDays
                .map(d => `- ${d.label}: ${d.highCount} High, ${d.mediumCount} Med (${d.highlightTitles.join(' | ') || d.currencies.join(', ')})`)
                .join('\n');
            const topCcySummary = report.topCurrencies
                .map(c => `${c.currency}: ${c.highCount} High / ${c.mediumCount} Med (${c.topEvents.join(', ') || 'Umum'})`)
                .join('\n');

            const prompt = `Buat OUTLOOK MAKRO JANGKA MENENGAH (2 MINGGU / 14 HARI KE DEPAN) untuk kalender ekonomi global:\n\nRINGKASAN 14 HARI:\nTotal Event: ${report.totalEvents} (${report.totalHigh} High, ${report.totalMedium} Medium, ${report.totalLow} Low)\n\nHARI VOLATILITAS PUNCAK:\n${topPeakSummary || 'Belum ada hari High Impact besar'}\n\nMATA UANG PENGGERAK UTAMA:\n${topCcySummary}\n\nBERIKAN PETA SWING 2 MINGGU:\n1. Tema Makro 2 Minggu (Sentimen DXY, Bank Sentral, Risk-On/Risk-Off)\n2. Proyeksi Swing 2 Minggu XAUUSD (Gold)\n3. Proyeksi Swing 2 Minggu Crypto (BTC/ETH)\n4. Proyeksi Swing 2 Minggu Forex & Commodity\n5. Strategi Pengelolaan Posisi selama pekan Red Folder 14 hari ke depan.`;

            const res = await fetch('/api/generate/fundamental', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    modelName: 'gemini-3.1-flash-lite',
                    prompt,
                    systemInstruction: 'Anda adalah VINZX 14-Day Global Macro Strategist. Berikan outlook swing fundamental 2 minggu secara ringkas, terstruktur, dan institusional.',
                    category: 'FUNDAMENTAL'
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data?.text) setAiOutlookText(data.text);
            }
        } catch (err) {
            console.error('2-week macro synthesis error:', err);
        } finally {
            setIsAiLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-2xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl max-h-[92vh] bg-[#080412] border border-cyan-500/30 rounded-3xl flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.22)] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-cyan-950/60 via-[#0b0617] to-purple-950/50 border-b border-cyan-500/20 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-cyan-300" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-black text-white tracking-wider uppercase truncate">
                                    Outlook Fundamental 2 Minggu
                                </h3>
                                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shrink-0">
                                    14 HARI RADAR
                                </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                                Peta jadwal makro global, hari puncak volatilitas & penggerak mata uang 2 minggu
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

                {/* Top Summary Bar */}
                <div className="px-5 py-2.5 bg-cyan-950/15 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                        <span className="px-2 py-0.5 rounded bg-white/10 text-white font-bold">Total: {report.totalEvents} News</span>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">🔴 {report.totalHigh} High</span>
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">🟠 {report.totalMedium} Med</span>
                        <span className="px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-300 border border-yellow-500/25 font-bold">🟡 {report.totalLow} Low</span>
                    </div>

                    <button
                        onClick={handleRunTwoWeekAi}
                        disabled={isAiLoading}
                        className={`px-3 py-1 rounded-xl text-[10px] font-mono font-black tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
                            isAiLoading
                                ? 'bg-cyan-800 text-cyan-200 animate-pulse border border-cyan-500/50'
                                : 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white hover:scale-105 active:scale-95 shadow-[0_0_14px_rgba(6,182,212,0.35)] border border-cyan-400/40'
                        }`}
                    >
                        <Sparkles className={`w-3 h-3 text-amber-300 ${isAiLoading ? 'animate-spin' : ''}`} />
                        <span>{isAiLoading ? 'Menyusun Outlook...' : aiOutlookText ? 'Perbarui AI 2 Minggu' : 'Sintesis Makro 2 Minggu'}</span>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 custom-scrollbar">
                    {aiOutlookText && (
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/50 via-black to-indigo-950/40 border border-cyan-500/40 space-y-2.5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs font-black text-cyan-200 uppercase tracking-wider">
                                    <Sparkles className="w-4 h-4 text-amber-300" />
                                    <span>Sintesis AI Outlook 2 Minggu (14 Hari)</span>
                                </div>
                                <button
                                    onClick={() => setAiOutlookText(null)}
                                    className="text-[10px] font-mono text-zinc-400 hover:text-white cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                            <div className="text-xs text-zinc-200 leading-relaxed font-mono whitespace-pre-wrap max-h-60 overflow-y-auto bg-black/45 p-3 rounded-xl border border-white/10">
                                {aiOutlookText}
                            </div>
                        </div>
                    )}

                    {/* Theme Card */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0e1525] to-[#080612] border border-cyan-500/25 space-y-1.5">
                        <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-cyan-400">
                            Tema Utama Kalender 14 Hari
                        </div>
                        <div className="text-sm sm:text-base font-black text-white">{report.dominantTheme}</div>
                        <p className="text-xs text-zinc-300 leading-relaxed">{report.macroBiasSummary}</p>
                    </div>

                    {/* Peak Volatility Days */}
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                            <Flame className="w-4 h-4 text-rose-400" />
                            <span>Hari Puncak Volatilitas (2 Minggu ke Depan)</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {report.peakDays.map((day) => (
                                <div key={day.dateKey} className="p-3 rounded-xl bg-white/[0.03] border border-white/10 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-black text-white">{day.label}</span>
                                        <div className="flex items-center gap-1 text-[9px] font-mono font-bold">
                                            {day.highCount > 0 && <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">{day.highCount} High</span>}
                                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-zinc-300">{day.total} Event</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                        {day.currencies.map(c => (
                                            <span key={c} className="px-1.5 py-0.2 rounded bg-cyan-500/10 border border-cyan-500/25 text-[9px] font-mono font-bold text-cyan-300">
                                                {c}
                                            </span>
                                        ))}
                                    </div>
                                    {day.highlightTitles.length > 0 && (
                                        <div className="text-[10px] font-mono text-zinc-400 leading-snug">
                                            {day.highlightTitles.join(' • ')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Currencies + Swing Sector Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                                <Globe className="w-4 h-4 text-cyan-400" />
                                <span>Mata Uang Penggerak 2 Minggu</span>
                            </div>
                            <div className="space-y-1.5">
                                {report.topCurrencies.map((c) => (
                                    <div key={c.currency} className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.08] flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="text-xs font-black text-white">{c.currency}</div>
                                            <div className="text-[9.5px] font-mono text-zinc-400 truncate">
                                                {c.topEvents.length > 0 ? c.topEvents.join(', ') : `${c.total} jadwal rilis ekonomi`}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] font-mono font-bold shrink-0">
                                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">{c.highCount}H</span>
                                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{c.mediumCount}M</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                <span>Radar Swing Sektor (14 Hari)</span>
                            </div>
                            <div className="space-y-1.5">
                                {report.sectorTwoWeekBias.map((sec) => (
                                    <div key={sec.sector} className="px-3 py-2 rounded-xl bg-black/45 border border-white/[0.08] space-y-0.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-black text-white">{sec.name}</span>
                                            <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                                {sec.biasLabel}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 leading-snug">{sec.note}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/25 flex items-start gap-2 text-[10.5px] text-amber-200/90">
                        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                            Untuk analisa detail arah spesifik (<strong>Bullish / Bearish / Spike Lalu Junam / Junam Dulu Baru Spike</strong>) per negara dan hari tertentu, pilih minimal 3 filter (<strong>Jenis News + Tanggal + Negara</strong>) di kalender lalu klik tombol <strong>✨ MENGANALISA DAMPAK NEWS FUNDAMENTAL &gt;</strong>.
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 bg-[#090416] border-t border-cyan-500/20 flex items-center justify-between shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        <span>14-Day Global Macro Radar</span>
                    </span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                        Tutup 2 Minggu
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TwoWeekOutlookModal;
