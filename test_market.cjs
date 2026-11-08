const checkMarketStatus = (asset) => {
    const cryptoAssets = ['BTCUSD', 'ETHUSD', 'SOLUSD', 'BNBUSD'];
    if (cryptoAssets.includes(asset)) {
        return { isOpen: true, message: "MARKET OPEN (24/7)" };
    }

    const now = new Date();
    
    // Convert current time to NY time components robustly for browser
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    let year=0, month=0, date=0, hour=0, minute=0, second=0;
    for (const p of parts) {
        if (p.type==='year') year = parseInt(p.value, 10);
        if (p.type==='month') month = parseInt(p.value, 10) - 1;
        if (p.type==='day') date = parseInt(p.value, 10);
        if (p.type==='hour') hour = parseInt(p.value, 10) % 24;
        if (p.type==='minute') minute = parseInt(p.value, 10);
        if (p.type==='second') second = parseInt(p.value, 10);
    }
    
    // nyTime is a Date object where UTC methods return the NY time values
    const nyTime = new Date(Date.UTC(year, month, date, hour, minute, second));
    
    if (month === 11 && date === 25) return { isOpen: false, message: "MARKET LIBUR (CHRISTMAS)" };
    if (month === 0 && date === 1) return { isOpen: false, message: "MARKET LIBUR (NEW YEAR)" };

    const day = nyTime.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
    const nyHour = nyTime.getUTCHours();

    let isClosed = false;

    // Friday after 17:00 NY time
    if (day === 5 && nyHour >= 17) {
        isClosed = true;
    }
    // Saturday all day
    else if (day === 6) {
        isClosed = true;
    }
    // Sunday before 17:00 NY time
    else if (day === 0 && nyHour < 17) {
        isClosed = true;
    }

    if (isClosed) {
        return { isOpen: false, message: "MARKET TUTUP" };
    }

    return { isOpen: true, message: "MARKET OPEN" };
};
console.log(checkMarketStatus('XAUUSD'));
