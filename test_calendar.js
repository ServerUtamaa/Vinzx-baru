const fetch = require('node-fetch');
async function run() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const from = startOfDay.toISOString();
  const to = new Date(startOfDay.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
  console.log({from, to});
  const res = await fetch(`https://economic-calendar.tradingview.com/events?from=${from}&to=${to}&lang=id`, {
      headers: {
        'Origin': 'https://www.tradingview.com',
        'Referer': 'https://www.tradingview.com/'
      }
  });
  const data = await res.json();
  console.log(data.result.slice(0, 3));
}
run();
