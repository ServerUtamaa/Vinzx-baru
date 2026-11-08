import React, { useState, useEffect, useMemo } from 'react';
import { getTrueTime } from '../utils/time';
import { 
    Globe, 
    Calendar, 
    Clock, 
    Search, 
    Filter, 
    Flame, 
    AlertTriangle, 
    ChevronDown, 
    ChevronUp, 
    ChevronRight,
    RefreshCw, 
    CheckCircle2, 
    ShieldAlert,
    X,
    Info,
    Sparkles
} from 'lucide-react';
import FundamentalImpactModal from './FundamentalImpactModal';
import { UserSession } from '../types';

export interface CalendarEvent {
    title: string;
    country: string;
    countryCode?: string;
    currency?: string;
    date: string;
    impact: 'High' | 'Medium' | 'Low' | string;
    forecast: string;
    previous: string;
    actual?: string;
    indicator?: string;
    period?: string;
    unit?: string;
    comment?: string;
}

interface FundamentalDataProps {
    onClose: () => void;
    userSession?: UserSession;
    onRequestAuth?: () => void;
}

const COUNTRY_INFO: Record<string, { name: string; flag: string }> = {
    USD: { name: 'Amerika Serikat', flag: '🇺🇸' },
    GBP: { name: 'Inggris Raya', flag: '🇬🇧' },
    EUR: { name: 'Uni Eropa', flag: '🇪🇺' },
    JPY: { name: 'Jepang', flag: '🇯🇵' },
    AUD: { name: 'Australia', flag: '🇦🇺' },
    CAD: { name: 'Kanada', flag: '🇨🇦' },
    CHF: { name: 'Swiss', flag: '🇨🇭' },
    NZD: { name: 'Selandia Baru', flag: '🇳🇿' },
    CNY: { name: 'China', flag: '🇨🇳' },
    IDR: { name: 'Indonesia', flag: '🇮🇩' },
    SGD: { name: 'Singapura', flag: '🇸🇬' },
    HKD: { name: 'Hong Kong', flag: '🇭🇰' },
    KRW: { name: 'Korea Selatan', flag: '🇰🇷' },
    INR: { name: 'India', flag: '🇮🇳' },
    BRL: { name: 'Brasil', flag: '🇧🇷' },
    MXN: { name: 'Meksiko', flag: '🇲🇽' },
    ZAR: { name: 'Afrika Selatan', flag: '🇿🇦' },
    TRY: { name: 'Turki', flag: '🇹🇷' },
    SEK: { name: 'Swedia', flag: '🇸🇪' },
    NOK: { name: 'Norwegia', flag: '🇳🇴' },
    US: { name: 'Amerika Serikat', flag: '🇺🇸' },
    GB: { name: 'Inggris Raya', flag: '🇬🇧' },
    EU: { name: 'Uni Eropa', flag: '🇪🇺' },
    JP: { name: 'Jepang', flag: '🇯🇵' },
    AU: { name: 'Australia', flag: '🇦🇺' },
    CA: { name: 'Kanada', flag: '🇨🇦' },
    CH: { name: 'Swiss', flag: '🇨🇭' },
    NZ: { name: 'Selandia Baru', flag: '🇳🇿' },
    CN: { name: 'China', flag: '🇨🇳' },
};

const normalizeCurrency = (country: string, currency?: string): string => {
    if (currency && currency.trim().length === 3) return currency.trim().toUpperCase();
    const c = (country || '').trim().toUpperCase();
    if (c === 'US') return 'USD';
    if (c === 'GB' || c === 'UK') return 'GBP';
    if (c === 'EU') return 'EUR';
    if (c === 'JP') return 'JPY';
    if (c === 'AU') return 'AUD';
    if (c === 'CA') return 'CAD';
    if (c === 'CH') return 'CHF';
    if (c === 'NZ') return 'NZD';
    if (c === 'CN') return 'CNY';
    if (c === 'ID') return 'IDR';
    return c || 'GLOBAL';
};

