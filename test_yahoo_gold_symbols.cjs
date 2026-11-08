async function run() {
  for (const sym of ['XAU=X', 'XAUUSD=X', 'GOLD=X', 'XAU-USD', 'XAU=F', 'GOLD', 'OAUUSD=X']) {
    try {
      const yf = await fetch(`http://localhost:3000/api/yahoo?symbol=${sym}&interval=1m&range=1d`).then(r=>r.json());
      if (yf.chart && yf.chart.result && yf.chart.result.length > 0) {
        console.log(`Success with ${sym}:`, yf.chart.result[0].meta.regularMarketPrice);
      } else {
        console.log(`Failed with ${sym}:`, yf.chart.error.code);
      }
    } catch (e) {
      console.log(`Error with ${sym}`);
    }
  }
}
run();
