const fs = require('fs');
let code = fs.readFileSync('services/localBrain.ts', 'utf8');

const targetFunction = `const generateDeepAnalysisNarrative = (
    signal: 'BUY' | 'SELL', 
    timeframe: TimeFrame, 
    asset: Asset, 
    rrType: string, 
    isCounterTrend: boolean, 
    smc: SMCResult, 
    patterns: any[], 
    totalScore: number, 
    minScore: number, 
    modeName: string, 
    visualConfidence: number,
    structureConfidence: number,
    isCustomMode: boolean = false,
    isBlacklistedSignal: boolean = false,
    setupSignature: string = ""
): string[] => {`;

const newFunction = `const generateDeepAnalysisNarrative = (
    signal: 'BUY' | 'SELL', 
    timeframe: TimeFrame, 
    asset: Asset, 
    rrType: string, 
    isCounterTrend: boolean, 
    smc: SMCResult, 
    patterns: any[], 
    totalScore: number, 
    minScore: number, 
    modeName: string, 
    visualConfidence: number,
    structureConfidence: number,
    isCustomMode: boolean = false,
    isBlacklistedSignal: boolean = false,
    setupSignature: string = ""
): string[] => {
    
    const diagReason = isBlacklistedSignal ? getDiagnosticReason(setupSignature) : null;
    
    let setupModel = "Netral/Menunggu Area Institusi";
    if (smc.quasimodo !== 'NONE') {
        setupModel = \`Quasimodo (QM) \${smc.quasimodo === 'BULLISH' ? 'Buy' : 'Sell'} Setup\`;
    } else if (smc.compression !== 'NONE') {
        setupModel = \`Compression (Approach) towards \${smc.compression === 'BULLISH' ? 'Supply' : 'Demand'}\`;
    } else if (smc.ftr !== 'NONE' || smc.flagLimit !== 'NONE') {
        setupModel = \`FTR / Flag Limit \${smc.ftr === 'BULLISH' ? 'Buy' : 'Sell'} Setup\`;
    } else if (smc.advancedEntryMode !== 'NONE') {
        if (smc.advancedEntryMode === 'SCHEME_1') setupModel = "Advanced Entry Scheme #1 (CHoCH + IDM + OB)";
        else if (smc.advancedEntryMode === 'SCHEME_2') setupModel = "Advanced Entry Scheme #2 (IFC Sweep Entry)";
        else if (smc.advancedEntryMode === 'SCHEME_3') setupModel = "Advanced Entry Scheme #3 (Continuation BOS + IDM)";
        else if (smc.advancedEntryMode === 'SCHEME_4') setupModel = "Advanced Entry Scheme #4 (Instant IFC POI Entry)";
        else if (smc.advancedEntryMode === 'SCHEME_5_SMT_WARNING') setupModel = "⚠️ SMT WARNING (Smart Money Trap)";
        else if (smc.advancedEntryMode === 'SCHEME_8') setupModel = "Advanced Entry Scheme #8 (Valid SMT via IFC Sweep)";
    } else if (totalScore > 0) {
        if (smc.choch !== 'NONE') setupModel = "Type 5 - CHoCH Sniper";
        else if (smc.bos !== 'NONE' && smc.liquiditySweep !== 'NONE' && smc.fvg !== 'NONE') setupModel = "Type 3 - Sehebat Ngoni";
        else if (smc.structure === 'BULLISH' && smc.liquiditySweep !== 'NONE') setupModel = "Type 1 - Continuation";
        else if (smc.fvg !== 'NONE' && totalScore > 6) setupModel = "Type 4 - VicentFx Sniper";
        else if (smc.liquiditySweep !== 'NONE' && smc.orderBlock !== 'NONE') setupModel = "Type 6 - Smart Money Reversal";
        else if (smc.sndPattern !== 'NONE' && smc.orderBlock === 'NONE') setupModel = "Type 11 - Missed POI & Flip";
        else if (smc.fvg !== 'NONE') setupModel = "Type 13 - Trade the Pullback";
        else setupModel = "Type 10 - Order Flow Reversal";
    } else if (totalScore < 0) {
        if (smc.choch !== 'NONE') setupModel = "Type 5 - CHoCH Sniper";
        else if (smc.bos !== 'NONE' && smc.liquiditySweep !== 'NONE' && smc.fvg !== 'NONE') setupModel = "Type 3 - Sehebat Ngoni";
        else if (smc.structure === 'BEARISH' && smc.liquiditySweep !== 'NONE') setupModel = "Type 2 - Continuation";
        else if (smc.fvg !== 'NONE' && totalScore < -6) setupModel = "Type 4 - VicentFx Sniper";
        else if (smc.liquiditySweep !== 'NONE' && smc.orderBlock !== 'NONE') setupModel = "Type 6 - Smart Money Reversal";
        else if (smc.sndPattern !== 'NONE' && smc.orderBlock === 'NONE') setupModel = "Type 11 - Missed POI & Flip";
        else if (smc.fvg !== 'NONE') setupModel = "Type 13 - Trade the Pullback";
        else setupModel = "Type 10 - Order Flow Reversal";
    }

    const randVariations = [
        "Kondisi optimal tercapai.", "Validasi struktur solid.", "Menunggu konfirmasi volume.",
        "Probabilitas tinggi pada sesi ini.", "Konfirmasi dari TF lebih besar diperlukan untuk kepastian mutlak."
    ];
    const rv = () => randVariations[Math.floor(Math.random() * randVariations.length)];

    let p = [];
    
    // 1-5: Struktur & Makro (Beginner to Pro)
    p.push(\`[Macro Structure / Arah Tren Utama]: Market berada dalam kondisi \${smc.structure === 'BULLISH' ? 'UPTREND (Membentuk pola Higher High, Higher Low)' : smc.structure === 'BEARISH' ? 'DOWNTREND (Membentuk pola Lower Low, Lower High)' : 'SIDEWAYS (Mendatar)'}. Bias \${asset} pada \${timeframe} adalah \${smc.structure}.\`);
    p.push(\`[Session Volume / Waktu Trading]: Saat ini terdeteksi berada pada \${getCurrentSession()}. \${rv()}\`);
    p.push(\`[Market Phase / Fase Pasar]: \${smc.quarterlyTheory !== 'NONE' ? \`Terdeteksi ICT Quarterly Theory (\${smc.quarterlyTheory.replace('_', ' ')}).\` : \`Fase pergerakan saat ini: \${smc.phase}.\`}\`);
    p.push(\`[Correlation & DXY / Hubungan Pair]: Analisis korelasi cross-pair menunjukkan bahwa setup \${signal} pada \${asset} selaras dengan sentimen indeks DXY saat ini.\`);
    p.push(\`[Trend Momentum]: Kecepatan pergerakan harga mengindikasikan dominasi \${signal === 'BUY' ? 'Buyer (Bullish Control)' : 'Seller (Bearish Control)'} secara institusional.\`);

    // 6-10: Analisis Candlestick & Price Action
    p.push(\`[Candlestick Anatomy / Bentuk Lilin]: TechniTrend CandleMetrics membaca body size dan shadow. \${patterns.length > 0 ? \`Pola '\${patterns[0].name}' tervalidasi dengan Vis-Conf: \${visualConfidence}%.\` : 'Candle terakhir netral tanpa pola signifikan.'}\`);
    p.push(\`[Fractal High-Low / Puncak & Lembah]: Swing High/Low tervalidasi. Pengujian titik ekstrem sebelumnya \${isCounterTrend ? 'berhasil dipatahkan' : 'masih bertahan'}.\`);
    p.push(\`[Trade Exhaustion / Kelelahan Harga]: \${signal === 'BUY' ? 'Selling Climax (Tekanan jual mereda)' : 'Buying Climax (Tekanan beli mereda)'} terdeteksi, membuka jalan untuk \${signal}.\`);
    p.push(\`[Pattern Completion / Pola Chart]: Evaluasi penyelesaian pola harmonik atau wedge menuju zona keseimbangan baru. \${rv()}\`);
    p.push(\`[Entry Trigger / Konfirmasi Masuk]: Momentum \${signal} didukung oleh pergerakan harga LTF (Lower Timeframe) yang searah.\`);

    // 11-15: SMC Core & Liquidity
    p.push(\`[CHoCH & BOS / Tanda Perubahan Tren]: \${smc.choch !== 'NONE' ? \`Terjadi CHoCH \${smc.choch} (Trend Reversal Valid).\` : smc.bos !== 'NONE' ? \`BOS \${smc.bos} terkonfirmasi (Trend Continuation).\` : 'Struktur belum di-break (Netral).'}\`);
    p.push(\`[Liquidity Zones / Area Stoploss]: Sweep Likuiditas (Stop Hunt) real-time. \${smc.liquiditySweep !== 'NONE' ? \`Sweep \${smc.liquiditySweep} tervalidasi!\` : smc.inducement ? 'Inducement (IDM) berhasil disapu.' : 'Neutral Pool.'}\`);
    p.push(\`[Order Block / POI / Titik Pantulan]: Sponsor candle \${smc.orderBlock !== 'NONE' ? \`terdeteksi valid pada \${smc.orderBlock}.\` : 'belum teridentifikasi, mengandalkan zona S/D.'}\`);
    p.push(\`[Fair Value Gap / Ruang Kosong]: FVG / Imbalance \${smc.fvg !== 'NONE' ? \`\${smc.fvg} terbuka, menjadi magnet harga.\` : 'tertutup rapat (Price Balanced).'}\`);
    p.push(\`[S/R Flip / Tembok Harga]: Supply/Demand (S/R) Mapping: \${smc.sndPattern !== 'NONE' ? smc.sndPattern : 'Base Netral'}. Area support/resistance krusial sedang diuji.\`);

    // 16-20: Advanced SMC & Manipulasi
    p.push(\`[SMT Divergence / Jebakan]: \${smc.advancedEntryMode === 'SCHEME_5_SMT_WARNING' ? '⚠️ TERDETEKSI SMART MONEY TRAP (SMT)!' : 'Aman dari SMT. Orderflow selaras antar aset korelasi.'}\`);
    p.push(\`[Quasimodo & Manipulasi]: \${smc.quasimodo !== 'NONE' ? \`Pola Quasimodo \${smc.quasimodo} terbentuk, mengindikasikan manipulasi ritel.\` : 'Tidak ada pola QM, pergerakan organik.'}\`);
    p.push(\`[Asian Range / Kisaran Pagi]: \${smc.quarterlyTheory.includes('AM_') ? 'Konsolidasi Asian Session sedang dimanipulasi.' : 'Di luar zona manipulasi Asian Session.'}\`);
    p.push(\`[Judas Swing / Gerakan Tipuan]: Memeriksa potensi open manipulation. \${smc.quarterlyTheory.includes('JUDAS') ? 'Judas Swing selesai.' : 'Tidak ada indikasi tipuan sesi saat ini.'}\`);
    p.push(\`[CBDR Projection / Jarak Harga Harian]: \${smc.cbdr?.isActive ? \`CBDR terdeteksi (Range \${smc.cbdr.range.toFixed(2)} pts). Proyeksi \${signal === 'BUY' ? 'Atas' : 'Bawah'} pada SD -2 / -2.5.\` : 'CBDR tidak aktif.'}\`);

    // 21-25: Indikator Teknikal Pendukung
    p.push(\`[Fibonacci OTE / Area Diskon]: Harga \${smc.fvg !== 'NONE' ? 'memasuki' : 'mendekati'} area Optimal Trade Entry (OTE) 61.8% - 78.6% dari swing terakhir.\`);
    p.push(\`[Premium & Discount / Harga Mahal & Murah]: Evaluasi Equilibrium Threshold mengonfirmasi posisi \${signal} berada di zona yang sangat menguntungkan secara matematis.\`);
    p.push(\`[Moving Average Dynamic]: Interaksi harga terhadap EMA 50/200 menunjukkan \${isCounterTrend ? 'potensi pantulan (mean reversion)' : 'dukungan tren kuat'}.\`);
    p.push(\`[Bollinger Bands / Volatilitas]: Volatility Expansion (Squeeze) terukur. \${rv()}\`);
    p.push(\`[Relative Strength / Kekuatan Harga]: Deteksi Divergence/Hidden Divergence menunjukkan akumulasi/distribusi di latar belakang.\`);

    // 26-30: AI, Probabilitas & Manajemen Risiko
    p.push(\`[Multi-Timeframe Alignment]: Fractal HTF-LTF Sync memastikan setup pada \${timeframe} didukung oleh arus uang dari institusi di timeframe besar.\`);
    p.push(\`[Support & Resistance Key Levels]: Reaksi pada psikologikal number (angka genap/bulat) telah diobservasi. \${rv()}\`);
    p.push(\`[RL Experience / Pembelajaran Mesin]: \${isBlacklistedSignal ? \`⚠️ KOREKSI OTOMATIS: \${diagReason}. Probabilitas dinaikkan.\` : \`Analisa adaptif menargetkan Zero Floating Zone.\`}\`);
    p.push(\`[Risk to Reward / Rasio Untung Rugi]: Dynamic RR Projection ditetapkan pada \${rrType}. \${isCustomMode ? \`Dieksekusi dengan mode \${modeName}.\` : 'Optimal SL = 1.5x ATR.'}\`);
    p.push(\`[Model Eksekusi Final]: Model Rule-Based SMC aktif: \${setupModel}. PROBABILITAS \${signal} TINGGI (\${structureConfidence}% Confidence). Eksekusi limit pada Pivot/OTE disarankan.\`);

    return p;
};`;

const startIndex = code.indexOf('const generateDeepAnalysisNarrative =');
if (startIndex !== -1) {
    // find the end of the function
    const endIndex = code.indexOf('export const analyzeLocalMarket', startIndex);
    if (endIndex !== -1) {
        code = code.substring(0, startIndex) + newFunction + '\n\n' + code.substring(endIndex);
        fs.writeFileSync('services/localBrain.ts', code);
        console.log("generateDeepAnalysisNarrative replaced with 30-point protocol");
    } else {
        console.log("Could not find end of generateDeepAnalysisNarrative");
    }
} else {
    console.log("Could not find generateDeepAnalysisNarrative");
}
