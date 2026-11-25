import type { CalendarEvent } from '../components/FundamentalData';

export type MarketSector = 'CRYPTO' | 'XAUUSD' | 'COMMODITY' | 'FOREX';
export type DirectionalOutcome = 'BULLISH' | 'BEARISH' | 'SPIKE_THEN_DUMP' | 'DUMP_THEN_SPIKE';
export type ImpactFilterMode = 'ALL' | 'HIGH' | 'HIGH_MEDIUM' | 'MEDIUM' | 'LOW';

export interface AnalyzedEventItem {
    event: CalendarEvent;
    status: 'ONGOING' | 'UPCOMING' | 'COMPLETED';
    timeWib: string;
    numericActual: number | null;
    numericForecast: number | null;
    numericPrevious: number | null;
    currencyDirection: 'BULLISH_CCY' | 'BEARISH_CCY' | 'NEUTRAL';
    directionReason: string;
    weight: number;
}

export interface SectorDeepAnalysis {
    sector: MarketSector;
    name: string;
    icon: string;
    outcome: DirectionalOutcome;
    outcomeLabel: string;
    dominancePct: number;
    volatilityLevel: 'EKSTRIM' | 'TINGGI' | 'MODERAT';
    strongestInOneTime: string;
    summary: string;
    primaryRationale: string;
    sequenceDetail: string;
    actionablePlaybook: string;
    affectedPairs: string[];
}

export interface FilteredNewsAnalysisReport {
    totalMatched: number;
    ongoingCount: number;
    upcomingCount: number;
    completedCount: number;
    focusStatusLabel: string;
    analyzedEvents: AnalyzedEventItem[];
    dominantCatalyst: AnalyzedEventItem | null;
    conflictDetected: boolean;
    conflictSummary: string;
    sectors: Record<MarketSector, SectorDeepAnalysis>;
}

export interface TwoWeekCountryStat {
    currency: string;
    total: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    topEvents: string[];
}

export interface TwoWeekPeakDayStat {
    dateKey: string;
    label: string;
    highCount: number;
    mediumCount: number;
    total: number;
    currencies: string[];
    highlightTitles: string[];
}

export interface TwoWeekMacroReport {
    totalEvents: number;
    totalHigh: number;
    totalMedium: number;
    totalLow: number;
    topCurrencies: TwoWeekCountryStat[];
    peakDays: TwoWeekPeakDayStat[];
    dominantTheme: string;
    macroBiasSummary: string;
    sectorTwoWeekBias: {
        sector: MarketSector;
        name: string;
        biasLabel: string;
        note: string;
    }[];
}

