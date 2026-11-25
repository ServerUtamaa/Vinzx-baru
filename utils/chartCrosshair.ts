import { Asset, Candle, TimeFrame } from '../types';

export type CandleDirection = 'BULLISH' | 'BEARISH' | 'DOJI';

export type CandlePart =
  | 'CANDLE_BODY'
  | 'UPPER_WICK'
  | 'LOWER_WICK'
  | 'CANDLE_HIGH'
  | 'CANDLE_LOW'
  | 'ABOVE_CANDLE'
  | 'BELOW_CANDLE'
  | 'EMPTY_AREA';

export type MagnetPointKind = 'HIGH' | 'LOW' | 'OPEN' | 'CLOSE';

export interface MagnetSnapPoint {
  kind: MagnetPointKind;
  label: string;
  price: number;
  y: number;
}

export interface DetectedCandleInfo {
  index: number;
  centerX: number;
  candle: Candle; // With priceOffset already applied
  direction: CandleDirection;
  part: CandlePart;
  partLabel: string;
  partPriceLabel: string;
  partPriceValue: number;
  yHigh: number;
  yLow: number;
  yOpen: number;
  yClose: number;
  yBodyTop: number;
  yBodyBottom: number;
  magnetSnap: MagnetSnapPoint | null;
  deltaFromClose: number;
  deltaFromRefLabel: string;
  deltaFromRefValue: number;
}

export interface CrosshairAnalysis {
  x: number;
  y: number;
  price: number;
  timestampMs: number;
  timeAxisLabel: string;
  fullDateTimeLabel: string;
  realIndex: number;
  inEmptyArea: boolean;
  detected: DetectedCandleInfo | null;
}

export function getTimeframeMs(timeframe: TimeFrame): number {
  switch (timeframe) {
    case 'M1':
      return 60 * 1000;
    case 'M5':
      return 5 * 60 * 1000;
    case 'M15':
      return 15 * 60 * 1000;
    case 'M30':
      return 30 * 60 * 1000;
    case 'H1':
      return 60 * 60 * 1000;
    case 'H4':
      return 4 * 60 * 60 * 1000;
    case 'D1':
      return 24 * 60 * 60 * 1000;
  }
}

export function normalizeCandleTimestamp(rawTime: number): number {
  if (!Number.isFinite(rawTime) || rawTime <= 0) return Date.now();
  return rawTime < 1e12 ? rawTime * 1000 : rawTime;
}

export function priceFromY(
  y: number,
  chartHeight: number,
  minPrice: number,
  maxPrice: number
): number {
  const priceRange = maxPrice - minPrice;
  if (chartHeight <= 0 || !Number.isFinite(priceRange)) return minPrice;
  const ratio = (chartHeight - y) / chartHeight;
  return minPrice + ratio * priceRange;
}

export function yFromPrice(
  price: number,
  chartHeight: number,
  minPrice: number,
  maxPrice: number
): number {
  const priceRange = maxPrice - minPrice;
  if (priceRange === 0 || chartHeight <= 0) return chartHeight / 2;
  return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
}

export function formatCrosshairTimeLabels(
  timestampMs: number,
  timeframe: TimeFrame
): { axis: string; full: string } {
  const d = new Date(timestampMs);
  if (Number.isNaN(d.getTime())) {
    return { axis: '--:--', full: '--' };
  }

  try {
    const parts = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);

    const get = (t: string) => parts.find((p) => p.type === t)?.value || '';
    const day = get('day');
    const month = get('month');
    const year = get('year');
    const hour = get('hour').padStart(2, '0');
    const minute = get('minute').padStart(2, '0');

    const axis =
      timeframe === 'D1'
        ? `${day} ${month} ${year.slice(-2)}`
        : `${day} ${month} ${hour}:${minute}`;
    const full =
      timeframe === 'D1'
        ? `${day} ${month} ${year} · WIB`
        : `${day} ${month} ${year} · ${hour}:${minute} WIB`;
    return { axis, full };
  } catch {
    const iso = d.toISOString();
    return { axis: iso.slice(5, 16).replace('T', ' '), full: iso };
  }
}

export function detectCandleDirection(
  open: number,
  high: number,
  low: number,
  close: number,
  precision: number
): CandleDirection {
  const minTick = Math.pow(10, -Math.max(0, precision));
  const absBody = Math.abs(close - open);
  const totalRange = Math.max(0, high - low);

  if (absBody <= minTick * 1.5 || (totalRange > 0 && absBody <= totalRange * 0.05)) {
    return 'DOJI';
  }
  return close > open ? 'BULLISH' : 'BEARISH';
}

