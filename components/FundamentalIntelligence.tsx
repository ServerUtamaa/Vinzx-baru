
import React, { useState, useEffect } from 'react';
import { CalendarEvent, fundamentalService } from '../services/fundamentalIntelligenceService';
import { FundamentalAnalysisResult, UserSession } from '../types';
import { getTrueTime } from '../utils/time';

interface FundamentalIntelligenceProps {
    onClose: () => void;
    userSession: UserSession;
}

const FundamentalIntelligence: React.FC<FundamentalIntelligenceProps> = ({ onClose, userSession }) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzingEventId, setAnalyzingEventId] = useState<number | null>(null);
    const [analysisResult, setAnalysisResult] = useState<FundamentalAnalysisResult | null>(null);
    const [currentTime, setCurrentTime] = useState(getTrueTime());
    const [filter, setFilter] = useState<'TODAY' | 'NEXT_24H' | 'NEXT_7D'>('TODAY');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(getTrueTime()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadEvents = async () => {
            setLoading(true);
            const data = await fundamentalService.fetchCalendarEvents();
            setEvents(data);
            setLoading(false);
        };
        loadEvents();
    }, []);

    const handleAnalyze = async (event: CalendarEvent, idx: number) => {
        if (analyzingEventId !== null) return;
        setAnalyzingEventId(idx);
        setAnalysisResult(null);

        try {
            const result = await fundamentalService.analyzeEvent(event, events, userSession.username);
            setAnalysisResult(result);
        } catch (error) {
            console.error('Analysis failed:', error);
            alert('Gagal melakukan analisa fundamental. Silakan coba lagi.');
        } finally {
            setAnalyzingEventId(null);
        }
    };

    const getFilteredEvents = () => {
        const now = new Date(currentTime);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        return events.filter(e => {
            const eDate = new Date(e.date);
            if (filter === 'TODAY') return eDate.toDateString() === now.toDateString();
            if (filter === 'NEXT_24H') return eDate >= now && eDate <= tomorrow;
            if (filter === 'NEXT_7D') return eDate >= now && eDate <= next7Days;
            return true;
        });
    };

    const filteredEvents = getFilteredEvents();

    const getImpactStyle = (impact: string) => {
        switch (impact.toLowerCase()) {
            case 'high': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
            case 'medium': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'low': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
            default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-3xl flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
            {/* GLASS HEADER */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-emerald-950/20 via-black to-purple-950/20 relative">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-50"></div>
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(16,185,129,0.5)]">
                        <span className="text-xl">🧬</span>
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">
                            Fundamental <span className="text-emerald-400">Intelligence</span>
                        </h1>
                        <p className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">Vinzx Engine v.2.0 • Data Real-time</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 transition-all duration-300"
                >
                    ✕
                </button>
            </div>

            {/* TAB SELECTOR (GEN Z STYLE) */}
            <div className="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar bg-black/40 border-b border-white/5">
                {[
                    { id: 'TODAY', label: 'Hari Ini', emoji: '📅' },
                    { id: 'NEXT_24H', label: '24 Jam Ke Depan', emoji: '⏳' },
                    { id: 'NEXT_7D', label: '7 Hari Ke Depan', emoji: '🚀' }
                ].map((t) => (
                    <button
                        key={t.id}
                        onClick={() => { setFilter(t.id as any); setAnalysisResult(null); }}
                        className={`px-5 py-2.5 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all duration-300 flex items-center gap-2 whitespace-nowrap border ${
                            filter === t.id 
                            ? 'bg-emerald-500 text-black shadow-[0_0_25px_-5px_rgba(16,185,129,0.6)] border-emerald-400' 
                            : 'bg-white/5 text-zinc-500 border-white/10 hover:bg-white/10 hover:text-zinc-300'
                        }`}
                    >
                        <span>{t.emoji}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* NEWS LIST SIDEBAR */}
                <div className="w-full lg:w-96 border-r border-white/5 overflow-y-auto custom-scrollbar bg-zinc-950/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-mono text-emerald-500/60 animate-pulse tracking-widest uppercase">Syncing with World Calendar...</span>
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-zinc-700 opacity-50 italic space-y-3">
                            <span className="text-4xl">📭</span>
                            <span className="text-xs font-mono tracking-widest">NO DATA FOR THIS RANGE</span>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {filteredEvents.map((event, idx) => {
                                const isAnalyzing = analyzingEventId === idx;
                                const isPast = new Date(event.date).getTime() < currentTime;
                                
                                return (
                                    <div 
                                        key={idx}
                                        className={`group relative p-4 rounded-3xl border transition-all duration-500 overflow-hidden ${
                                            isAnalyzing 
                                            ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/20' 
                                            : 'bg-zinc-900/40 border-white/5 hover:border-white/20'
                                        } ${isPast ? 'opacity-50 grayscale' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-black text-white bg-white/10 px-2 py-0.5 rounded-lg tracking-widest uppercase">
                                                        {event.country}
                                                    </span>
                                                    <div className={`px-2 py-0.5 rounded-lg text-[8px] font-bold border uppercase ${getImpactStyle(event.impact)}`}>
                                                        {event.impact}
                                                    </div>
                                                </div>
                                                <h3 className="text-xs font-bold text-zinc-200 line-clamp-2 leading-relaxed">
                                                    {event.title}
                                                </h3>
                                            </div>
                                            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-xl">
                                                {new Date(event.date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between mt-4">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">Forecast</span>
                                                    <span className="text-[10px] font-mono text-zinc-400">{event.forecast || '-'}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">Previous</span>
                                                    <span className="text-[10px] font-mono text-zinc-400">{event.previous || '-'}</span>
                                                </div>
                                            </div>
                                            
                                            <button
                                                onClick={() => handleAnalyze(event, idx)}
                                                disabled={analyzingEventId !== null || isPast}
                                                className={`px-4 py-2 rounded-2xl text-[9px] font-black tracking-widest uppercase transition-all duration-300 ${
                                                    isAnalyzing
                                                    ? 'bg-emerald-500 text-black animate-pulse'
                                                    : isPast 
                                                        ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                                        : 'bg-white text-black hover:bg-emerald-400 hover:scale-105 active:scale-95 shadow-lg shadow-black/50'
                                                }`}
                                            >
                                                {isAnalyzing ? 'Analyzing...' : isPast ? 'Completed' : 'Analyze Now'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* ANALYSIS RESULTS VIEW */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-black relative">
                    {!analysisResult ? (
                        <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-6">
                            {analyzingEventId !== null ? (
                                <>
                                    <div className="relative">
                                        <div className="w-24 h-24 border-b-2 border-emerald-500 rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center text-4xl">🧠</div>
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">AI Thinking...</h2>
                                        <p className="text-xs text-zinc-500 font-mono max-w-xs leading-relaxed">
                                            Vinzx Intelligence is processing economic clusters, central bank sentiment, and asset correlations.
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-32 h-32 rounded-full bg-zinc-900 flex items-center justify-center text-6xl opacity-20">
                                        📊
                                    </div>
                                    <div className="space-y-2">
                                        <h2 className="text-xl font-black text-zinc-700 italic uppercase tracking-tighter">Intelligence Ready</h2>
                                        <p className="text-xs text-zinc-600 font-mono max-w-xs leading-relaxed">
                                            Select an economic event from the left to start full-spectrum fundamental analysis.
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="p-6 lg:p-10 animate-in fade-in slide-in-from-right-10 duration-500 max-w-4xl mx-auto space-y-10 pb-24">
                            {/* TOP HEADER RESULT */}
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-10">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black rounded-full border border-emerald-500/30 uppercase tracking-widest">
                                            {analysisResult.currency} FUNDAMENTAL REPORT
                                        </span>
                                        <span className="text-[10px] font-mono text-zinc-500">{analysisResult.date} • {analysisResult.time}</span>
                                    </div>
                                    <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter leading-none italic uppercase">
                                        {analysisResult.event}
                                    </h1>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-mono text-zinc-500 uppercase mb-2 tracking-widest">Confidence Score</span>
                                    <div className={`text-2xl font-black italic border-b-4 ${
                                        analysisResult.analysis.confidence === 'HIGH' ? 'text-emerald-400 border-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' :
                                        analysisResult.analysis.confidence === 'MEDIUM' ? 'text-orange-400 border-orange-400 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 
                                        'text-rose-400 border-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                    }`}>
                                        {analysisResult.analysis.confidence}
                                    </div>
                                </div>
                            </div>

                            {/* CORE DATA GRID */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Direction', value: analysisResult.analysis.direction, sub: `Strength: ${analysisResult.analysis.strength}/100` },
                                    { label: 'Pressure', value: `${analysisResult.analysis.currencyPressure > 0 ? '+' : ''}${analysisResult.analysis.currencyPressure}`, sub: 'Normalized units' },
                                    { label: 'Reaction', value: analysisResult.reaction.type, sub: analysisResult.reaction.expectedVolatility + ' Volatility' },
                                    { label: 'Countdown', value: analysisResult.timeUntilNews, sub: 'Until Release' }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-3xl bg-zinc-900/50 border border-white/5 flex flex-col justify-center items-center text-center">
                                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-1">{item.label}</span>
                                        <span className="text-lg font-black text-white tracking-tighter uppercase italic">{item.value}</span>
                                        <span className="text-[9px] font-mono text-emerald-400/60 mt-1">{item.sub}</span>
                                    </div>
                                ))}
                            </div>

                            {/* REACTION PROBABILITIES (GEN Z PILLS) */}
                            <div className="p-8 rounded-[3rem] bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-white/5 space-y-8">
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                    <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.4em]">Market Character Probabilities</h3>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Real-time Simulation</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                                    {[
                                        { label: 'FLY / TREND', value: analysisResult.reaction.probabilities.fly, color: 'emerald' },
                                        { label: 'SPIKE / REVERSAL', value: analysisResult.reaction.probabilities.spike, color: 'rose' },
                                        { label: 'TWO-WAY / VOLA', value: analysisResult.reaction.probabilities.twoWay, color: 'orange' },
                                        { label: 'NEUTRAL / RANGING', value: analysisResult.reaction.probabilities.neutral, color: 'zinc' }
                                    ].map((prob, i) => (
                                        <div key={i} className="space-y-3">
                                            <div className="flex justify-between items-end">
                                                <span className="text-[9px] font-black text-zinc-500 tracking-tighter uppercase">{prob.label}</span>
                                                <span className={`text-sm font-black text-${prob.color}-400 italic`}>{Math.round(prob.value)}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full bg-${prob.color}-500 rounded-full transition-all duration-1000 delay-${i * 100}`} 
                                                    style={{ width: `${prob.value}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* SURPRISE & DATA SECTION */}
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <div className="w-1 h-3 bg-emerald-500"></div> NEWS RAW DATA
                                    </h3>
                                    <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black border border-white/10 space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Actual Result</span>
                                                <div className="text-xl font-mono font-bold text-white">{analysisResult.newsData.actual}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Surprise Delta</span>
                                                <div className={`text-xl font-mono font-bold ${
                                                    analysisResult.newsData.surprise.includes('-') ? 'text-rose-400' : 
                                                    analysisResult.newsData.surprise === '0' ? 'text-zinc-400' : 'text-emerald-400'
                                                }`}>
                                                    {analysisResult.newsData.surprise}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-[1px] bg-white/5"></div>
                                        <div className="grid grid-cols-3 gap-4 opacity-70">
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase">Forecast</span>
                                                <div className="text-xs font-mono text-zinc-300">{analysisResult.newsData.forecast}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase">Previous</span>
                                                <div className="text-xs font-mono text-zinc-300">{analysisResult.newsData.previous}</div>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase">Revised</span>
                                                <div className="text-xs font-mono text-zinc-300">{analysisResult.newsData.revised}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <div className="w-1 h-3 bg-purple-500"></div> ASSET IMPACT MATRIX
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {Object.entries(analysisResult.assetImpact).map(([asset, impact], i) => (
                                            <div key={i} className="p-3 rounded-2xl bg-zinc-900/30 border border-white/5 flex items-center justify-between">
                                                <span className="text-[10px] font-black text-zinc-300 tracking-tighter">{asset}</span>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border italic ${
                                                    impact === 'BULLISH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                                    impact === 'BEARISH' ? 'text-rose-400 bg-rose-500/10 border-rose-500/20' :
                                                    impact === 'NEUTRAL' ? 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20' :
                                                    'text-orange-400 bg-orange-500/10 border-orange-500/20'
                                                }`}>
                                                    {impact}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* NEWS CLUSTER SECTION */}
                            {analysisResult.cluster && analysisResult.cluster.relatedNews.length > 0 && (
                                <div className="space-y-6">
                                    <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                        <div className="w-1 h-3 bg-blue-400"></div> NEWS CLUSTER INTELLIGENCE
                                    </h3>
                                    <div className="p-6 rounded-[2.5rem] bg-blue-500/5 border border-blue-500/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Cluster Impact</span>
                                                <div className="h-2 w-24 bg-zinc-900 rounded-full overflow-hidden">
                                                    <div className="h-full bg-blue-500" style={{ width: `${analysisResult.cluster.impact}%` }}></div>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                                                analysisResult.cluster.conflict === 'HIGH' ? 'text-rose-400 border-rose-500/20 bg-rose-500/5' :
                                                analysisResult.cluster.conflict === 'MEDIUM' ? 'text-orange-400 border-orange-500/20 bg-orange-500/5' :
                                                'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                                            }`}>
                                                CONFLICT: {analysisResult.cluster.conflict}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {analysisResult.cluster.relatedNews.map((news, i) => (
                                                <span key={i} className="text-[9px] font-medium text-zinc-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
                                                    {news}
                                                </span>
                                            ))}
                                        </div>
                                        <p className="text-[10px] font-mono text-blue-400/80 italic">
                                            Combined pressure suggests a {analysisResult.cluster.direction} bias within the cluster window.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* EXPECTED RANGES */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <div className="w-1 h-3 bg-blue-500"></div> ESTIMATED PRICE VOLATILITY RANGE
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { icon: '💱', label: 'FOREX (PIPS)', value: analysisResult.expectedRange.forex, color: 'from-blue-500/20' },
                                        { icon: '🟡', label: 'GOLD (USD)', value: analysisResult.expectedRange.gold, color: 'from-yellow-500/20' },
                                        { icon: '🛢️', label: 'OIL (USD)', value: analysisResult.expectedRange.oil, color: 'from-zinc-500/20' },
                                        { icon: '₿', label: 'CRYPTO (%)', value: analysisResult.expectedRange.crypto, color: 'from-orange-500/20' }
                                    ].map((item, i) => (
                                        <div key={i} className={`p-5 rounded-[2rem] bg-gradient-to-br ${item.color} to-zinc-900 border border-white/5 relative overflow-hidden`}>
                                            <div className="absolute top-4 right-4 text-xl opacity-20">{item.icon}</div>
                                            <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">{item.label}</span>
                                            <div className="text-xl font-black text-white mt-2 italic tracking-tighter">{item.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* RISK ASSESSMENT */}
                            <div className="space-y-6">
                                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                    <div className="w-1 h-3 bg-rose-500"></div> RISK & EXECUTION ADVISORY
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-1 space-y-3">
                                        {Object.entries(analysisResult.risk).map(([key, val], i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-950/50 border border-white/5">
                                                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border ${
                                                    val === 'LOW' ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' :
                                                    val === 'MEDIUM' ? 'text-orange-400 border-orange-500/20 bg-orange-500/5' :
                                                    'text-rose-400 border-rose-500/20 bg-rose-500/5'
                                                }`}>
                                                    {val}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="md:col-span-2 p-6 rounded-3xl bg-zinc-900/20 border border-white/5 flex flex-col justify-between">
                                        <div className="space-y-4">
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Strategic Insights
                                            </span>
                                            <ul className="space-y-3">
                                                {analysisResult.finalStatus.reasons.map((reason, i) => (
                                                    <li key={i} className="flex items-start gap-3 text-xs text-zinc-300 leading-relaxed font-medium">
                                                        <span className="text-emerald-500 mt-1">•</span>
                                                        {reason}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Macro Bias</span>
                                                <span className="text-sm font-black text-white italic uppercase tracking-tighter">{analysisResult.finalStatus.bias}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Volatility Expectation</span>
                                                <span className="text-sm font-black text-emerald-400 italic uppercase tracking-tighter">{analysisResult.finalStatus.expectedVolatility}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* FOOTER NAV / STATUS */}
            <div className="h-10 border-t border-white/10 bg-black/80 px-6 flex items-center justify-between backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">Server Connection: Optimal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                        <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest">AI Engine: VINZX Thinking v.11</span>
                    </div>
                </div>
                <span className="text-[8px] font-mono text-zinc-600 uppercase tracking-[0.3em]">Precision Fundamental Analysis • © 2026</span>
            </div>
        </div>
    );
};

export default FundamentalIntelligence;