// Institutional Forex Factory Standard Impact Classifier
export const classifyForexFactoryImpact = (event: { title?: string; impact?: string; currency?: string; country?: string; importance?: number }): 'High' | 'Medium' | 'Low' => {
    const title = (event.title || '').trim();
    const lower = title.toLowerCase();
    const cur = (event.currency || event.country || '').toUpperCase();
    const rawImportance = typeof event.importance === 'number' ? event.importance : (event.impact === 'High' ? 1 : event.impact === 'Medium' ? 0 : -1);

    // 1. Regional / Sub-state data is strictly Low
    const strictlyLowKeywords = [
        'bavaria', 'hesse', 'saxony', 'brandenburg', 'baden', 'wuerttemberg', 'north rhine', 'westphalia',
        'tokyo', 'mortgage rate', 'rig count', 'money supply', 'm2', 'm3', 'foreign reserves', 'car registration',
        'vehicle sales', 'redbook', 'api crude', 'eia natural gas', 'auction', '10-year note', '30-year bond',
        '2-year note', '5-year note', 'richmond fed', 'dallas fed', 'kansas fed', 'chicagofed', 'ny empire'
    ];
    if (strictlyLowKeywords.some(k => lower.includes(k))) return 'Low';

    // 2. Exact Forex Factory RED FOLDER (HIGH IMPACT)
    const isHigh = (
        lower.includes('interest rate decision') ||
        lower.includes('rate decision') ||
        lower.includes('fomc statement') ||
        lower.includes('fomc press conference') ||
        lower.includes('fed funds rate') ||
        lower.includes('deposit facility rate') ||
        lower.includes('marginal lending rate') ||
        lower.includes('monetary policy statement') ||
        lower.includes('monetary policy report') ||
        lower.includes('rate statement') ||
        lower.includes('official bank rate') ||
        lower.includes('cash rate') ||
        lower.includes('powell speaks') ||
        lower.includes('lagarde speaks') ||
        lower.includes('bailey speaks') ||
        lower.includes('ueda speaks') ||
        lower.includes('bullock speaks') ||
        lower.includes('macklem speaks') ||
        lower.includes('jordan speaks') ||
        lower.includes('non-farm payrolls') ||
        lower.includes('non farm payrolls') ||
        lower.includes('nonfarm payrolls') ||
        (lower.includes('unemployment rate') && !lower.includes('youth') && rawImportance >= 0) ||
        (lower.includes('employment change') && ['CAD', 'AUD', 'NZD', 'USD'].includes(cur)) ||
        (lower.includes('cpi yoy') && !lower.includes('expectation')) ||
        (lower.includes('inflation rate yoy') && !lower.includes('expectation')) ||
        lower.includes('core inflation rate yoy') ||
        lower.includes('core cpi yoy') ||
        lower.includes('cpi trimmed-mean') ||
        lower.includes('cpi median') ||
        lower.includes('cpi common') ||
        (lower.includes('core cpi mom') && cur === 'USD') ||
        (lower.includes('core pce price index') && cur === 'USD') ||
        (lower.includes('harmonised inflation rate yoy') && cur === 'EUR') ||
        ((lower.includes('gdp growth rate') || lower.includes('gdp adv') || lower.includes('gdp prel') || lower.includes('gdp qoq') || lower.includes('gdp annualized')) && rawImportance >= 0) ||
        (lower.includes('retail sales mom') && ['USD', 'GBP', 'CAD', 'AUD'].includes(cur) && !lower.includes('ex autos') && !lower.includes('ex fuel'))
    );
    if (isHigh) return 'High';

    // 3. Exact Forex Factory ORANGE FOLDER (MEDIUM IMPACT)
    const isMedium = (
        lower.includes('pmi') ||
        lower.includes('purchasing managers') ||
        lower.includes('unemployment claims') ||
        lower.includes('initial jobless claims') ||
        lower.includes('jobless claims') ||
        lower.includes('continuing claims') ||
        lower.includes('adp non-farm') ||
        lower.includes('jolts') ||
        lower.includes('average hourly earnings') ||
        lower.includes('average earnings index') ||
        lower.includes('cpi mom') ||
        lower.includes('inflation rate mom') ||
        lower.includes('ppi') ||
        lower.includes('producer price') ||
        lower.includes('pce price index') ||
        lower.includes('retail sales') ||
        lower.includes('consumer confidence') ||
        lower.includes('consumer sentiment') ||
        lower.includes('michigan') ||
        lower.includes('zew') ||
        lower.includes('ifo') ||
        lower.includes('trade balance') ||
        lower.includes('current account') ||
        lower.includes('building permits') ||
        lower.includes('housing starts') ||
        lower.includes('existing home sales') ||
        lower.includes('new home sales') ||
        lower.includes('durable goods') ||
        lower.includes('factory orders') ||
        lower.includes('fomc meeting minutes') ||
        lower.includes('monetary policy meeting minutes') ||
        lower.includes('speaks') ||
        lower.includes('speech') ||
        lower.includes('gdp')
    );
    if (isMedium) return 'Medium';

    if (event.impact === 'High' || rawImportance === 1) return 'High';
    if (event.impact === 'Medium' || rawImportance === 0) return 'Medium';
    return 'Low';
};