export function getJakartaDateKey(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const dateInJakarta = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${dateInJakarta.getFullYear()}-${pad(dateInJakarta.getMonth() + 1)}-${pad(dateInJakarta.getDate())}`;
}

export function parseMacroNumeric(raw?: string): number | null {
    if (!raw || typeof raw !== 'string') return null;
    const cleaned = raw.replace(/,/g, '').trim();
    if (!cleaned || cleaned === '-' || cleaned === '—') return null;
    const match = cleaned.match(/^([+-]?\d+(?:\.\d+)?)\s*([KMBT%])?/i);
    if (!match) return null;
    const base = parseFloat(match[1]);
    if (!Number.isFinite(base)) return null;
    const unit = (match[2] || '').toUpperCase();
    if (unit === 'K') return base * 1e3;
    if (unit === 'M') return base * 1e6;
    if (unit === 'B') return base * 1e9;
    if (unit === 'T') return base * 1e12;
    return base;
}

export function isInverseCurrencyIndicator(title: string): boolean {
    const lower = (title || '').toLowerCase();
    return (
        lower.includes('unemployment rate') ||
        lower.includes('unemployment claims') ||
        lower.includes('initial jobless claims') ||
        lower.includes('continuing jobless claims') ||
        lower.includes('jobless claims') ||
        lower.includes('trade deficit')
    );
}

function classifySingleEvent(event: CalendarEvent, currentTime: number): AnalyzedEventItem {
    const eventTime = new Date(event.date).getTime();
    const isOngoing = currentTime >= (eventTime - 5 * 60 * 1000) && currentTime <= (eventTime + 15 * 60 * 1000);
    const isPast = currentTime > (eventTime + 15 * 60 * 1000);
    const status: AnalyzedEventItem['status'] = isOngoing ? 'ONGOING' : isPast ? 'COMPLETED' : 'UPCOMING';

    const timeWib = Number.isFinite(eventTime)
        ? new Date(eventTime).toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Jakarta'
          }) + ' WIB'
        : '-';

    const imp = (event.impact || '').toLowerCase();
    const baseWeight = imp === 'high' ? 4.0 : imp === 'medium' ? 2.0 : 0.85;
    const timingMultiplier = status === 'ONGOING' ? 1.5 : status === 'UPCOMING' ? 1.25 : 0.9;
    const weight = Number((baseWeight * timingMultiplier).toFixed(2));

    const numericActual = parseMacroNumeric(event.actual);
    const numericForecast = parseMacroNumeric(event.forecast);
    const numericPrevious = parseMacroNumeric(event.previous);
    const inverse = isInverseCurrencyIndicator(event.title || '');
    const titleLower = (event.title || '').toLowerCase();

    let currencyDirection: AnalyzedEventItem['currencyDirection'] = 'NEUTRAL';
    let directionReason = 'Menunggu angka aktual rilis — volatilitas dua arah berpotensi muncul.';

    if (numericActual !== null && (numericForecast !== null || numericPrevious !== null)) {
        const ref = numericForecast !== null ? numericForecast : numericPrevious!;
        const refLabel = numericForecast !== null ? 'Prediksi' : 'Sebelumnya';
        const diff = numericActual - ref;
        const eps = Math.max(Math.abs(ref) * 0.01, 0.001);

        if (Math.abs(diff) <= eps) {
            currencyDirection = 'NEUTRAL';
            directionReason = `Aktual (${event.actual}) sesuai ${refLabel} (${numericForecast !== null ? event.forecast : event.previous}) -> netral/whipsaw singkat.`;
        } else {
            const actualHigher = diff > 0;
            const bullishCcy = inverse ? !actualHigher : actualHigher;
            currencyDirection = bullishCcy ? 'BULLISH_CCY' : 'BEARISH_CCY';
            directionReason = bullishCcy
                ? `Aktual (${event.actual}) lebih ${actualHigher ? 'kuat/tinggi' : 'rendah'} dari ${refLabel} -> mendukung penguatan ${event.country}.`
                : `Aktual (${event.actual}) lebih ${actualHigher ? 'tinggi (beban)' : 'lemah'} dari ${refLabel} -> menekan ${event.country}.`;
        }
    } else if (numericForecast !== null && numericPrevious !== null) {
        const diff = numericForecast - numericPrevious;
        const eps = Math.max(Math.abs(numericPrevious) * 0.01, 0.001);
        if (Math.abs(diff) > eps) {
            const forecastHigher = diff > 0;
            const bullishCcy = inverse ? !forecastHigher : forecastHigher;
            currencyDirection = bullishCcy ? 'BULLISH_CCY' : 'BEARISH_CCY';
            directionReason = bullishCcy
                ? `Konsensus Prediksi (${event.forecast}) lebih optimistis dari Sblm (${event.previous}) -> bias awal pro-${event.country}, rawan profit taking saat rilis.`
                : `Konsensus Prediksi (${event.forecast}) melemah dari Sblm (${event.previous}) -> tekanan awal pada ${event.country}.`;
        } else {
            directionReason = `Prediksi (${event.forecast}) stagnan vs Sblm (${event.previous}) -> sangat sensitif terhadap kejutan aktual.`;
        }
    } else if (
        titleLower.includes('speaks') ||
        titleLower.includes('press conference') ||
        titleLower.includes('fomc') ||
        titleLower.includes('minutes') ||
        titleLower.includes('rate decision')
    ) {
        directionReason = 'Pernyataan bank sentral/keputusan suku bunga memicu pergerakan tajam dua arah (stop hunt likuiditas).';
    }

    return {
        event,
        status,
        timeWib,
        numericActual,
        numericForecast,
        numericPrevious,
        currencyDirection,
        directionReason,
        weight
    };
}

function getOutcomeLabel(outcome: DirectionalOutcome): string {
    switch (outcome) {
        case 'BULLISH':
            return 'BULLISH KUAT 🟢';
        case 'BEARISH':
            return 'BEARISH KUAT 🔴';
        case 'SPIKE_THEN_DUMP':
            return 'DUA ARAH: SPIKE LALU JUNAM ⚡🔻';
        case 'DUMP_THEN_SPIKE':
            return 'DUA ARAH: JUNAM DULU BARU SPIKE 🔻⚡';
    }
}

export function analyzeFilteredNewsForSectors(
    allEvents: CalendarEvent[],
    params: {
        targetDateKey: string;
        targetCountry: string;
        targetCountryLabel: string;
        targetImpact: ImpactFilterMode;
        currentTime: number;
    }
): FilteredNewsAnalysisReport {
    const { targetDateKey, targetCountry, targetCountryLabel, targetImpact, currentTime } = params;

    const matched = allEvents.filter(e => {
        const dKey = getJakartaDateKey(e.date);
        if (targetDateKey && dKey !== targetDateKey) return false;
        if (targetCountry && targetCountry !== 'ALL' && (e.country || '').toUpperCase() !== targetCountry.toUpperCase()) {
            return false;
        }
        const imp = (e.impact || '').toLowerCase();
        if (targetImpact === 'HIGH' && imp !== 'high') return false;
        if (targetImpact === 'MEDIUM' && imp !== 'medium') return false;
        if (targetImpact === 'LOW' && imp !== 'low') return false;
        if (targetImpact === 'HIGH_MEDIUM' && imp !== 'high' && imp !== 'medium') return false;
        return true;
    });

    const analyzedEvents = matched.map(ev => classifySingleEvent(ev, currentTime));
    const ongoing = analyzedEvents.filter(x => x.status === 'ONGOING');
    const upcoming = analyzedEvents.filter(x => x.status === 'UPCOMING');
    const completed = analyzedEvents.filter(x => x.status === 'COMPLETED');

    // Priority focus: ongoing & upcoming events ("yang akan sedang berjalan"), fallback to completed if all released
    const activeCluster = ongoing.length + upcoming.length > 0 ? [...ongoing, ...upcoming] : completed;

    const focusStatusLabel =
        ongoing.length > 0 && upcoming.length > 0
            ? `${ongoing.length} Sedang Berjalan • ${upcoming.length} Akan Berjalan`
            : ongoing.length > 0
            ? `${ongoing.length} News Sedang Berjalan Sekarang`
            : upcoming.length > 0
            ? `${upcoming.length} News Akan Berjalan`
            : completed.length > 0
            ? `${completed.length} News Sudah Rilis (Evaluasi Aktual)`
            : 'Tidak ada jadwal news pada kombinasi filter ini';

    const sortedByWeight = [...activeCluster].sort((a, b) => b.weight - a.weight);
    const dominantCatalyst = sortedByWeight[0] || analyzedEvents[0] || null;

    // Aggregate local currency bias from activeCluster
    let ccyNetScore = 0;
    let absScore = 0;
    let bullCount = 0;
    let bearCount = 0;
    let neutralOrSpeechCount = 0;

    activeCluster.forEach(item => {
        if (item.currencyDirection === 'BULLISH_CCY') {
            ccyNetScore += item.weight;
            absScore += item.weight;
            bullCount++;
        } else if (item.currencyDirection === 'BEARISH_CCY') {
            ccyNetScore -= item.weight;
            absScore += item.weight;
            bearCount++;
        } else {
            absScore += item.weight * 0.5;
            neutralOrSpeechCount++;
        }
    });

    const hasHigh = activeCluster.some(x => (x.event.impact || '').toLowerCase() === 'high');
    const hasMed = activeCluster.some(x => (x.event.impact || '').toLowerCase() === 'medium');
    const volatilityLevel: 'EKSTRIM' | 'TINGGI' | 'MODERAT' = hasHigh ? 'EKSTRIM' : hasMed ? 'TINGGI' : 'MODERAT';

    // Detect conflicting news released in the same day/window
    const conflictDetected = (bullCount > 0 && bearCount > 0) || (activeCluster.length > 1 && neutralOrSpeechCount > 0);
    const conflictSummary =
        activeCluster.length === 0
            ? `Belum ada event ${targetCountryLabel} pada filter yang dipilih. Pasar akan cenderung bergerak teknikal mengikuti sesi global.`
            : bullCount > 0 && bearCount > 0
            ? `Terdapat bentrokan ${bullCount} data pro-${targetCountry} vs ${bearCount} data kontra-${targetCountry}. Katalis terkuat: "${dominantCatalyst?.event.title}" (${dominantCatalyst?.event.impact} Impact).`
            : dominantCatalyst
            ? `Fokus terkuat pada 1 waktu adalah "${dominantCatalyst.event.title}" (${dominantCatalyst.event.impact} Impact • ${dominantCatalyst.timeWib}).`
            : 'Pergerakan mengikuti sentimen umum.';

    // Country correlation multipliers for each sector:
    // +1 means stronger currency -> bullish for sector; -1 means stronger currency -> bearish for sector.
    const ccyUpper = (targetCountry || 'USD').toUpperCase();

    const getSectorMultiplier = (sector: MarketSector): number => {
        if (sector === 'XAUUSD') {
            if (ccyUpper === 'USD') return -1.0; // Strong USD pressures Gold
            if (ccyUpper === 'JPY' || ccyUpper === 'CHF') return 0.55; // Safe-haven / inverse DXY co-movement
            if (ccyUpper === 'CNY') return 0.65; // China demand supports Gold
            if (ccyUpper === 'EUR' || ccyUpper === 'GBP' || ccyUpper === 'AUD') return 0.45; // Weakens DXY -> supports Gold
            return -0.25;
        }
        if (sector === 'COMMODITY') {
            if (ccyUpper === 'USD') return -0.85;
            if (ccyUpper === 'CNY' || ccyUpper === 'INR') return 0.85; // China/India industrial demand boosts oil & metals
            if (ccyUpper === 'SAR' || ccyUpper === 'RUB') return 0.55; // Energy/OPEC+ supply drivers
            if (ccyUpper === 'CAD' || ccyUpper === 'AUD') return 0.7; // Commodity currencies
            return 0.35;
        }
        if (sector === 'CRYPTO') {
            if (ccyUpper === 'USD') return -0.95; // Strong hawkish USD drains BTC/ETH liquidity
            if (ccyUpper === 'CNY') return 0.6; // China liquidity / stimulus supports risk-on
            if (ccyUpper === 'JPY') return -0.65; // BoJ hawkish JPY unwinds global carry trade -> pressure on BTC
            return 0.4;
        }
        // FOREX: directly measures selected currency (or majors vs USD if USD selected)
        if (ccyUpper === 'USD') return -1.0; // EUR/USD, GBP/USD, AUD/USD move inverse to USD
        return 1.0; // Direct strength of selected country currency (e.g. EUR, GBP, JPY, AUD, CAD, CHF, CNY)
    };

    const buildSectorAnalysis = (
        sector: MarketSector,
        name: string,
        icon: string,
        affectedPairs: string[]
    ): SectorDeepAnalysis => {
        const mult = getSectorMultiplier(sector);
        const directedScore = ccyNetScore * mult;
        const normalizedRatio = absScore > 0 ? Math.abs(directedScore) / absScore : 0;

        let outcome: DirectionalOutcome;
        let dominancePct: number;

        if (activeCluster.length === 0) {
            outcome = mult >= 0 ? 'SPIKE_THEN_DUMP' : 'DUMP_THEN_SPIKE';
            dominancePct = 55;
        } else if (normalizedRatio >= 0.45 && Math.abs(directedScore) >= 1.8 && !conflictDetected) {
            outcome = directedScore > 0 ? 'BULLISH' : 'BEARISH';
            dominancePct = Math.min(93, Math.round(66 + normalizedRatio * 24));
        } else if (normalizedRatio >= 0.25) {
            // Two-way liquidity sweep before resolving to the stronger side!
            outcome = directedScore >= 0 ? 'DUMP_THEN_SPIKE' : 'SPIKE_THEN_DUMP';
            dominancePct = Math.min(86, Math.round(62 + normalizedRatio * 20));
        } else {
            // Pure tug-of-war: pick highest-weight single catalyst's side as final resolution after sweep
            const domSign = dominantCatalyst
                ? (dominantCatalyst.currencyDirection === 'BEARISH_CCY' ? -1 : 1) * mult
                : mult;
            outcome = domSign >= 0 ? 'DUMP_THEN_SPIKE' : 'SPIKE_THEN_DUMP';
            dominancePct = Math.min(78, Math.round(58 + (hasHigh ? 14 : 8)));
        }

        const outcomeLabel = getOutcomeLabel(outcome);
        const strongestInOneTime =
            outcome === 'BULLISH'
                ? `HASIL TERKUAT: BULLISH LANGSUNG (${dominancePct}%)`
                : outcome === 'BEARISH'
                ? `HASIL TERKUAT: BEARISH LANGSUNG (${dominancePct}%)`
                : outcome === 'SPIKE_THEN_DUMP'
                ? `HASIL TERKUAT: SPIKE DULU LALU JUNAM (${dominancePct}%)`
                : `HASIL TERKUAT: JUNAM DULU BARU SPIKE (${dominancePct}%)`;

        const catalystTitle = dominantCatalyst ? dominantCatalyst.event.title : `Data ${targetCountryLabel}`;
        const summary =
            activeCluster.length === 0
                ? `Tidak ada rilis ${targetCountryLabel} yang aktif pada filter ini — pergerakan mengikuti aliran sesi teknikal.`
                : outcome === 'BULLISH'
                ? `Konfluensi news ${targetCountryLabel} (${catalystTitle}) mendukung dorongan BULLISH dominan pada ${sector}.`
                : outcome === 'BEARISH'
                ? `Tekanan data ${targetCountryLabel} (${catalystTitle}) memicu bias BEARISH dominan pada ${sector}.`
                : outcome === 'SPIKE_THEN_DUMP'
                ? `Pola DUA ARAH dominan: harga berpotensi SPIKE naik menyapu buy-stop atas terlebih dahulu, lalu JUNAM turun mengikuti bobot terkuat (${catalystTitle}).`
                : `Pola DUA ARAH dominan: harga berpotensi JUNAM menyapu sell-stop bawah lebih dulu, lalu SPIKE naik kuat setelah likuiditas terkumpul (${catalystTitle}).`;

        const primaryRationale = dominantCatalyst
            ? `${dominantCatalyst.directionReason} Dalam jendela waktu rilis ${dominantCatalyst.timeWib}, bobot ${dominantCatalyst.event.impact} Impact dari ${targetCountryLabel} menjadi penggerak utama korelasi ke ${name}.`
            : `Analisis korelasi ${targetCountryLabel} terhadap ${name}.`;

        const sequenceDetail =
            outcome === 'BULLISH'
                ? `Urutan kuat dalam 1 waktu: dorongan beli bertahap menembus struktur resistance terdekat tanpa retrace dalam apabila angka aktual searah ekspektasi.`
                : outcome === 'BEARISH'
                ? `Urutan kuat dalam 1 waktu: tekanan jual institusi mendominasi orderbook sehingga pantulan naik hanya menjadi area re-entry sell.`
                : outcome === 'SPIKE_THEN_DUMP'
                ? `Urutan kuat dalam 1 waktu: (1) Wick spike cepat ke zona premium/resistance untuk memicu FOMO buyer & menyapu SL seller -> (2) Reversal tajam banting turun (junam) menuju likuiditas bawah.`
                : `Urutan kuat dalam 1 waktu: (1) Penurunan tajam sesaat (junam) ke zona diskon/support untuk menyapu SL buyer -> (2) Rebound agresif (spike naik) setelah likuiditas institusi terisi.`;

        const actionablePlaybook =
            outcome === 'BULLISH' || outcome === 'BEARISH'
                ? `Tunggu konfirmasi penutupan candle M5/M15 pasca rilis ${dominantCatalyst?.timeWib || ''}. Eksekusi searah ${outcome === 'BULLISH' ? 'BUY' : 'SELL'} saat retest FVG/Order Block.`
                : `JANGAN entry di detik ke-0 rilis! Biarkan fase ${outcome === 'SPIKE_THEN_DUMP' ? 'spike atas' : 'junam bawah'} selesai menyapu likuiditas terlebih dahulu, tunggu konfirmasi CHoCH di M5 baru ikut arah utama (${outcome === 'SPIKE_THEN_DUMP' ? 'SELL' : 'BUY'}).`;

        return {
            sector,
            name,
            icon,
            outcome,
            outcomeLabel,
            dominancePct,
            volatilityLevel,
            strongestInOneTime,
            summary,
            primaryRationale,
            sequenceDetail,
            actionablePlaybook,
            affectedPairs
        };
    };

    const forexPairs =
        ccyUpper === 'USD'
            ? ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD']
            : ccyUpper === 'EUR'
            ? ['EUR/USD', 'EUR/JPY', 'EUR/GBP']
            : ccyUpper === 'GBP'
            ? ['GBP/USD', 'GBP/JPY', 'EUR/GBP']
            : ccyUpper === 'JPY'
            ? ['USD/JPY', 'EUR/JPY', 'GBP/JPY']
            : ccyUpper === 'AUD'
            ? ['AUD/USD', 'AUD/JPY', 'EUR/AUD']
            : ccyUpper === 'CAD'
            ? ['USD/CAD', 'CAD/JPY']
            : ccyUpper === 'CHF'
            ? ['USD/CHF', 'EUR/CHF']
            : [`USD/${ccyUpper}`, 'EUR/USD', 'USD/JPY'];

    return {
        totalMatched: analyzedEvents.length,
        ongoingCount: ongoing.length,
        upcomingCount: upcoming.length,
        completedCount: completed.length,
        focusStatusLabel,
        analyzedEvents,
        dominantCatalyst,
        conflictDetected,
        conflictSummary,
        sectors: {
            XAUUSD: buildSectorAnalysis('XAUUSD', 'XAUUSD (Gold / Emas)', '🟡', ['XAU/USD', 'XAG/USD']),
            COMMODITY: buildSectorAnalysis('COMMODITY', 'Commodity (Oil, Silver, Metal)', '🛢️', ['USOIL (WTI)', 'UKOIL', 'Copper']),
            CRYPTO: buildSectorAnalysis('CRYPTO', 'Crypto (BTC, ETH, Altcoins)', '🪙', ['BTC/USDT', 'ETH/USDT', 'SOL/USDT']),
            FOREX: buildSectorAnalysis('FOREX', `Forex (${targetCountryLabel} & Majors)`, '💱', forexPairs)
        }
    };
}

export function analyzeTwoWeekMacroOutlook(events: CalendarEvent[], currentTime: number): TwoWeekMacroReport {
    const totalEvents = events.length;
    let totalHigh = 0;
    let totalMedium = 0;
    let totalLow = 0;

    const ccyMap = new Map<string, { total: number; high: number; med: number; low: number; highTitles: string[] }>();
    const dayMap = new Map<string, { high: number; med: number; total: number; currencies: Set<string>; titles: string[]; dateObj: Date }>();

    const daysId = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
    const monthsId = ['JAN', 'FEB', 'MAR', 'APR', 'MEI', 'JUN', 'JUL', 'AGU', 'SEP', 'OKT', 'NOV', 'DES'];

    events.forEach(e => {
        const imp = (e.impact || '').toLowerCase();
        const isHigh = imp === 'high';
        const isMed = imp === 'medium';
        if (isHigh) totalHigh++;
        else if (isMed) totalMedium++;
        else totalLow++;

        const cur = (e.country || 'GLOBAL').toUpperCase();
        if (!ccyMap.has(cur)) ccyMap.set(cur, { total: 0, high: 0, med: 0, low: 0, highTitles: [] });
        const cs = ccyMap.get(cur)!;
        cs.total++;
        if (isHigh) {
            cs.high++;
            if (cs.highTitles.length < 3) cs.highTitles.push(e.title);
        } else if (isMed) cs.med++;
        else cs.low++;

        const dKey = getJakartaDateKey(e.date);
        if (dKey) {
            if (!dayMap.has(dKey)) {
                dayMap.set(dKey, { high: 0, med: 0, total: 0, currencies: new Set(), titles: [], dateObj: new Date(e.date) });
            }
            const ds = dayMap.get(dKey)!;
            ds.total++;
            ds.currencies.add(cur);
            if (isHigh) {
                ds.high++;
                if (ds.titles.length < 3) ds.titles.push(`${cur}: ${e.title}`);
            } else if (isMed) {
                ds.med++;
            }
        }
    });

    const topCurrencies: TwoWeekCountryStat[] = Array.from(ccyMap.entries())
        .map(([currency, v]) => ({
            currency,
            total: v.total,
            highCount: v.high,
            mediumCount: v.med,
            lowCount: v.low,
            topEvents: v.highTitles
        }))
        .sort((a, b) => (b.highCount * 4 + b.mediumCount * 2 + b.total) - (a.highCount * 4 + a.mediumCount * 2 + a.total))
        .slice(0, 6);

    const peakDays: TwoWeekPeakDayStat[] = Array.from(dayMap.entries())
        .map(([dateKey, v]) => {
            const jkt = new Date(v.dateObj.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const label = `${daysId[jkt.getDay()]}, ${jkt.getDate()} ${monthsId[jkt.getMonth()]}`;
            return {
                dateKey,
                label,
                highCount: v.high,
                mediumCount: v.med,
                total: v.total,
                currencies: Array.from(v.currencies).slice(0, 5),
                highlightTitles: v.titles
            };
        })
        .sort((a, b) => (b.highCount * 5 + b.mediumCount * 2 + b.total) - (a.highCount * 5 + a.mediumCount * 2 + a.total))
        .slice(0, 5);

    const leadCcy = topCurrencies[0]?.currency || 'USD';
    const usdHigh = ccyMap.get('USD')?.high || 0;
    const dominantTheme =
        usdHigh >= 3
            ? `Siklus Suku Bunga & Data Makro ${leadCcy} Dominan (14 Hari)`
            : totalHigh >= 6
            ? `Pekan Padat Katalis Bank Sentral & Inflasi Global`
            : `Fase Konsolidasi Makro 2 Minggu (Selektif High Impact)`;

    const macroBiasSummary = `Dalam 14 hari ke depan tercatat ${totalHigh} berita High Impact dan ${totalMedium} Medium Impact. Penggerak likuiditas terbesar berasal dari ${topCurrencies.slice(0, 3).map(c => `${c.currency} (${c.highCount} High)`).join(', ')}.`;

    const sectorTwoWeekBias: TwoWeekMacroReport['sectorTwoWeekBias'] = [
        {
            sector: 'XAUUSD',
            name: 'XAUUSD (Gold)',
            biasLabel: usdHigh >= 3 ? 'VOLATILITAS TINGGI (DUA ARAH)' : 'BULLISH TERUKUR',
            note: `Sensitif pada ${usdHigh} event High Impact USD dalam 2 minggu ini. Fokus swing saat retest pasca-rilis.`
        },
        {
            sector: 'CRYPTO',
            name: 'Crypto (BTC/ETH)',
            biasLabel: totalHigh >= 6 ? 'SWING LIKUIDITAS' : 'RISK-ON BERTAHAP',
            note: 'Mengikuti arus likuiditas DXY dan sentimen risk appetite global sepanjang kalender 14 hari.'
        },
        {
            sector: 'FOREX',
            name: 'Forex Majors',
            biasLabel: `FOKUS ${topCurrencies.slice(0, 2).map(c => c.currency).join(' / ') || 'USD'}`,
            note: 'Volatilitas terbesar terkonsentrasi pada hari-hari Red Folder di peta 2 minggu.'
        },
        {
            sector: 'COMMODITY',
            name: 'Commodity (Oil)',
            biasLabel: (ccyMap.get('CNY')?.high || 0) > 0 ? 'SENSITIF CHINA & USD' : 'RANGE TEKNIKAL',
            note: 'Pantau PMI global, data energi, dan pergerakan Dolar AS selama 2 pekan.'
        }
    ];

    void currentTime;

    return {
        totalEvents,
        totalHigh,
        totalMedium,
        totalLow,
        topCurrencies,
        peakDays,
        dominantTheme,
        macroBiasSummary,
        sectorTwoWeekBias
    };
}
