import React from 'react';
import { ArrowLeft, Clock, Zap } from 'lucide-react';

interface SessionSchedulePageProps {
  clockTime: number;
  onBack: () => void;
}

interface SessionItem {
  id: string;
  code: string;
  name: string;
  city: string;
  hours: string;
  note: string;
  isActive: boolean;
  progressPct: number;
  accentText: string;
  activeSurface: string;
  progressFill: string;
}

function getWindowProgress(totalMinutes: number, startMin: number, endMin: number): number {
  const wrapsMidnight = endMin <= startMin;
  const duration = wrapsMidnight ? (24 * 60 - startMin + endMin) : (endMin - startMin);
  if (duration <= 0) return 0;

  let elapsed = -1;
  if (!wrapsMidnight) {
    if (totalMinutes >= startMin && totalMinutes < endMin) {
      elapsed = totalMinutes - startMin;
    }
  } else {
    if (totalMinutes >= startMin) {
      elapsed = totalMinutes - startMin;
    } else if (totalMinutes < endMin) {
      elapsed = (24 * 60 - startMin) + totalMinutes;
    }
  }

  if (elapsed < 0) return 0;
  return Math.min(100, Math.max(0, Math.round((elapsed / duration) * 100)));
}

export const SessionSchedulePage: React.FC<SessionSchedulePageProps> = ({ clockTime, onBack }) => {
  const sessionDate = new Date(clockTime);
  const timePartsWIB = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(sessionDate);

  const sHour = parseInt(timePartsWIB.find((p) => p.type === 'hour')?.value || '0', 10);
  const sMinute = parseInt(timePartsWIB.find((p) => p.type === 'minute')?.value || '0', 10);
  const sSecond = parseInt(timePartsWIB.find((p) => p.type === 'second')?.value || '0', 10);
  const sTotalMin = sHour * 60 + sMinute;
  const timeStrWIB = `${String(sHour).padStart(2, '0')}:${String(sMinute).padStart(2, '0')}:${String(sSecond).padStart(2, '0')}`;

  const isLondonActive = sTotalMin >= 14 * 60 && sTotalMin < 23 * 60;
  const isNewYorkActive = sTotalMin >= 20 * 60 || sTotalMin < 5 * 60;
  const isTokyoActive = sTotalMin >= 7 * 60 && sTotalMin < 16 * 60;
  const isAsiaActive = sTotalMin >= 5 * 60 && sTotalMin < 7 * 60;

  const sessions: SessionItem[] = [
    {
      id: 'asia',
      code: 'ASIA',
      name: 'Sesi Asia Pasifik',
      city: 'Sydney & Pasifik',
      hours: '05:00 — 07:00 WIB',
      note: 'Likuiditas awal pembukaan market Pasifik & pembentukan baseline Asian Range.',
      isActive: isAsiaActive,
      progressPct: getWindowProgress(sTotalMin, 5 * 60, 7 * 60),
      accentText: 'text-emerald-300',
      activeSurface: 'bg-[#0a0f18]/70 border-emerald-400/30',
      progressFill: 'bg-emerald-400/90',
    },
    {
      id: 'tokyo',
      code: 'TYO',
      name: 'Sesi Tokyo',
      city: 'Tokyo, Asia Timur',
      hours: '07:00 — 16:00 WIB',
      note: 'Pergerakan dominan pair JPY & AUD. Menjelang 14:00 mulai persiapan crossover ke sesi Eropa.',
      isActive: isTokyoActive,
      progressPct: getWindowProgress(sTotalMin, 7 * 60, 16 * 60),
      accentText: 'text-rose-300',
      activeSurface: 'bg-[#0f0b14]/70 border-rose-400/30',
      progressFill: 'bg-rose-400/90',
    },
    {
      id: 'london',
      code: 'LDN',
      name: 'Sesi London',
      city: 'London European Hub',
      hours: '14:00 — 23:00 WIB',
      note: 'Pusat volume transaksi forex terbesar global (~43%). Sering terjadi pembentukan Judas Swing & tren ekspansi harian.',
      isActive: isLondonActive,
      progressPct: getWindowProgress(sTotalMin, 14 * 60, 23 * 60),
      accentText: 'text-violet-300',
      activeSurface: 'bg-[#0d0c18]/70 border-violet-400/30',
      progressFill: 'bg-violet-400/90',
    },
    {
      id: 'newyork',
      code: 'NYC',
      name: 'Sesi New York',
      city: 'New York Wall Street',
      hours: '20:00 — 05:00 WIB',
      note: 'Pusat likuiditas USD & Gold (XAUUSD). Periode rilis berita High Impact tier-1 (NFP, CPI, FOMC, Fed Rate).',
      isActive: isNewYorkActive,
      progressPct: getWindowProgress(sTotalMin, 20 * 60, 5 * 60),
      accentText: 'text-sky-300',
      activeSurface: 'bg-[#0a101a]/70 border-sky-400/30',
      progressFill: 'bg-sky-400/90',
    },
  ];

  const activeNames = sessions.filter((s) => s.isActive).map((s) => s.name);

  return (
    <div className="absolute inset-0 z-[250] bg-[#05060b]/45 backdrop-blur-[6px] flex flex-col text-zinc-100 font-sans select-none overflow-hidden animate-in fade-in duration-200">
      {/* Top Page Navigation Bar (Translucent Frosted Glass) */}
      <header className="h-[52px] px-3 sm:px-5 border-b border-white/[0.09] bg-[#070910]/65 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[40px] px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] active:scale-[0.98] flex items-center gap-2 text-zinc-200 hover:text-white transition-all cursor-pointer shrink-0 whitespace-nowrap"
          aria-label="Kembali ke Chart"
        >
          <ArrowLeft className="w-4 h-4 text-zinc-300" />
          <span className="text-xs font-medium tracking-tight">Kembali</span>
        </button>

        <h2 className="text-xs sm:text-sm font-semibold text-white tracking-tight truncate">
          Jadwal 4 Sesi Trading Global
        </h2>

        <span className="text-[11px] font-mono text-zinc-300/80 shrink-0 whitespace-nowrap tabular-nums">
          WIB
        </span>
      </header>

      {/* Scrollable Page Content — Chart subtleness visible through gaps */}
      <main className="flex-1 overflow-y-auto custom-scrollbar px-4 sm:px-6 py-5">
        <div className="max-w-xl mx-auto w-full flex flex-col gap-5">
          {/* Live WIB Clock & Active Liquidity Hero Glass Strip */}
          <section className="px-4 py-3.5 rounded-2xl bg-[#090c14]/65 backdrop-blur-xl border border-white/[0.11] shadow-[0_8px_32px_rgba(0,0,0,0.32)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-zinc-400 truncate">
                  Rotasi Sesi Aktif
                </div>
                <div className="text-xs sm:text-[13px] font-semibold text-white truncate mt-0.5 tracking-tight">
                  {activeNames.length > 0 ? activeNames.join(' × ') : 'Transisi Pasar'}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-lg sm:text-xl font-mono font-bold text-emerald-400 tabular-nums leading-none tracking-tight">
                {timeStrWIB}
              </div>
              <div className="text-[10px] font-mono text-zinc-400 mt-1">
                Waktu Server WIB
              </div>
            </div>
          </section>

          {/* 4 Trading Sessions — Generous vertical gaps so the live chart breathes behind */}
          <div className="flex flex-col gap-5">
            {sessions.map((item, idx) => (
              <section
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-200 shadow-[0_10px_30px_rgba(0,0,0,0.28)] ${
                  item.isActive
                    ? item.activeSurface
                    : 'bg-[#080a10]/50 border-white/[0.08] hover:border-white/[0.14]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                      <span className="font-mono font-medium text-zinc-500 tabular-nums">
                        0{idx + 1}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="truncate text-zinc-300/80">{item.city}</span>
                    </div>
                    <h3
                      className={`text-[15px] font-semibold tracking-tight mt-1 ${
                        item.isActive ? item.accentText : 'text-zinc-100'
                      }`}
                    >
                      {item.name}
                    </h3>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-[10px] font-mono font-semibold tracking-wider ${
                        item.isActive ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {item.isActive ? 'SEDANG BERJALAN' : 'MENUNGGU'}
                    </div>
                    <div className="text-xs font-mono font-semibold text-zinc-100 tabular-nums mt-1">
                      {item.hours}
                    </div>
                  </div>
                </div>

                {item.isActive && (
                  <div className="mt-3.5 pt-3 border-t border-white/[0.07]">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                      <span>Progres Sesi</span>
                      <span className="font-mono tabular-nums text-zinc-200 font-medium">
                        {item.progressPct}%
                      </span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/[0.09] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${item.progressFill}`}
                        style={{ width: `${item.progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                <p className="mt-3 text-xs text-zinc-300/85 leading-relaxed">
                  {item.note}
                </p>
              </section>
            ))}
          </div>

          {/* Golden Liquidity Overlap Guide */}
          <section className="p-4 sm:p-5 rounded-2xl bg-[#090c14]/60 backdrop-blur-xl border border-amber-400/20 shadow-[0_8px_28px_rgba(0,0,0,0.28)]">
            <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs tracking-tight mb-1.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Golden Liquidity Overlap · 20:00 — 23:00 WIB</span>
            </div>
            <p className="text-xs text-zinc-300/85 leading-relaxed">
              Volatilitas tertinggi dan spread tertipis terjadi saat{' '}
              <span className="text-white font-medium">Overlap London &amp; New York (20:00 — 23:00 WIB)</span>
              {' '}serta{' '}
              <span className="text-white font-medium">Crossover Tokyo &amp; London (14:00 — 16:00 WIB)</span>.
              Ideal untuk eksekusi Smart Money Concept (SMC), Liquidity Sweep, dan Scalping M1–M5 pada XAUUSD serta Major Forex.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SessionSchedulePage;