const getIndonesianDate = (d: Date) => {
    const days = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const months = [
        'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
        'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    // Convert to WIB (Asia/Jakarta) date object for calendar day accuracy
    const dateInJakarta = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dayName = days[dateInJakarta.getDay()];
    const dateNum = dateInJakarta.getDate();
    const monthName = months[dateInJakarta.getMonth()];
    const year = dateInJakarta.getFullYear();
    const shortDay = dayName.slice(0, 3);
    const shortMonth = monthName.slice(0, 3);
    return { 
        dayName, 
        dateNum, 
        monthName, 
        year, 
        shortDay,
        shortMonth,
        fullLabel: `${dayName}, ${dateNum} ${monthName} ${year}` 
    };
};

const getEventJakartaDateKey = (dateStr: string) => {
    const d = new Date(dateStr);
    const dateInJakarta = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dateInJakarta.getFullYear()}-${pad(dateInJakarta.getMonth() + 1)}-${pad(dateInJakarta.getDate())}`;
};

export const FundamentalData: React.FC<FundamentalDataProps> = ({ onClose, userSession, onRequestAuth }) => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(getTrueTime());

    // Filters
    const [selectedDate, setSelectedDate] = useState<string>('ALL'); // 'ALL' | 'TODAY' | 'TOMORROW' | YYYY-MM-DD
    const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
    const [impactFilter, setImpactFilter] = useState<'ALL' | 'HIGH' | 'HIGH_MEDIUM' | 'MEDIUM' | 'LOW'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedCountries, setCollapsedCountries] = useState<Record<string, boolean>>({});
    const [showLowImpact, setShowLowImpact] = useState(true);
    const [expandedEventKey, setExpandedEventKey] = useState<string | null>(null);
    const [showImpactModal, setShowImpactModal] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Login gatekeeper for Analisa Dampak Pasar
    const isUserLoggedIn = Boolean(userSession?.isLoggedIn && userSession?.username && userSession.username !== 'Vinzx Family');

    const handleOpenImpactModal = () => {
        if (!isUserLoggedIn) {
            if (onRequestAuth) {
                onRequestAuth();
            }
            return;
        }
        setShowImpactModal(true);
    };

    // Live clock
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(getTrueTime()), 1000);
        return () => clearInterval(timer);
    }, []);

    const fetchCalendarData = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            const res = await fetch(`/api/calendar`);
            if (!res.ok) throw new Error('Gagal mengambil data kalender');
            
            const json = await res.json();
            if (!json.result || !Array.isArray(json.result)) throw new Error('Format data tidak valid');
            
            const mappedData: CalendarEvent[] = json.result.map((item: any) => ({
                title: item.title || '',
                country: normalizeCurrency(item.country || '', item.currency || ''),
                countryCode: item.countryCode || item.country || '',
                currency: item.currency || '',
                date: item.date,
                impact: classifyForexFactoryImpact(item),
                forecast: item.forecast || '',
                previous: item.previous || '',
                actual: item.actual || '',
                indicator: item.indicator || '',
                period: item.period || '',
                unit: item.unit || '',
                comment: item.comment || ''
            }));
            
            mappedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setEvents(mappedData);
            setError(null);
        } catch (err: any) {
            console.error('Calendar Fetch Error:', err);
            if (events.length === 0) {
                setError('Gagal memuat data fundamental. Silakan periksa koneksi.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchCalendarData();
        const interval = setInterval(() => fetchCalendarData(), 60000);
        return () => clearInterval(interval);
    }, []);

    // Today & Tomorrow keys (Aligned strictly to Asia/Jakarta WIB)
    const { todayKey, tomorrowKey } = useMemo(() => {
        const nowJakarta = new Date(new Date(currentTime).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const pad = (n: number) => String(n).padStart(2, '0');
        const tKey = `${nowJakarta.getFullYear()}-${pad(nowJakarta.getMonth() + 1)}-${pad(nowJakarta.getDate())}`;
        const tomorrowJakarta = new Date(nowJakarta.getTime() + 86400000);
        const tomKey = `${tomorrowJakarta.getFullYear()}-${pad(tomorrowJakarta.getMonth() + 1)}-${pad(tomorrowJakarta.getDate())}`;
        return { todayKey: tKey, tomorrowKey: tomKey };
    }, [currentTime]);

    // Available Dates Timeline
    const availableDates = useMemo(() => {
        const dateMap = new Map<string, { date: Date; highCount: number; mediumCount: number; lowCount: number; total: number }>();
        events.forEach(e => {
            const d = new Date(e.date);
            const key = getEventJakartaDateKey(e.date);
            
            if (!dateMap.has(key)) {
                dateMap.set(key, { date: d, highCount: 0, mediumCount: 0, lowCount: 0, total: 0 });
            }
            const stat = dateMap.get(key)!;
            stat.total++;
            const imp = e.impact.toLowerCase();
            if (imp === 'high') stat.highCount++;
            else if (imp === 'medium') stat.mediumCount++;
            else stat.lowCount++;
        });

        return Array.from(dateMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([key, stat]) => ({
                key,
                ...stat,
                isToday: key === todayKey,
                isTomorrow: key === tomorrowKey,
                ...getIndonesianDate(stat.date)
            }));
    }, [events, todayKey, tomorrowKey]);

    // Major Currencies & Countries
    const availableCountries = useMemo(() => {
        const set = new Set<string>();
        events.forEach(e => {
            if (e.country) set.add(e.country);
        });
        const list = Array.from(set);
        const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'IDR'];
        return list.sort((a, b) => {
            const idxA = majorCurrencies.indexOf(a);
            const idxB = majorCurrencies.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [events]);

    // Filter events
    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            const eventDateKey = getEventJakartaDateKey(e.date);

            // Date
            if (selectedDate === 'TODAY' && eventDateKey !== todayKey) return false;
            if (selectedDate === 'TOMORROW' && eventDateKey !== tomorrowKey) return false;
            if (selectedDate !== 'ALL' && selectedDate !== 'TODAY' && selectedDate !== 'TOMORROW' && eventDateKey !== selectedDate) {
                return false;
            }

            // Country
            if (selectedCountry !== 'ALL' && e.country !== selectedCountry) {
                return false;
            }

            // Impact
            const imp = e.impact.toLowerCase();
            if (impactFilter === 'HIGH' && imp !== 'high') return false;
            if (impactFilter === 'MEDIUM' && imp !== 'medium') return false;
            if (impactFilter === 'LOW' && imp !== 'low') return false;
            if (impactFilter === 'HIGH_MEDIUM' && imp !== 'high' && imp !== 'medium') return false;
            if (!showLowImpact && imp === 'low' && impactFilter === 'ALL') return false;

            // Search
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchTitle = e.title.toLowerCase().includes(q);
                const matchCountry = e.country.toLowerCase().includes(q);
                const matchIndicator = (e.indicator || '').toLowerCase().includes(q);
                if (!matchTitle && !matchCountry && !matchIndicator) return false;
            }

            return true;
        });
    }, [events, selectedDate, selectedCountry, impactFilter, showLowImpact, searchQuery, todayKey, tomorrowKey]);

    // Hierarchical grouping: Date -> Country -> Impact
    const groupedData = useMemo(() => {
        interface CountryGroup {
            currency: string;
            name: string;
            flag: string;
            high: CalendarEvent[];
            medium: CalendarEvent[];
            low: CalendarEvent[];
            total: number;
        }

        interface DateGroup {
            dateKey: string;
            dateObj: Date;
            isToday: boolean;
            isTomorrow: boolean;
            dateLabel: string;
            totalEvents: number;
            highCount: number;
            mediumCount: number;
            lowCount: number;
            countries: CountryGroup[];
        }

        const dateMap = new Map<string, { dateObj: Date; countriesMap: Map<string, { high: CalendarEvent[]; medium: CalendarEvent[]; low: CalendarEvent[]; total: number }> }>();

        filteredEvents.forEach(e => {
            const d = new Date(e.date);
            const dateKey = getEventJakartaDateKey(e.date);

            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, { dateObj: d, countriesMap: new Map() });
            }
            const dateEntry = dateMap.get(dateKey)!;
            const cur = e.country || 'GLOBAL';

            if (!dateEntry.countriesMap.has(cur)) {
                dateEntry.countriesMap.set(cur, { high: [], medium: [], low: [], total: 0 });
            }
            const group = dateEntry.countriesMap.get(cur)!;
            group.total++;
            const imp = e.impact.toLowerCase();
            if (imp === 'high') group.high.push(e);
            else if (imp === 'medium') group.medium.push(e);
            else group.low.push(e);
        });

        const majorOrder = ['USD', 'GBP', 'EUR', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'CNY', 'IDR'];
        const result: DateGroup[] = [];

        Array.from(dateMap.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .forEach(([dateKey, dateVal]) => {
                const isToday = dateKey === todayKey;
                const isTomorrow = dateKey === tomorrowKey;
                const { fullLabel } = getIndonesianDate(dateVal.dateObj);
                
                let dateLabel = fullLabel;
                if (isToday) dateLabel = `HARI INI • ${fullLabel}`;
                else if (isTomorrow) dateLabel = `BESOK • ${fullLabel}`;

                let totalEvents = 0;
                let highCount = 0;
                let mediumCount = 0;
                let lowCount = 0;

                const countryList: CountryGroup[] = [];

                dateVal.countriesMap.forEach((impacts, currency) => {
                    totalEvents += impacts.total;
                    highCount += impacts.high.length;
                    mediumCount += impacts.medium.length;
                    lowCount += impacts.low.length;

                    const info = COUNTRY_INFO[currency] || { name: currency, flag: '🌐' };

                    countryList.push({
                        currency,
                        name: info.name,
                        flag: info.flag,
                        high: impacts.high,
                        medium: impacts.medium,
                        low: impacts.low,
                        total: impacts.total
                    });
                });

                countryList.sort((a, b) => {
                    const idxA = majorOrder.indexOf(a.currency);
                    const idxB = majorOrder.indexOf(b.currency);
                    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                    if (idxA !== -1) return -1;
                    if (idxB !== -1) return 1;
                    if (b.high.length !== a.high.length) return b.high.length - a.high.length;
                    return a.currency.localeCompare(b.currency);
                });

                result.push({
                    dateKey,
                    dateObj: dateVal.dateObj,
                    isToday,
                    isTomorrow,
                    dateLabel,
                    totalEvents,
                    highCount,
                    mediumCount,
                    lowCount,
                    countries: countryList
                });
            });

        return result;
    }, [filteredEvents, todayKey, tomorrowKey]);

    const toggleCountryCollapse = (key: string) => {
        setCollapsedCountries(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="absolute inset-0 z-[250] bg-[#07030d] flex flex-col text-slate-100 font-sans select-none overflow-hidden animate-in fade-in duration-200">
            {/* 1. TOP HEADER BAR (Compact 46px, Sleek & Non-wrapping) */}
            <div className="h-12 px-3.5 sm:px-5 border-b border-purple-500/20 bg-gradient-to-r from-[#120426] via-black to-[#0d031a] flex items-center justify-between shrink-0 shadow-lg z-30">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-purple-600/30 border border-purple-400/40 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4 text-purple-300" />
                    </div>
                    <div className="flex items-center gap-2 truncate">
                        <h2 className="text-xs sm:text-sm font-black text-white tracking-wider uppercase truncate">
                            Kalender Fundamental
                        </h2>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold shrink-0">
                            2 MINGGU
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleOpenImpactModal}
                        className="h-8 px-3 rounded-xl bg-black/40 backdrop-blur-xl text-white text-[11px] font-black border border-purple-500/40 hover:border-purple-400/80 hover:bg-black/55 flex items-center gap-1.5 shadow-[0_0_16px_rgba(168,85,247,0.3)] transition-all active:scale-95 whitespace-nowrap shrink-0"
                        title="Menganalisa Dampak News Fundamental"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)] animate-pulse" />
                        <span className="hidden sm:inline [text-shadow:0_0_10px_rgba(192,132,252,0.9),0_0_20px_rgba(168,85,247,0.6)]">
                            Menganalisa Dampak News Fundamental
                        </span>
                    </button>
                    <span className="text-[10px] font-mono text-zinc-400 hidden md:inline">
                        {new Date(currentTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                    <button
                        onClick={() => fetchCalendarData(true)}
                        disabled={refreshing}
                        className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-zinc-300 hover:text-white transition-all active:scale-95"
                        title="Perbarui Data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-400' : ''}`} />
                    </button>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/30 flex items-center justify-center text-rose-300 hover:text-white transition-all"
                        aria-label="Tutup"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* 2. INSTITUTIONAL RULE TICKER (Slim Single-Line Alert) */}
            <div className="h-7 px-3 sm:px-5 bg-rose-950/30 border-b border-rose-500/20 flex items-center justify-between text-[10px] text-zinc-300 shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span className="text-rose-400 font-bold uppercase shrink-0">Aturan News:</span>
                    <span className="truncate text-zinc-300">
                        Hindari entry 15m sebelum & 15m sesudah rilis berita <strong className="text-rose-300">HIGH IMPACT</strong>.
                    </span>
                </div>
                <div className="hidden sm:flex items-center gap-2.5 text-[9px] font-mono text-zinc-400 shrink-0 ml-2">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> High</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Med</span>
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span> Low</span>
                </div>
            </div>

            {/* 3. COMPACT CONTROLS & FILTER BAR */}
            <div className="px-3.5 py-2.5 border-b border-white/10 bg-black/70 backdrop-blur-md flex flex-col gap-2 shrink-0 z-20">
                {/* Row A: Search Box + Impact Filter Pills */}
                <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                        <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Cari event (CPI, NFP, Fed, PMI)..."
                            className="w-full h-8 pl-8 pr-7 rounded-lg bg-white/5 border border-white/10 focus:border-purple-400 focus:outline-none text-[11px] text-white placeholder-zinc-500"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar">
                        <button
                            onClick={() => setImpactFilter('ALL')}
                            className={`h-8 px-2 sm:px-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap ${
                                impactFilter === 'ALL'
                                ? 'bg-purple-600 text-white shadow-sm border border-purple-400/50'
                                : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'
                            }`}
                        >
                            SEMUA
                        </button>
                        <button
                            onClick={() => setImpactFilter('HIGH')}
                            className={`h-8 px-2 sm:px-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 ${
                                impactFilter === 'HIGH'
                                ? 'bg-rose-600 text-white border border-rose-400 shadow-sm'
                                : 'bg-rose-950/20 text-rose-300 border border-rose-500/30 hover:bg-rose-900/30'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            HIGH
                        </button>
                        <button
                            onClick={() => setImpactFilter('MEDIUM')}
                            className={`h-8 px-2 sm:px-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 ${
                                impactFilter === 'MEDIUM'
                                ? 'bg-amber-600 text-white border border-amber-400 shadow-sm'
                                : 'bg-amber-950/20 text-amber-300 border border-amber-500/30 hover:bg-amber-900/30'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            MEDIUM
                        </button>
                        <button
                            onClick={() => setImpactFilter('LOW')}
                            className={`h-8 px-2 sm:px-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap flex items-center gap-1 ${
                                impactFilter === 'LOW'
                                ? 'bg-yellow-500 text-black font-extrabold border border-yellow-300 shadow-sm'
                                : 'bg-yellow-950/20 text-yellow-300 border border-yellow-500/20 hover:bg-yellow-900/30'
                            }`}
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            LOW
                        </button>
                    </div>
                </div>

                {/* Row B: Horizontal Timeline / Date Selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <button
                        onClick={() => setSelectedDate('ALL')}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                            selectedDate === 'ALL'
                            ? 'bg-purple-600 text-white border border-purple-400 shadow-sm'
                            : 'bg-white/5 text-zinc-300 border border-white/10 hover:text-white'
                        }`}
                    >
                        <Calendar className="w-3 h-3 text-purple-300" />
                        <span>Semua (14H)</span>
                    </button>

                    <button
                        onClick={() => setSelectedDate('TODAY')}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                            selectedDate === 'TODAY'
                            ? 'bg-rose-600 text-white border border-rose-400 shadow-sm'
                            : 'bg-rose-950/30 text-rose-300 border border-rose-500/30 hover:bg-rose-900/30'
                        }`}
                    >
                        <Flame className="w-3 h-3 text-rose-400" />
                        <span>Hari Ini</span>
                    </button>

                    <button
                        onClick={() => setSelectedDate('TOMORROW')}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all whitespace-nowrap shrink-0 ${
                            selectedDate === 'TOMORROW'
                            ? 'bg-amber-600 text-white border border-amber-400 shadow-sm'
                            : 'bg-amber-950/30 text-amber-300 border border-amber-500/30 hover:bg-amber-900/30'
                        }`}
                    >
                        Besok
                    </button>

                    <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0" />

                    {/* Compact Date Pills */}
                    {availableDates.map((item) => {
                        const isSelected = selectedDate === item.key;
                        return (
                            <button
                                key={item.key}
                                onClick={() => setSelectedDate(item.key)}
                                className={`h-7 px-2 rounded-lg text-[10px] font-mono tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                                    isSelected
                                    ? 'bg-purple-600 text-white border border-purple-400 shadow-sm font-bold'
                                    : 'bg-white/5 text-zinc-400 border border-white/5 hover:text-zinc-200 hover:border-white/20'
                                }`}
                            >
                                <span>{item.shortDay} {item.dateNum}</span>
                                {item.highCount > 0 && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 shadow-[0_0_4px_#f43f5e]" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Row C: Country Selector Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider shrink-0 mr-0.5">
                        Negara:
                    </span>
                    <button
                        onClick={() => setSelectedCountry('ALL')}
                        className={`h-6.5 px-2 rounded-md text-[10px] font-bold tracking-wider transition-all whitespace-nowrap shrink-0 ${
                            selectedCountry === 'ALL'
                            ? 'bg-purple-600 text-white border border-purple-400'
                            : 'bg-white/5 text-zinc-400 border border-white/10 hover:text-white'
                        }`}
                    >
                        SEMUA
                    </button>
                    {availableCountries.map((c) => {
                        const info = COUNTRY_INFO[c] || { name: c, flag: '🌐' };
                        const isSelected = selectedCountry === c;
                        return (
                            <button
                                key={c}
                                onClick={() => setSelectedCountry(c)}
                                className={`h-6.5 px-2 rounded-md text-[10px] font-bold tracking-wider transition-all whitespace-nowrap shrink-0 flex items-center gap-1 ${
                                    isSelected
                                    ? 'bg-purple-600 text-white border border-purple-400'
                                    : 'bg-white/5 text-zinc-300 border border-white/10 hover:border-purple-500/30 hover:text-white'
                                }`}
                            >
                                <span>{info.flag}</span>
                                <span>{c}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 4. MAIN BODY (Grouped: Date -> Country -> High/Medium/Low Impact) */}
            <div 
                onScroll={(e) => {
                    const top = e.currentTarget.scrollTop;
                    if (top > 40 && !isScrolled) setIsScrolled(true);
                    else if (top <= 40 && isScrolled) setIsScrolled(false);
                }}
                className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-6 custom-scrollbar"
            >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 space-y-3">
                        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                            Memuat Data Fundamental 2 Minggu...
                        </span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center max-w-sm mx-auto p-5 bg-rose-950/20 border border-rose-500/30 rounded-2xl space-y-2">
                        <AlertTriangle className="w-8 h-8 text-rose-400" />
                        <span className="text-xs font-bold text-white">{error}</span>
                        <button
                            onClick={() => fetchCalendarData(true)}
                            className="px-4 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-500 transition-all"
                        >
                            Coba Lagi
                        </button>
                    </div>
                ) : groupedData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-2 text-zinc-500">
                        <Calendar className="w-10 h-10 opacity-40 mx-auto" />
                        <p className="text-xs font-bold text-zinc-300">Tidak ada berita yang sesuai dengan filter.</p>
                        <button
                            onClick={() => {
                                setSelectedDate('ALL');
                                setSelectedCountry('ALL');
                                setImpactFilter('ALL');
                                setSearchQuery('');
                            }}
                            className="px-3 py-1 bg-purple-600/30 border border-purple-500/40 text-purple-300 text-[11px] font-bold rounded-lg hover:bg-purple-600 hover:text-white transition-all"
                        >
                            Reset Filter
                        </button>
                    </div>
                ) : (
                    groupedData.map((dateGroup) => (
                        <div key={dateGroup.dateKey} className="space-y-4">
                            {/* DATE DIVIDER BANNER */}
                            <div className="sticky top-0 z-10 -mx-1 px-3 py-2 rounded-xl bg-[#110522]/90 backdrop-blur-md border border-purple-500/30 shadow-md flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 truncate">
                                    <Calendar className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider truncate">
                                        {dateGroup.dateLabel}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                                    {dateGroup.highCount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                                            🔴 {dateGroup.highCount}
                                        </span>
                                    )}
                                    {dateGroup.mediumCount > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                                            🟠 {dateGroup.mediumCount}
                                        </span>
                                    )}
                                    <span className="text-zinc-500">
                                        ({dateGroup.totalEvents} event)
                                    </span>
                                </div>
                            </div>

                            {/* COUNTRY CARDS UNDER THIS DATE */}
                            <div className="space-y-4">
                                {dateGroup.countries.map((countryItem) => {
                                    const collapseKey = `${dateGroup.dateKey}_${countryItem.currency}`;
                                    const isCollapsed = collapsedCountries[collapseKey] || false;
                                    const totalHigh = countryItem.high.length;
                                    const totalMed = countryItem.medium.length;
                                    const totalLow = countryItem.low.length;

                                    return (
                                        <div
                                            key={countryItem.currency}
                                            className="rounded-2xl border border-white/10 bg-[#0d041a]/80 backdrop-blur-md overflow-hidden shadow-lg transition-all"
                                        >
                                            {/* COUNTRY HEADER */}
                                            <div 
                                                onClick={() => toggleCountryCollapse(collapseKey)}
                                                className="px-4 py-2.5 bg-gradient-to-r from-purple-950/40 via-black/40 to-transparent border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-lg leading-none">{countryItem.flag}</span>
                                                    <div className="flex items-baseline gap-1.5">
                                                        <span className="text-xs sm:text-sm font-black text-white tracking-wider">
                                                            {countryItem.currency}
                                                        </span>
                                                        <span className="text-[11px] text-zinc-400 font-medium hidden xs:inline">
                                                            • {countryItem.name}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    {totalHigh > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold font-mono">
                                                            🔴 {totalHigh} High
                                                        </span>
                                                    )}
                                                    {totalMed > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold font-mono">
                                                            🟠 {totalMed} Med
                                                        </span>
                                                    )}
                                                    {totalLow > 0 && (
                                                        <span className="px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-300 border border-yellow-400/20 text-[9px] font-bold font-mono">
                                                            🟡 {totalLow} Low
                                                        </span>
                                                    )}
                                                    <button className="w-5 h-5 rounded flex items-center justify-center text-zinc-400 ml-1">
                                                        {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* COUNTRY CONTENT: HIGH -> MEDIUM -> LOW SECTIONS */}
                                            {!isCollapsed && (
                                                <div className="p-3 sm:p-4 space-y-4">
                                                    {/* HIGH IMPACT */}
                                                    {(impactFilter === 'ALL' || impactFilter === 'HIGH' || impactFilter === 'HIGH_MEDIUM') && totalHigh > 0 && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between pb-1 border-b border-rose-500/20">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                                                    <span className="text-[11px] font-black text-rose-300 uppercase tracking-wider">
                                                                        High Impact ({totalHigh})
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-mono text-rose-400/80">Volatilitas Tinggi</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {countryItem.high.map((ev, idx) => (
                                                                    <CompactEventCard 
                                                                        key={`high_${idx}`}
                                                                        event={ev} 
                                                                        currentTime={currentTime}
                                                                        isExpanded={expandedEventKey === `high_${idx}_${ev.title}`}
                                                                        onToggle={() => setExpandedEventKey(expandedEventKey === `high_${idx}_${ev.title}` ? null : `high_${idx}_${ev.title}`)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* MEDIUM IMPACT */}
                                                    {(impactFilter === 'ALL' || impactFilter === 'MEDIUM' || impactFilter === 'HIGH_MEDIUM') && totalMed > 0 && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between pb-1 border-b border-amber-500/20">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                                    <span className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                                                                        Medium Impact ({totalMed})
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-mono text-amber-400/80">Volatilitas Menengah</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {countryItem.medium.map((ev, idx) => (
                                                                    <CompactEventCard 
                                                                        key={`med_${idx}`}
                                                                        event={ev} 
                                                                        currentTime={currentTime}
                                                                        isExpanded={expandedEventKey === `med_${idx}_${ev.title}`}
                                                                        onToggle={() => setExpandedEventKey(expandedEventKey === `med_${idx}_${ev.title}` ? null : `med_${idx}_${ev.title}`)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* LOW IMPACT */}
                                                    {(impactFilter === 'ALL' || impactFilter === 'LOW') && totalLow > 0 && (
                                                        <div className="space-y-2">
                                                            <div className="flex items-center justify-between pb-1 border-b border-yellow-500/20">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                                                    <span className="text-[11px] font-black text-yellow-300 uppercase tracking-wider">
                                                                        Low Impact ({totalLow})
                                                                    </span>
                                                                </div>
                                                                <span className="text-[9px] font-mono text-yellow-400/70">Volatilitas Rendah</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {countryItem.low.map((ev, idx) => (
                                                                    <CompactEventCard 
                                                                        key={`low_${idx}`}
                                                                        event={ev} 
                                                                        currentTime={currentTime}
                                                                        isExpanded={expandedEventKey === `low_${idx}_${ev.title}`}
                                                                        onToggle={() => setExpandedEventKey(expandedEventKey === `low_${idx}_${ev.title}` ? null : `low_${idx}_${ev.title}`)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* FLOATING TRANSLUCENT HORIZONTAL BUTTON */}
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[94%] transition-all duration-300 ease-out">
                <button
                    onClick={handleOpenImpactModal}
                    className="group relative flex flex-row items-center gap-2.5 sm:gap-3.5 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-black/35 backdrop-blur-xl border border-purple-500/40 hover:border-purple-400/80 hover:bg-black/45 text-white shadow-[0_8px_32px_rgba(147,51,234,0.3)] hover:shadow-[0_8px_40px_rgba(168,85,247,0.55)] transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                    title="Menganalisa Dampak News Fundamental"
                >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-500/20 border border-purple-400/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(168,85,247,0.6)]">
                        <Sparkles className="w-3.5 h-3.5 text-purple-300 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)] animate-pulse" />
                    </div>

                    <span className="text-[11px] sm:text-xs md:text-sm font-black tracking-wider uppercase text-white whitespace-nowrap shrink-0 [text-shadow:0_0_12px_rgba(192,132,252,0.9),0_0_24px_rgba(168,85,247,0.6)]">
                        Menganalisa Dampak News Fundamental
                    </span>

                    <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-[9px] font-mono text-purple-200 font-bold uppercase tracking-wider shrink-0">
                        Live
                    </span>

                    <div className="w-5 h-5 rounded-full bg-purple-500/20 border border-purple-400/30 flex items-center justify-center shrink-0 group-hover:bg-purple-500/40 group-hover:border-purple-400/60 transition-all">
                        <ChevronRight className="w-3.5 h-3.5 text-purple-300 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                </button>
            </div>

            {/* IMPACT PROJECTION MODAL */}
            <FundamentalImpactModal
                isOpen={showImpactModal}
                onClose={() => setShowImpactModal(false)}
                events={events}
                todayKey={todayKey}
                availableDates={availableDates}
                userSession={userSession}
                onRequestAuth={onRequestAuth}
            />
        </div>
    );
};

// Compact Event Card
interface CompactEventCardProps {
    event: CalendarEvent;
    currentTime: number;
    isExpanded: boolean;
    onToggle: () => void;
}

const CompactEventCard: React.FC<CompactEventCardProps> = ({ event, currentTime, isExpanded, onToggle }) => {
    const eventDate = new Date(event.date);
    const eventTime = eventDate.getTime();
    
    // Status Timing Logic:
    // 1. SEDANG BERJALAN: 5 menit sebelum rilis hingga 15 menit setelah rilis (jendela volatilitas aktif)
    // 2. SELESAI: lebih dari 15 menit setelah rilis
    // 3. BELUM BERJALAN: sebelum jendela aktif rilis
    const isOngoing = currentTime >= (eventTime - 5 * 60 * 1000) && currentTime <= (eventTime + 15 * 60 * 1000);
    const isPast = currentTime > (eventTime + 15 * 60 * 1000);
    const diff = eventTime - currentTime;
    
    let statusText = null;
    if (isOngoing) {
        statusText = (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400 text-rose-300 text-[9px] font-mono font-black animate-pulse flex items-center gap-1 shadow-[0_0_8px_rgba(244,63,94,0.4)]">
                <Flame className="w-2.5 h-2.5 text-rose-400" />
                SEDANG BERJALAN
            </span>
        );
    } else if (isPast) {
        statusText = (
            <span className="text-[9px] font-mono text-zinc-500 flex items-center gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500/70" /> Selesai
            </span>
        );
    } else if (diff > 0 && diff <= 24 * 60 * 60 * 1000) {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        statusText = (
            <span className="text-[9px] font-mono text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-500/20">
                {h > 0 ? `Dlm ${h}j ${m}m` : `${m}m lagi`}
            </span>
        );
    } else {
        statusText = (
            <span className="text-[9px] font-mono text-zinc-500 bg-white/5 px-1.5 py-0.5 rounded">
                Belum Berjalan
            </span>
        );
    }

    const imp = event.impact.toLowerCase();
    const cardBorder = 
        isOngoing
            ? 'border-rose-400 bg-gradient-to-r from-rose-950/30 via-purple-950/20 to-black shadow-[0_0_12px_rgba(244,63,94,0.3)]'
            : imp === 'high' 
            ? 'border-rose-500/30 bg-rose-950/10 hover:border-rose-400/50' 
            : imp === 'medium'
            ? 'border-amber-500/25 bg-amber-950/10 hover:border-amber-400/50'
            : 'border-white/5 bg-black/30 hover:border-white/20';

    // Format WIB (Asia/Jakarta)
    const timeFormatted = eventDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
    }) + ' WIB';

    return (
        <div 
            onClick={onToggle}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer ${cardBorder} ${isPast ? 'opacity-65' : 'hover:scale-[1.005]'}`}
        >
            {/* Header: Time, Currency & Status */}
            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-black/60 border border-white/10 text-[10px] font-mono font-bold text-zinc-200">
                        {timeFormatted}
                    </span>
                    <span className="text-[10px] font-bold text-purple-300">
                        {event.country}
                    </span>
                    {event.period && (
                        <span className="text-[8px] font-mono text-zinc-500 bg-white/5 px-1 rounded">
                            {event.period}
                        </span>
                    )}
                </div>

                {statusText}
            </div>

            {/* Title */}
            <div className="mb-2">
                <h5 className="text-[11px] font-bold text-zinc-200 leading-tight">
                    {event.title}
                </h5>
                {event.indicator && event.indicator !== event.title && (
                    <span className="text-[9px] text-zinc-500 font-mono block mt-0.5 truncate">
                        {event.indicator}
                    </span>
                )}
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-3 gap-1 px-2 py-1 rounded-lg bg-black/40 border border-white/5 text-center">
                <div>
                    <span className="text-[7.5px] font-mono text-zinc-500 uppercase block">Aktual</span>
                    <span className={`text-[10px] font-mono font-bold ${event.actual ? 'text-white' : 'text-zinc-600'}`}>
                        {event.actual || '-'}
                    </span>
                </div>
                <div className="border-x border-white/5">
                    <span className="text-[7.5px] font-mono text-zinc-500 uppercase block">Prediksi</span>
                    <span className="text-[10px] font-mono text-zinc-300">
                        {event.forecast || '-'}
                    </span>
                </div>
                <div>
                    <span className="text-[7.5px] font-mono text-zinc-500 uppercase block">Sblm</span>
                    <span className="text-[10px] font-mono text-zinc-400">
                        {event.previous || '-'}
                    </span>
                </div>
            </div>

            {/* Explanation Drawer */}
            {isExpanded && event.comment && (
                <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-zinc-300 bg-purple-950/20 p-2 rounded-lg border border-purple-500/20">
                    <p className="leading-relaxed text-zinc-300">
                        {event.comment}
                    </p>
                </div>
            )}
        </div>
    );
};

export default FundamentalData;
