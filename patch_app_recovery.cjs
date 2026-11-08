const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

const oldState = `  const [currentAsset, setCurrentAsset] = useState<Asset>(Asset.XAUUSD); 
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeFrame>('H4'); 
  const [marketData, setMarketData] = useState<Candle[]>([]); 
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);`;

const newState = `  const [currentAsset, setCurrentAsset] = useState<Asset>(() => {
      const saved = localStorage.getItem('SMART_SESSION_RECOVERY');
      if (saved) {
          try { return JSON.parse(saved).asset || Asset.XAUUSD; } catch (e) {}
      }
      return Asset.XAUUSD;
  });
  const [currentTimeframe, setCurrentTimeframe] = useState<TimeFrame>(() => {
      const saved = localStorage.getItem('SMART_SESSION_RECOVERY');
      if (saved) {
          try { return JSON.parse(saved).timeframe || 'H4'; } catch (e) {}
      }
      return 'H4';
  });
  const [marketData, setMarketData] = useState<Candle[]>([]); 
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
      const saved = localStorage.getItem('SMART_SESSION_RECOVERY');
      if (saved) {
          try { return JSON.parse(saved).analysis || null; } catch (e) {}
      }
      return null;
  });`;

code = code.replace(oldState, newState);

const oldPriceOffset = `  const [priceOffset, setPriceOffset] = useState<number>(0);`;
const newPriceOffset = `  const [priceOffset, setPriceOffset] = useState<number>(() => {
      const saved = localStorage.getItem('SMART_SESSION_RECOVERY');
      if (saved) {
          try { return JSON.parse(saved).priceOffset || 0; } catch (e) {}
      }
      return 0;
  });

  useEffect(() => {
      if (analysis) {
          localStorage.setItem('SMART_SESSION_RECOVERY', JSON.stringify({
              asset: currentAsset,
              timeframe: currentTimeframe,
              analysis: analysis,
              priceOffset: priceOffset
          }));
      }
  }, [analysis, currentAsset, currentTimeframe, priceOffset]);`;

code = code.replace(oldPriceOffset, newPriceOffset);

// Also need to initialize currentAssetRef
const oldAssetRef = `  const currentAssetRef = useRef<Asset>(Asset.XAUUSD);`;
const newAssetRef = `  const currentAssetRef = useRef<Asset>(currentAsset);`;
code = code.replace(oldAssetRef, newAssetRef);

fs.writeFileSync('App.tsx', code);
console.log('Patched App.tsx for Smart Session Recovery');