export function getPipDeltaString(diff: number, asset: Asset, precision: number): string {
  const sign = diff > 0 ? '+' : diff < 0 ? '-' : '';
  const abs = Math.abs(diff);
  const formattedDiff = abs.toFixed(precision);

  // Convert to pips for FX / Gold when helpful
  let pipsText = '';
  if (asset === Asset.XAUUSD) {
    pipsText = ` (${sign}${(abs * 10).toFixed(1)} pips)`;
  } else if (
    asset === Asset.EURUSD ||
    asset === Asset.GBPUSD ||
    asset === Asset.AUDUSD ||
    asset === Asset.USDCHF ||
    asset === Asset.NZDUSD
  ) {
    pipsText = ` (${sign}${(abs * 10000).toFixed(1)} pips)`;
  } else if (asset === Asset.USDJPY || asset === Asset.GBPJPY || asset === Asset.EURJPY) {
    pipsText = ` (${sign}${(abs * 100).toFixed(1)} pips)`;
  }

  return `${sign}${formattedDiff}${pipsText}`;
}

export interface AnalyzeCrosshairParams {
  x: number;
  y: number;
  chartWidth: number;
  chartHeight: number;
  data: Candle[];
  priceOffset: number;
  minPrice: number;
  maxPrice: number;
  rawStartIndex: number;
  candleUnit: number;
  renderWidth: number;
  gap: number;
  timeframe: TimeFrame;
  precision: number;
}

