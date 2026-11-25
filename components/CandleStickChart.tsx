import { getTrueTime } from '../utils/time';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Candle, TimeFrame, Asset } from '../types';
import { checkMarketStatus } from '../utils/marketHours';
import { formatPrice, getAssetPrecision } from '../utils/priceFormatters';
import {
  analyzeCrosshairPosition,
  formatCrosshairTimeLabels,
  getPipDeltaString,
  normalizeCandleTimestamp,
} from '../utils/chartCrosshair';

interface ChartProps {
  data: Candle[];
  priceOffset: number;
  timeframe: TimeFrame;
  currentAsset: Asset;
  serverMarketClosed: boolean;
}

interface VisibleItem {
  x: number;
  index: number;
  candle: Candle | null;
}

const LONG_PRESS_DURATION_MS = 2000;
const AUTO_HIDE_AFTER_RELEASE_MS = 2000;
const HOLD_MOVE_TOLERANCE_PX = 8;

const CandleStickChart: React.FC<ChartProps> = ({
  data,
  priceOffset,
  timeframe,
  currentAsset,
  serverMarketClosed,
}) => {
  const Y_AXIS_WIDTH = 65;
  const TIME_AXIS_HEIGHT = 20;
  const INITIAL_CANDLE_WIDTH = 10;
  const MIN_CANDLE_WIDTH = 1;
  const MAX_CANDLE_WIDTH = 150;

  const [currentMarketStatus, setCurrentMarketStatus] = useState(checkMarketStatus(currentAsset));
  useEffect(() => {
    let status = checkMarketStatus(currentAsset);
    if (serverMarketClosed) status = { isOpen: false, message: 'MARKET TUTUP' };
    setCurrentMarketStatus(status);
    const interval = setInterval(() => {
      let st = checkMarketStatus(currentAsset);
      if (serverMarketClosed) st = { isOpen: false, message: 'MARKET TUTUP' };
      setCurrentMarketStatus(st);
    }, 60000);
    return () => clearInterval(interval);
  }, [currentAsset, serverMarketClosed]);
  const isMarketClosed = !currentMarketStatus.isOpen;

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [candleWidth, setCandleWidth] = useState(INITIAL_CANDLE_WIDTH);
  const [offsetX, setOffsetX] = useState(0);
  const [verticalOffset, setVerticalOffset] = useState(0);
  const [nextCandleLabel, setNextCandleLabel] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [manualRange, setManualRange] = useState<{ min: number; max: number } | null>(null);

  // MT5 Interactive Crosshair State
  const [crosshairActive, setCrosshairActive] = useState(false);
  const [crosshairPinned, setCrosshairPinned] = useState(false);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [holdIndicator, setHoldIndicator] = useState<{ x: number; y: number; progress: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairPinnedRef = useRef(false);
  const crosshairActiveRef = useRef(false);
  crosshairPinnedRef.current = crosshairPinned;
  crosshairActiveRef.current = crosshairActive;

  const holdTimerRef = useRef<number | null>(null);
  const holdAnimRef = useRef<number | null>(null);
  const releaseHideTimerRef = useRef<number | null>(null);

  const interactionRef = useRef<{
    startX: number;
    startY: number;
    localStartX: number;
    localStartY: number;
    startOffsetX: number;
    startVerticalOffset: number;
    startRange: { min: number; max: number };
    startPinchDist: number;
    startPinchWidth: number;
    mode: 'NONE' | 'CHART' | 'AXIS' | 'PINCH' | 'CROSSHAIR';
  }>({
    startX: 0,
    startY: 0,
    localStartX: 0,
    localStartY: 0,
    startOffsetX: 0,
    startVerticalOffset: 0,
    startRange: { min: 0, max: 0 },
    startPinchDist: 0,
    startPinchWidth: 0,
    mode: 'NONE',
  });

  const clearHoldTimers = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdAnimRef.current !== null) {
      window.clearInterval(holdAnimRef.current);
      holdAnimRef.current = null;
    }
    setHoldIndicator(null);
  }, []);

  const clearReleaseHideTimer = useCallback(() => {
    if (releaseHideTimerRef.current !== null) {
      window.clearTimeout(releaseHideTimerRef.current);
      releaseHideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearHoldTimers();
      clearReleaseHideTimer();
    };
  }, [clearHoldTimers, clearReleaseHideTimer]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const calculateCountdown = () => {
      const now = getTrueTime();
      let periodMs = 15 * 60 * 1000;
      switch (timeframe) {
        case 'M1':
          periodMs = 60 * 1000;
          break;
        case 'M5':
          periodMs = 5 * 60 * 1000;
          break;
        case 'M15':
          periodMs = 15 * 60 * 1000;
          break;
        case 'M30':
          periodMs = 30 * 60 * 1000;
          break;
        case 'H1':
          periodMs = 60 * 60 * 1000;
          break;
        case 'H4':
          periodMs = 4 * 60 * 60 * 1000;
          break;
        case 'D1':
          periodMs = 24 * 60 * 60 * 1000;
          break;
      }
      const nextTimestamp = (Math.floor(now / periodMs) + 1) * periodMs;
      const diff = nextTimestamp - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const label =
        hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
      setNextCandleLabel(label);
    };
    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // Escape key turns off crosshair anytime
  useEffect(() => {
    const onKeyDown = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && (crosshairActiveRef.current || crosshairPinnedRef.current)) {
        clearHoldTimers();
        clearReleaseHideTimer();
        setCrosshairPinned(false);
        setCrosshairActive(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [clearHoldTimers, clearReleaseHideTimer]);

  const { width, height } = dimensions;
  const chartWidth = Math.max(0, width - Y_AXIS_WIDTH);
  const chartHeight = Math.max(0, height - TIME_AXIS_HEIGHT);

  const renderWidth = candleWidth < 4 ? Math.round(candleWidth) : candleWidth;
  const gap = renderWidth <= 2 ? 0 : renderWidth < 10 ? 1 : Math.ceil(renderWidth * 0.2);
  const candleUnit = renderWidth + gap;
  const maxVisibleCandles = candleUnit > 0 ? Math.ceil(chartWidth / candleUnit) + 5 : 10;
  const rawStartIndex = data.length - maxVisibleCandles - offsetX;

  const { visibleItems, visibleMin, visibleMax } = useMemo(() => {
    if (data.length === 0 || width === 0) return { visibleItems: [], visibleMin: 0, visibleMax: 100 };
    const items: VisibleItem[] = [];
    let min = Infinity;
    let max = -Infinity;

    for (let i = 0; i < maxVisibleCandles; i++) {
      const realIndex = Math.floor(rawStartIndex + i);
      const x = i * candleUnit;

      if (realIndex >= 0 && realIndex < data.length) {
        const raw = data[realIndex];
        if (raw && !isNaN(raw.close)) {
          const c = {
            ...raw,
            open: raw.open + priceOffset,
            high: raw.high + priceOffset,
            low: raw.low + priceOffset,
            close: raw.close + priceOffset,
          };
          items.push({ x, index: realIndex, candle: c });
          if (c.low < min) min = c.low;
          if (c.high > max) max = c.high;
        }
      }
    }

    if (min === Infinity) {
      min = 0;
      max = 100;
    }

    const range = max - min;
    const padding = range === 0 ? max * 0.1 : range * 0.15;
    return { visibleItems: items, visibleMin: min - padding, visibleMax: max + padding };
  }, [data, rawStartIndex, maxVisibleCandles, priceOffset, candleUnit, width]);

  const rawMin = manualRange ? manualRange.min : visibleMin;
  const rawMax = manualRange ? manualRange.max : visibleMax;

  const minPrice = rawMin + verticalOffset;
  const maxPrice = rawMax + verticalOffset;
  const priceRange = maxPrice - minPrice;

  const getY = useCallback(
    (price: number) => {
      if (priceRange === 0 || chartHeight === 0) return chartHeight / 2;
      return chartHeight - ((price - minPrice) / priceRange) * chartHeight;
    },
    [chartHeight, minPrice, priceRange]
  );

  const clampToPlot = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0, insidePlot: false };
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      return {
        x: Math.max(0, Math.min(chartWidth, rawX)),
        y: Math.max(0, Math.min(chartHeight, rawY)),
        insidePlot: rawX >= 0 && rawX <= chartWidth && rawY >= 0 && rawY <= chartHeight,
      };
    },
    [chartWidth, chartHeight]
  );

  const scheduleAutoHideAfterRelease = useCallback(() => {
    clearReleaseHideTimer();
    if (crosshairPinnedRef.current) return;
    releaseHideTimerRef.current = window.setTimeout(() => {
      if (!crosshairPinnedRef.current) {
        setCrosshairActive(false);
      }
      releaseHideTimerRef.current = null;
    }, AUTO_HIDE_AFTER_RELEASE_MS);
  }, [clearReleaseHideTimer]);

  const toggleManualCrosshair = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      clearHoldTimers();
      clearReleaseHideTimer();
      setCrosshairPinned((prev) => {
        const next = !prev;
        if (next) {
          setCrosshairPos((pos) =>
            pos.x === 0 && pos.y === 0
              ? { x: Math.round(chartWidth * 0.5), y: Math.round(chartHeight * 0.5) }
              : {
                  x: Math.max(0, Math.min(chartWidth, pos.x)),
                  y: Math.max(0, Math.min(chartHeight, pos.y)),
                }
          );
          setCrosshairActive(true);
        } else {
          setCrosshairActive(false);
        }
        return next;
      });
    },
    [chartWidth, chartHeight, clearHoldTimers, clearReleaseHideTimer]
  );

  const handleStart = (cx: number, cy: number, e: any) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches && e.touches.length === 2) {
      clearHoldTimers();
      interactionRef.current = {
        ...interactionRef.current,
        startPinchDist: Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        ),
        startPinchWidth: candleWidth,
        mode: 'PINCH',
      };
      return;
    }

    const localX = cx - rect.left;
    const localY = cy - rect.top;
    const isAxis = localX > chartWidth;

    if (!isAxis && (crosshairPinnedRef.current || crosshairActiveRef.current)) {
      clearHoldTimers();
      clearReleaseHideTimer();
      const clampedX = Math.max(0, Math.min(chartWidth, localX));
      const clampedY = Math.max(0, Math.min(chartHeight, localY));
      setCrosshairPos({ x: clampedX, y: clampedY });
      setCrosshairActive(true);
      interactionRef.current = {
        ...interactionRef.current,
        startX: cx,
        startY: cy,
        localStartX: clampedX,
        localStartY: clampedY,
        mode: 'CROSSHAIR',
      };
      setIsDragging(false);
      return;
    }

    interactionRef.current = {
      startX: cx,
      startY: cy,
      localStartX: localX,
      localStartY: localY,
      startOffsetX: offsetX,
      startVerticalOffset: verticalOffset,
      startRange: manualRange ? { ...manualRange } : { min: visibleMin, max: visibleMax },
      startPinchDist: 0,
      startPinchWidth: 0,
      mode: isAxis ? 'AXIS' : 'CHART',
    };

    setIsDragging(true);
    if (isAxis && !manualRange) {
      setManualRange({ min: visibleMin, max: visibleMax });
    }

    // Start 2-second hold detector inside plot area (cancels automatically if finger/mouse moves > 8px)
    if (!isAxis && localY <= chartHeight) {
      clearHoldTimers();
      const pressStartedAt = Date.now();
      const clampedX = Math.max(0, Math.min(chartWidth, localX));
      const clampedY = Math.max(0, Math.min(chartHeight, localY));

      holdAnimRef.current = window.setInterval(() => {
        const elapsed = Date.now() - pressStartedAt;
        if (elapsed >= 250) {
          const pct = Math.min(1, elapsed / LONG_PRESS_DURATION_MS);
          setHoldIndicator({ x: clampedX, y: clampedY, progress: pct });
        }
      }, 50);

      holdTimerRef.current = window.setTimeout(() => {
        clearHoldTimers();
        clearReleaseHideTimer();
        interactionRef.current.mode = 'CROSSHAIR';
        setIsDragging(false);
        setCrosshairPos({ x: clampedX, y: clampedY });
        setCrosshairActive(true);
        try {
          if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
            navigator.vibrate(15);
          }
        } catch {
          // ignore vibration unsupported
        }
      }, LONG_PRESS_DURATION_MS);
    }
  };

  const handleMove = (cx: number, cy: number, e: any) => {
    if (interactionRef.current.mode === 'PINCH' && e.touches && e.touches.length === 2) {
      clearHoldTimers();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / interactionRef.current.startPinchDist;
      setCandleWidth(
        Math.max(MIN_CANDLE_WIDTH, Math.min(MAX_CANDLE_WIDTH, interactionRef.current.startPinchWidth * scale))
      );
      return;
    }

    if (interactionRef.current.mode === 'CROSSHAIR') {
      const { x, y } = clampToPlot(cx, cy);
      setCrosshairPos({ x, y });
      return;
    }

    // Desktop hover tracking when crosshair is manually pinned ON
    if (!isDragging && crosshairPinnedRef.current && e.type === 'mousemove') {
      const { x, y, insidePlot } = clampToPlot(cx, cy);
      if (insidePlot) {
        setCrosshairPos({ x, y });
      }
      return;
    }

    if (!isDragging || interactionRef.current.mode === 'NONE') return;

    const dy = cy - interactionRef.current.startY;
    const dx = cx - interactionRef.current.startX;

    // Cancel 2s hold if user intentionally drags chart
    if (Math.hypot(dx, dy) > HOLD_MOVE_TOLERANCE_PX) {
      clearHoldTimers();
    } else if (holdTimerRef.current !== null) {
      // Wait cleanly while user is holding still inside tolerance
      return;
    }

    if (interactionRef.current.mode === 'AXIS') {
      const scale = 1 + dy * 0.003;
      const center =
        (interactionRef.current.startRange.max + interactionRef.current.startRange.min) / 2;
      const span = interactionRef.current.startRange.max - interactionRef.current.startRange.min;
      setManualRange({ min: center - (span * scale) / 2, max: center + (span * scale) / 2 });
    } else if (interactionRef.current.mode === 'CHART') {
      const deltaOffset = (dx / candleUnit) * 1.5;
      const potentialOffset = interactionRef.current.startOffsetX + deltaOffset;
      const minOffset = -50;
      const maxOffset = data.length + 50;

      setOffsetX(Math.max(minOffset, Math.min(maxOffset, potentialOffset)));

      const currentPriceRange =
        interactionRef.current.startRange.max - interactionRef.current.startRange.min;
      const pixelToPriceRatio = chartHeight > 0 ? currentPriceRange / chartHeight : 0;
      const priceDiff = dy * pixelToPriceRatio;
      setVerticalOffset(interactionRef.current.startVerticalOffset + priceDiff);
    }
  };

  const handleEnd = () => {
    clearHoldTimers();
    const wasCrosshair = interactionRef.current.mode === 'CROSSHAIR';
    setIsDragging(false);
    interactionRef.current.mode = 'NONE';
    if (wasCrosshair && crosshairActiveRef.current && !crosshairPinnedRef.current) {
      scheduleAutoHideAfterRelease();
    }
  };

  const currentPrice = data.length > 0 ? data[data.length - 1].close + priceOffset : 0;
  const currentPriceY = getY(currentPrice);
  const precision = getAssetPrecision(currentAsset);

  const gridLines = [];
  const gridCount = Math.max(1, Math.floor(chartHeight / 50));
  for (let i = 0; i <= gridCount; i++) {
    gridLines.push(minPrice + priceRange * (i / gridCount));
  }

  // Bottom time scale ticks synced with visible candles
  const timeScaleTicks = useMemo(() => {
    if (data.length === 0 || chartWidth <= 0 || candleUnit <= 0) return [];
    const minLabelSpacingPx = 82;
    const stepSlots = Math.max(1, Math.ceil(minLabelSpacingPx / candleUnit));
    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i < maxVisibleCandles; i += stepSlots) {
      const x = i * candleUnit + renderWidth / 2;
      if (x < 24 || x > chartWidth - 110) continue;
      const realIndex = Math.floor(rawStartIndex + i);
      if (realIndex >= 0 && realIndex < data.length) {
        const ts = normalizeCandleTimestamp(data[realIndex].time);
        const { axis } = formatCrosshairTimeLabels(ts, timeframe);
        ticks.push({ x, label: axis });
      }
    }
    return ticks;
  }, [data, chartWidth, candleUnit, renderWidth, maxVisibleCandles, rawStartIndex, timeframe]);

  // Live Crosshair Analysis synced with Zoom, Pan, Price Scale, and Time Scale
  const crosshairAnalysis = useMemo(() => {
    if (!crosshairActive || chartWidth <= 0 || chartHeight <= 0) return null;
    return analyzeCrosshairPosition({
      x: crosshairPos.x,
      y: crosshairPos.y,
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
    });
  }, [
    crosshairActive,
    crosshairPos.x,
    crosshairPos.y,
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
  ]);

  if (!currentMarketStatus.isOpen) {
    const isHoliday = currentMarketStatus.message.includes('LIBUR');
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center text-red-500/80 gap-4"
      >
        <div className="text-6xl mb-2">🗿</div>
        <span className="text-[20px] tracking-[0.2em] font-black">
          {isHoliday ? 'MARKET LIBUR' : 'MARKET TUTUP'}
        </span>
        {isHoliday && (
          <span className="text-[16px] font-bold text-red-500/50">
            {currentMarketStatus.message.split('(')[1]?.replace(')', '') || ''}
          </span>
        )}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col items-center justify-center text-zinc-500 gap-2"
      >
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-[10px] tracking-[0.2em] font-black animate-pulse">
          CONNECTING ENGINE...
        </span>
      </div>
    );
  }

  const hudOnRight =
    crosshairAnalysis && crosshairAnalysis.x < chartWidth * 0.56 && crosshairAnalysis.y < 140;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full ${
        crosshairActive ? 'cursor-crosshair' : isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } select-none touch-none`}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY, e)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY, e)}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onContextMenu={(e) => {
        if (crosshairActive || crosshairPinned) {
          e.preventDefault();
          clearHoldTimers();
          clearReleaseHideTimer();
          setCrosshairPinned(false);
          setCrosshairActive(false);
        }
      }}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY, e)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY, e)}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onWheel={(e) => {
        setCandleWidth((prev) => {
          const step = prev < 5 ? 0.5 : prev < 10 ? 1 : 2;
          return Math.max(MIN_CANDLE_WIDTH, Math.min(MAX_CANDLE_WIDTH, prev + -Math.sign(e.deltaY) * step));
        });
      }}
      onDoubleClick={() => {
        if (!crosshairActive) {
          setManualRange(null);
          setOffsetX(0);
          setVerticalOffset(0);
          setCandleWidth(INITIAL_CANDLE_WIDTH);
        }
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible bg-[#050505]">
        <defs>
          <clipPath id="chart-area">
            <rect x="0" y="0" width={chartWidth} height={chartHeight} />
          </clipPath>
        </defs>

        {/* Horizontal Price Grid Lines */}
        {gridLines.map((p, i) => (
          <g key={i}>
            <line x1="0" y1={getY(p)} x2={width} y2={getY(p)} stroke="#141416" strokeWidth="1" />
            <text
              x={width - Y_AXIS_WIDTH + 6}
              y={getY(p) + 3}
              fill="#888890"
              fontSize="8.5"
              fontFamily="'JetBrains Mono', monospace"
            >
              {formatPrice(p, currentAsset)}
            </text>
          </g>
        ))}

        {/* Axis Dividers */}
        <line x1={chartWidth} y1={0} x2={chartWidth} y2={height} stroke="#222" />
        <line x1={0} y1={chartHeight} x2={width} y2={chartHeight} stroke="#1a1a20" />

        {/* Bottom Time Scale Ticks */}
        {timeScaleTicks.map((t, idx) => (
          <g key={idx}>
            <line x1={t.x} y1={chartHeight} x2={t.x} y2={chartHeight + 3} stroke="#2e2e38" strokeWidth="1" />
            <text
              x={t.x}
              y={chartHeight + 13}
              fill="#6f6f7b"
              fontSize="8"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* Candlestick Plot */}
        <g clipPath="url(#chart-area)">
          {/* Subtle highlight column behind pointed candle */}
          {crosshairAnalysis?.detected && (
            <rect
              x={crosshairAnalysis.detected.centerX - renderWidth / 2 - 1}
              y={0}
              width={Math.max(3, renderWidth + 2)}
              height={chartHeight}
              fill="rgba(255,255,255,0.045)"
            />
          )}

          {visibleItems.map((item) => {
            if (!item.candle) return null;
            const c = item.candle;
            const isUp = c.close >= c.open;
            const color = isUp ? '#ffffff' : '#a855f7';
            const y1 = getY(c.open);
            const y2 = getY(c.close);

            if (renderWidth < 3) {
              const snappedX = Math.floor(item.x) + 0.5;
              return (
                <line
                  key={item.index}
                  x1={snappedX}
                  y1={getY(c.high)}
                  x2={snappedX}
                  y2={getY(c.low)}
                  stroke={color}
                  strokeWidth={renderWidth}
                  shapeRendering={renderWidth === 1 ? 'crispEdges' : 'auto'}
                />
              );
            }

            const wickX = Math.floor(item.x + renderWidth / 2) + 0.5;
            const bodyHeight = Math.max(Math.abs(y1 - y2), 1);
            const bodyY = Math.min(y1, y2);

            return (
              <g key={item.index}>
                <line
                  x1={wickX}
                  y1={getY(c.high)}
                  x2={wickX}
                  y2={getY(c.low)}
                  stroke={color}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <rect
                  x={item.x}
                  y={bodyY}
                  width={renderWidth}
                  height={bodyHeight}
                  fill={color}
                  shapeRendering="crispEdges"
                />
              </g>
            );
          })}

          {/* Subtle Long-Press Charging Ring (visible during 2s hold activation) */}
          {holdIndicator && (
            <g pointerEvents="none">
              <circle
                cx={holdIndicator.x}
                cy={holdIndicator.y}
                r={16}
                fill="rgba(168,85,247,0.08)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="2"
              />
              <circle
                cx={holdIndicator.x}
                cy={holdIndicator.y}
                r={16}
                fill="none"
                stroke="#00ff9d"
                strokeWidth="2.5"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - holdIndicator.progress)}
                transform={`rotate(-90 ${holdIndicator.x} ${holdIndicator.y})`}
              />
            </g>
          )}
        </g>

        {/* Live Market Current Price Line & Tag */}
        {(() => {
          const isUp =
            data.length > 1 ? data[data.length - 1].close >= data[data.length - 2].close : true;
          const tagColor = isMarketClosed ? '#333333' : isUp ? '#00ff9d' : '#f43f5e';
          const textColor = isMarketClosed ? '#888888' : '#000000';
          const formattedCurrentPrice = formatPrice(currentPrice, currentAsset);
          return (
            <g>
              <line
                x1="0"
                y1={currentPriceY}
                x2={width}
                y2={currentPriceY}
                stroke={tagColor}
                strokeDasharray="3 3"
                opacity="0.85"
                strokeWidth="1"
              />
              <rect
                x={width - Y_AXIS_WIDTH + 2}
                y={currentPriceY - 9}
                width={Y_AXIS_WIDTH - 4}
                height={18}
                fill={tagColor}
                rx="3"
                filter="drop-shadow(0px 0px 4px rgba(0,0,0,0.6))"
              />
              <text
                x={width - Y_AXIS_WIDTH / 2}
                y={currentPriceY + 4}
                textAnchor="middle"
                fill={textColor}
                fontSize="9.5"
                fontWeight="bold"
                fontFamily="'JetBrains Mono', monospace"
              >
                {formattedCurrentPrice}
              </text>
            </g>
          );
        })()}

        {/* Next Candle Countdown */}
        <text
          x={chartWidth - 8}
          y={chartHeight + 13}
          fill="#777"
          fontSize="8.5"
          textAnchor="end"
          fontFamily="'JetBrains Mono', monospace"
          fontWeight="bold"
        >
          NEXT CANDLE: <tspan fill="#00ff9d">{nextCandleLabel}</tspan>
        </text>

        {/* MT5 ADVANCED INTERACTIVE CROSSHAIR OVERLAY */}
        {crosshairAnalysis && (
          <g pointerEvents="none">
            {/* Horizontal Price Crosshair Line */}
            <line
              x1={0}
              y1={crosshairAnalysis.y}
              x2={chartWidth}
              y2={crosshairAnalysis.y}
              stroke="#d4d4d8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.85"
            />
            {/* Vertical Time Crosshair Line */}
            <line
              x1={crosshairAnalysis.x}
              y1={0}
              x2={crosshairAnalysis.x}
              y2={chartHeight}
              stroke="#d4d4d8"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.85"
            />

            {/* Magnetic Anchor Ring on Detected Key Candle Point (Non-Intrusive) */}
            {crosshairAnalysis.detected?.magnetSnap && (
              <g>
                <line
                  x1={crosshairAnalysis.detected.centerX - 10}
                  y1={crosshairAnalysis.detected.magnetSnap.y}
                  x2={crosshairAnalysis.detected.centerX + 10}
                  y2={crosshairAnalysis.detected.magnetSnap.y}
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <circle
                  cx={crosshairAnalysis.detected.centerX}
                  cy={crosshairAnalysis.detected.magnetSnap.y}
                  r="4.5"
                  fill="rgba(56,189,248,0.18)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Center Intersection Reticle (+) */}
            <circle
              cx={crosshairAnalysis.x}
              cy={crosshairAnalysis.y}
              r="4"
              fill="none"
              stroke="#ffffff"
              strokeWidth="1.2"
              opacity="0.9"
            />
            <circle cx={crosshairAnalysis.x} cy={crosshairAnalysis.y} r="1.5" fill="#00ff9d" />

            {/* Crosshair Price Level Tag on Y-Axis */}
            {(() => {
              const labelY = Math.max(10, Math.min(chartHeight - 10, crosshairAnalysis.y));
              return (
                <g>
                  <rect
                    x={width - Y_AXIS_WIDTH + 2}
                    y={labelY - 9}
                    width={Y_AXIS_WIDTH - 4}
                    height={18}
                    fill="#f4f4f5"
                    rx="3"
                  />
                  <text
                    x={width - Y_AXIS_WIDTH / 2}
                    y={labelY + 3.5}
                    textAnchor="middle"
                    fill="#09090b"
                    fontSize="9.5"
                    fontWeight="bold"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {formatPrice(crosshairAnalysis.price, currentAsset)}
                  </text>
                </g>
              );
            })()}

            {/* Crosshair Time & Date Tag on Time-Axis */}
            {(() => {
              const tagW = Math.max(82, crosshairAnalysis.timeAxisLabel.length * 6.2 + 12);
              const tagX = Math.max(2, Math.min(chartWidth - tagW - 2, crosshairAnalysis.x - tagW / 2));
              return (
                <g>
                  <rect
                    x={tagX}
                    y={chartHeight + 2}
                    width={tagW}
                    height={16}
                    fill="#f4f4f5"
                    rx="3"
                  />
                  <text
                    x={tagX + tagW / 2}
                    y={chartHeight + 13}
                    textAnchor="middle"
                    fill="#09090b"
                    fontSize="8.5"
                    fontWeight="bold"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {crosshairAnalysis.timeAxisLabel}
                  </text>
                </g>
              );
            })()}
          </g>
        )}
      </svg>

      {/* MT5 Crosshair Real-Time OHLC & Smart Detection HUD */}
      {crosshairAnalysis && (
        <div
          className={`pointer-events-none absolute top-2 z-20 max-w-[235px] px-2.5 py-2 rounded-xl bg-[#0a0c12]/88 backdrop-blur-md border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.65)] text-[10px] leading-tight transition-all duration-150 ${
            hudOnRight ? 'right-[70px]' : 'left-2'
          }`}
        >
          {crosshairAnalysis.detected ? (
            (() => {
              const d = crosshairAnalysis.detected;
              const dirColor =
                d.direction === 'BULLISH'
                  ? 'text-emerald-400'
                  : d.direction === 'BEARISH'
                    ? 'text-rose-400'
                    : 'text-amber-300';
              return (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/10">
                    <span className={`font-mono font-bold tracking-wide ${dirColor}`}>
                      {d.direction}
                    </span>
                    <span className="text-[9.5px] font-medium text-zinc-200 truncate">
                      {d.partLabel}
                      {d.magnetSnap ? ` · ${d.magnetSnap.label}` : ''}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 font-mono text-[9.5px] tabular-nums">
                    <div className="flex justify-between gap-1">
                      <span className="text-zinc-400">O</span>
                      <span className="text-zinc-100">{formatPrice(d.candle.open, currentAsset)}</span>
                    </div>
                    <div className="flex justify-between gap-1">
                      <span className="text-zinc-400">H</span>
                      <span className="text-emerald-400">{formatPrice(d.candle.high, currentAsset)}</span>
                    </div>
                    <div className="flex justify-between gap-1">
                      <span className="text-zinc-400">L</span>
                      <span className="text-rose-400">{formatPrice(d.candle.low, currentAsset)}</span>
                    </div>
                    <div className="flex justify-between gap-1">
                      <span className="text-zinc-400">C</span>
                      <span className="text-zinc-100">{formatPrice(d.candle.close, currentAsset)}</span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-white/10 space-y-0.5 font-mono text-[9px] tabular-nums">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Level</span>
                      <span className="text-white font-semibold">
                        {formatPrice(crosshairAnalysis.price, currentAsset)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">{d.deltaFromRefLabel}</span>
                      <span
                        className={
                          d.deltaFromRefValue >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        }
                      >
                        {getPipDeltaString(d.deltaFromRefValue, currentAsset, precision)}
                      </span>
                    </div>
                    <div className="text-[8.5px] text-zinc-400 truncate">
                      {crosshairAnalysis.fullDateTimeLabel}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="space-y-1 font-mono text-[9.5px] tabular-nums">
              <div className="text-zinc-300 font-semibold pb-1 border-b border-white/10">
                AREA KOSONG
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-400">Harga</span>
                <span className="text-white font-semibold">
                  {formatPrice(crosshairAnalysis.price, currentAsset)}
                </span>
              </div>
              <div className="text-[8.5px] text-zinc-400">
                {crosshairAnalysis.fullDateTimeLabel}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Crosshair Toggle Button (+): Enable/Disable Anytime */}
      <button
        type="button"
        onClick={toggleManualCrosshair}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        title={
          crosshairPinned
            ? 'Matikan Crosshair MT5'
            : 'Aktifkan Crosshair MT5 (atau tahan chart 2 detik)'
        }
        aria-label={crosshairPinned ? 'Matikan Crosshair' : 'Aktifkan Crosshair'}
        className={`absolute bottom-[26px] left-2 z-30 min-w-[34px] min-h-[34px] px-2 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
          crosshairPinned || crosshairActive
            ? 'bg-purple-600/90 border-purple-400 text-white shadow-[0_4px_16px_rgba(168,85,247,0.4)]'
            : 'bg-[#0b0d14]/85 border-white/15 text-zinc-300 hover:text-white hover:border-white/30 backdrop-blur-md'
        }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M12 3v18M3 12h18" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
    </div>
  );
};

export default React.memo(CandleStickChart);
