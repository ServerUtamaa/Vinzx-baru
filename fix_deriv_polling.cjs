const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const derivRegex = /const connectDerivEngine = \(asset: Asset, timeframe: TimeFrame, isActive: \(\) => boolean\) => \{[\s\S]*?\} catch \(e\) \{ \n          if\(isActive\(\)\) \{\n              isSyntheticRef\.current = true;\n          \}\n      \}\n  \};/;

const newDerivEngine = `const connectDerivEngine = (asset: Asset, timeframe: TimeFrame, isActive: () => boolean) => {
      const symbolMap: Record<string, string> = { 
          [Asset.XAUUSD]: 'frxXAUUSD', [Asset.XAGUSD]: 'frxXAGUSD', [Asset.XPTUSD]: 'frxXPTUSD',
          [Asset.NASDAQ]: 'OTC_NDX', [Asset.USOIL]: 'OTC_USOIL', // Will fallback to Yahoo if deriv doesn't have it
          [Asset.EURUSD]: 'frxEURUSD', [Asset.GBPUSD]: 'frxGBPUSD', [Asset.USDJPY]: 'frxUSDJPY',
          [Asset.AUDUSD]: 'frxAUDUSD', [Asset.USDCHF]: 'frxUSDCHF', [Asset.NZDUSD]: 'frxNZDUSD',
          [Asset.GBPJPY]: 'frxGBPJPY', [Asset.EURJPY]: 'frxEURJPY'
      };
      const granularityMap: Record<TimeFrame, number> = { 'M1': 60, 'M5': 300, 'M15': 900, 'M30': 1800, 'H1': 3600, 'H4': 14400, 'D1': 86400 };
      const symbol = symbolMap[asset];
      const granularity = granularityMap[timeframe];
      if (!symbol) return;
      const wsUrl = \`wss://ws.binaryws.com/websockets/v3?app_id=1089\`;
      
      try {
          const ws = new WebSocket(wsUrl);
          wsRef.current = ws;
          ws.onopen = () => {
              if(!isActive()) { ws.close(); return; }
              // Send initial request (no subscribe!)
              const request = { ticks_history: symbol, adjust_start_time: 1, count: 2000, end: "latest", style: "candles", granularity: granularity };
              ws.send(JSON.stringify(request));
              
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = setInterval(() => {
                  if (isActive() && ws.readyState === WebSocket.OPEN) {
                      // Fetch the latest candles to update the current candle, again NO subscribe!
                      ws.send(JSON.stringify({ ticks_history: symbol, adjust_start_time: 1, count: 2, end: "latest", style: "candles", granularity: granularity }));
                  } else if (!isActive() && ws.readyState === WebSocket.OPEN) {
                      ws.close();
                  }
              }, 2000);
          };
          ws.onmessage = (event) => {
              if(!isActive()) return;
              try {
                  const msg = JSON.parse(event.data);
                  if (msg.error && msg.error.code === 'MarketIsClosed') {
                      setServerMarketClosed(true);
                      setMarketData([]);
                      return;
                  }
                  if (msg.error) {
                      isSyntheticRef.current = true;
                      return;
                  }
                  if (msg.msg_type === 'candles' && msg.candles) {
                      isSyntheticRef.current = false;
                      const candles: Candle[] = msg.candles.map((c: any) => ({ time: c.epoch * 1000, open: c.open, high: c.high, low: c.low, close: c.close })).filter((c: any) => !isNaN(c.close)); 
                      
                      const currentData = chartDataRef.current;
                      if (candles.length > 2 || currentData.length === 0) {
                          chartDataRef.current = candles;
                          setMarketData(candles);
                      } else {
                          // Merge latest candles
                          let hasChanges = false;
                          for (const incoming of candles) {
                              const lastCandle = currentData[currentData.length - 1];
                              if (incoming.time === lastCandle.time) {
                                  if (lastCandle.close !== incoming.close || lastCandle.high !== incoming.high || lastCandle.low !== incoming.low) {
                                      currentData[currentData.length - 1] = incoming;
                                      hasChanges = true;
                                  }
                              } else if (incoming.time > lastCandle.time) {
                                  currentData.push(incoming);
                                  if (currentData.length > 8000) currentData.shift();
                                  hasChanges = true;
                              }
                          }
                          if (hasChanges) {
                              setMarketData([...currentData]);
                          }
                      }
                  }
              } catch (e) { }
          };
          ws.onerror = (e) => { 
              if(isActive()) {
                  isSyntheticRef.current = true;
              }
          };
          ws.onclose = () => {
              if (isActive()) isSyntheticRef.current = true;
          };
      } catch (e) { 
          if(isActive()) {
              isSyntheticRef.current = true;
          }
      }
  };`;

if (!code.match(derivRegex)) {
    console.error("Could not find deriv function regex!");
} else {
    code = code.replace(derivRegex, newDerivEngine);
    fs.writeFileSync('App.tsx', code);
    console.log("Updated Deriv Engine to use Polling instead of Subscribing!");
}