export function analyzeCrosshairPosition(params: AnalyzeCrosshairParams): CrosshairAnalysis {
  const {
    x,
    y,
    chartWidth,
    chartHeight,
    data,
    priceOffset,
    minPrice,
    maxPrice,
    rawStartIndex,
    candleUnit,
    renderWidth,
    gap,
    timeframe,
    precision,
  } = params;

  const clampedX = Math.max(0, Math.min(chartWidth, x));
  const clampedY = Math.max(0, Math.min(chartHeight, y));
  const price = priceFromY(clampedY, chartHeight, minPrice, maxPrice);
  const tfMs = getTimeframeMs(timeframe);

  let slotIndex = 0;
  if (candleUnit > 0) {
    slotIndex = Math.round((clampedX - renderWidth / 2) / candleUnit);
  }
  const realIndex = Math.floor(rawStartIndex) + slotIndex;
  const candleCenterX = slotIndex * candleUnit + renderWidth / 2;

  let timestampMs = Date.now();
  if (data.length > 0) {
    if (realIndex >= 0 && realIndex < data.length) {
      timestampMs = normalizeCandleTimestamp(data[realIndex].time);
    } else if (realIndex < 0) {
      timestampMs = normalizeCandleTimestamp(data[0].time) + realIndex * tfMs;
    } else {
      const lastIdx = data.length - 1;
      timestampMs = normalizeCandleTimestamp(data[lastIdx].time) + (realIndex - lastIdx) * tfMs;
    }
  }

  const timeLabels = formatCrosshairTimeLabels(timestampMs, timeframe);

  // Horizontal candle detection: never hallucinate a candle in empty areas before first / after last candle
  const horizontalHitRadius = Math.max(renderWidth / 2 + Math.min(gap / 2 + 1, 4), 4);
  const hasCandleAtX =
    data.length > 0 &&
    realIndex >= 0 &&
    realIndex < data.length &&
    Math.abs(clampedX - candleCenterX) <= horizontalHitRadius;

  if (!hasCandleAtX) {
    return {
      x: clampedX,
      y: clampedY,
      price,
      timestampMs,
      timeAxisLabel: timeLabels.axis,
      fullDateTimeLabel: timeLabels.full,
      realIndex,
      inEmptyArea: true,
      detected: null,
    };
  }

  const raw = data[realIndex];
  const candle: Candle = {
    time: normalizeCandleTimestamp(raw.time),
    open: raw.open + priceOffset,
    high: raw.high + priceOffset,
    low: raw.low + priceOffset,
    close: raw.close + priceOffset,
  };

  const direction = detectCandleDirection(
    candle.open,
    candle.high,
    candle.low,
    candle.close,
    precision
  );

  const yHigh = yFromPrice(candle.high, chartHeight, minPrice, maxPrice);
  const yLow = yFromPrice(candle.low, chartHeight, minPrice, maxPrice);
  const yOpen = yFromPrice(candle.open, chartHeight, minPrice, maxPrice);
  const yClose = yFromPrice(candle.close, chartHeight, minPrice, maxPrice);
  const yBodyTop = Math.min(yOpen, yClose);
  const yBodyBottom = Math.max(yOpen, yClose);

  // Smart non-intrusive magnetic snap detection (within 8px of O / H / L / C)
  const MAGNET_PX = 8;
  const candidates: MagnetSnapPoint[] = [
    { kind: 'HIGH', label: 'High', price: candle.high, y: yHigh },
    { kind: 'LOW', label: 'Low', price: candle.low, y: yLow },
    { kind: 'OPEN', label: 'Open', price: candle.open, y: yOpen },
    { kind: 'CLOSE', label: 'Close', price: candle.close, y: yClose },
  ];

  let magnetSnap: MagnetSnapPoint | null = null;
  let bestDist = MAGNET_PX + 0.001;
  for (const cand of candidates) {
    const dist = Math.abs(clampedY - cand.y);
    if (dist < bestDist) {
      bestDist = dist;
      magnetSnap = cand;
    }
  }

  // Classify exact vertical candle structure
  let part: CandlePart = 'EMPTY_AREA';
  let partLabel = 'Area Kosong';
  let partPriceLabel = 'Close';
  let partPriceValue = candle.close;

  const hasUpperWick = candle.high > Math.max(candle.open, candle.close);
  const hasLowerWick = candle.low < Math.min(candle.open, candle.close);

  if (Math.abs(clampedY - yHigh) <= 6) {
    part = 'CANDLE_HIGH';
    partLabel = 'Candle High';
    partPriceLabel = 'High';
    partPriceValue = candle.high;
  } else if (Math.abs(clampedY - yLow) <= 6) {
    part = 'CANDLE_LOW';
    partLabel = 'Candle Low';
    partPriceLabel = 'Low';
    partPriceValue = candle.low;
  } else if (clampedY >= yBodyTop - 2 && clampedY <= yBodyBottom + 2) {
    part = 'CANDLE_BODY';
    partLabel = 'Candle Body';
    partPriceLabel = Math.abs(clampedY - yOpen) <= Math.abs(clampedY - yClose) ? 'Open' : 'Close';
    partPriceValue = partPriceLabel === 'Open' ? candle.open : candle.close;
  } else if (clampedY >= yHigh - 6 && clampedY < yBodyTop - 2) {
    part = hasUpperWick ? 'UPPER_WICK' : 'CANDLE_HIGH';
    partLabel = hasUpperWick ? 'Upper Wick' : 'Candle High';
    partPriceLabel = 'High';
    partPriceValue = candle.high;
  } else if (clampedY > yBodyBottom + 2 && clampedY <= yLow + 6) {
    part = hasLowerWick ? 'LOWER_WICK' : 'CANDLE_LOW';
    partLabel = hasLowerWick ? 'Lower Wick' : 'Candle Low';
    partPriceLabel = 'Low';
    partPriceValue = candle.low;
  } else if (clampedY < yHigh - 6) {
    part = 'ABOVE_CANDLE';
    partLabel = 'Di Atas High';
    partPriceLabel = 'High';
    partPriceValue = candle.high;
  } else {
    part = 'BELOW_CANDLE';
    partLabel = 'Di Bawah Low';
    partPriceLabel = 'Low';
    partPriceValue = candle.low;
  }

  const deltaFromClose = price - candle.close;
  const deltaFromRefLabel = magnetSnap ? `Δ ${magnetSnap.label}` : `Δ ${partPriceLabel}`;
  const deltaFromRefValue = magnetSnap ? price - magnetSnap.price : price - partPriceValue;

  return {
    x: clampedX,
    y: clampedY,
    price,
    timestampMs,
    timeAxisLabel: timeLabels.axis,
    fullDateTimeLabel: timeLabels.full,
    realIndex,
    inEmptyArea: false,
    detected: {
      index: realIndex,
      centerX: candleCenterX,
      candle,
      direction,
      part,
      partLabel,
      partPriceLabel,
      partPriceValue,
      yHigh,
      yLow,
      yOpen,
      yClose,
      yBodyTop,
      yBodyBottom,
      magnetSnap,
      deltaFromClose,
      deltaFromRefLabel,
      deltaFromRefValue,
    },
  };
}
