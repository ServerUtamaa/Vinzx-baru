function classifyForexFactoryImpact(e) {
  const title = (e.title || '').trim();
  const lower = title.toLowerCase();
  const cur = (e.currency || e.country || '').toUpperCase();
  const rawImportance = typeof e.importance === 'number' ? e.importance : (e.impact === 'High' ? 1 : e.impact === 'Medium' ? 0 : -1);

  const strictlyLowKeywords = [
    'bavaria', 'hesse', 'saxony', 'brandenburg', 'baden', 'wuerttemberg', 'north rhine', 'westphalia',
    'tokyo', 'mortgage rate', 'rig count', 'money supply', 'm2', 'm3', 'foreign reserves', 'car registration',
    'vehicle sales', 'redbook', 'api crude', 'eia natural gas', 'auction', '10-year note', '30-year bond',
    '2-year note', '5-year note', 'richmond fed', 'dallas fed', 'kansas fed', 'chicagofed', 'ny empire'
  ];
  if (strictlyLowKeywords.some(k => lower.includes(k))) return 'Low';

  const isHighImpact = (
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
  if (isHighImpact) return 'High';

  const isMediumImpact = (
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
  if (isMediumImpact) return 'Medium';

  if (rawImportance === 1) return 'High';
  if (rawImportance === 0) return 'Medium';
  return 'Low';
}

export default async function handler(req, res) {
  try {
    const now = Date.now();
    const from = new Date(now - 1 * 86400000).toISOString();
    const to = new Date(now + 16 * 86400000).toISOString();
    const tvUrl = `https://economic-calendar.tradingview.com/events?from=${from}&to=${to}`;
    
    try {
      const tvRes = await fetch(tvUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Origin': 'https://www.tradingview.com',
          'Referer': 'https://www.tradingview.com/'
        }
      });
      if (tvRes.ok) {
        const tvData = await tvRes.json();
        if (tvData && Array.isArray(tvData.result) && tvData.result.length > 0) {
          const mappedEvents = tvData.result.map(e => ({
            title: e.title || '',
            country: e.currency || e.country || '',
            countryCode: e.country || '',
            currency: e.currency || '',
            date: e.date,
            impact: classifyForexFactoryImpact(e),
            forecast: e.forecast !== undefined && e.forecast !== null ? '' + e.forecast + (e.unit || '') : '',
            previous: e.previous !== undefined && e.previous !== null ? '' + e.previous + (e.unit || '') : '',
            actual: e.actual !== undefined && e.actual !== null ? '' + e.actual + (e.unit || '') : '',
            indicator: e.indicator || '',
            period: e.period || '',
            unit: e.unit || '',
            comment: e.comment || ''
          }));
          return res.status(200).json({ result: mappedEvents });
        }
      }
    } catch (tvErr) {
      console.warn('TradingView fetch failed in serverless handler:', tvErr.message);
    }

    const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json');
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from Forex Factory' });
    }
    
    const data = await response.json();
    res.status(200).json({ result: data });
  } catch (error) {
    console.error('Calendar API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
