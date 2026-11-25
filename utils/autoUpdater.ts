import { registerSW } from 'virtual:pwa-register';

declare const __VINZX_BUILD_ID__: string | undefined;

declare global {
  interface Window {
    __VINZX_MOUNTED__?: boolean;
    __vinzxForceHardRecover?: (reason: string) => void;
  }
}

const RELOAD_GUARD_KEY = 'vinzx_auto_reload_ts';
const RELOAD_VER_KEY = 'vinzx_auto_reload_ver';
const RELOAD_COUNT_KEY = 'vinzx_auto_reload_cnt';
const CLIENT_BUILD_KEY = 'vinzx_client_build_id';
const RELOAD_COOLDOWN_MS = 12000;
const CHECK_INTERVAL_MS = 45000;

let initialized = false;
let isReloading = false;
let baselineServerVersion: string | null = null;
let swRegistration: ServiceWorkerRegistration | undefined;
let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

function getCurrentBundleBuildId(): string {
  try {
    return typeof __VINZX_BUILD_ID__ === 'string' && __VINZX_BUILD_ID__ ? __VINZX_BUILD_ID__ : '';
  } catch {
    return '';
  }
}

function getCurrentEntryScriptPath(): string {
  try {
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    for (const s of scripts) {
      const src = s.getAttribute('src') || '';
      if (src.includes('/assets/')) {
        return new URL(src, window.location.origin).pathname;
      }
    }
  } catch {
    // ignore DOM/URL parse errors on legacy WebViews
  }
  return '';
}

function extractEntryScriptPathFromHtml(html: string): string {
  try {
    const match = html.match(/<script[^>]+src=["']([^"']*\/assets\/[^"']+\.js)["']/i);
    if (match && match[1]) {
      return new URL(match[1], window.location.origin).pathname;
    }
  } catch {
    // ignore regex/URL errors
  }
  return '';
}

function showUpdatingBanner() {
  try {
    if (typeof document === 'undefined' || !document.body) return;
    if (document.getElementById('vinzx-auto-update-banner')) return;
    const el = document.createElement('div');
    el.id = 'vinzx-auto-update-banner';
    el.style.cssText = [
      'position:fixed',
      'top:14px',
      'left:50%',
      'transform:translateX(-50%)',
      'z-index:999999',
      'background:rgba(15,15,20,0.95)',
      'border:1px solid rgba(168,85,247,0.65)',
      'color:#fff',
      'padding:10px 16px',
      'border-radius:12px',
      'font-family:"Roboto",Arial,Helvetica,sans-serif',
      'font-size:12px',
      'font-weight:700',
      'letter-spacing:0.04em',
      'box-shadow:0 8px 30px rgba(0,0,0,0.6)',
      'display:flex',
      'align-items:center',
      'gap:8px',
      'pointer-events:none'
    ].join(';');
    el.textContent = 'Memperbarui Vinzx AI ke versi terbaru...';
    document.body.appendChild(el);
  } catch {
    // ignore DOM banner errors
  }
}

async function clearServiceWorkerCachesOnly(): Promise<void> {
  try {
    if (typeof window !== 'undefined' && 'caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(cacheNames.map((name) => window.caches.delete(name)));
    }
  } catch {
    // ignore CacheStorage errors
  }
}

function canTriggerReload(targetVersion?: string): boolean {
  if (isReloading) return false;
  try {
    const lastTs = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
    const lastVer = sessionStorage.getItem(RELOAD_VER_KEY) || '';
    const count = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0');
    const now = Date.now();
    if (now - lastTs < RELOAD_COOLDOWN_MS) {
      return false;
    }
    if (now - lastTs < 120000 && count >= 2) {
      return false;
    }
    if (targetVersion && lastVer === targetVersion && now - lastTs < 60000) {
      return false;
    }
  } catch {
    // sessionStorage unavailable; still allow single reload guarded by in-memory flag
  }
  return true;
}

function buildCacheBustedUrl(): string {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_vinzx_u', String(Date.now()));
    return url.toString();
  } catch {
    return `/?_vinzx_u=${Date.now()}`;
  }
}

async function forceCleanUpdateAndReload(targetVersion?: string): Promise<void> {
  if (!canTriggerReload(targetVersion)) return;
  isReloading = true;

  try {
    const now = Date.now();
    const lastTs = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || '0');
    const prevCount = Number(sessionStorage.getItem(RELOAD_COUNT_KEY) || '0');
    sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    sessionStorage.setItem(RELOAD_COUNT_KEY, String((now - lastTs > 120000 ? 0 : prevCount) + 1));
    if (targetVersion) {
      sessionStorage.setItem(RELOAD_VER_KEY, targetVersion);
    }
  } catch {
    // ignore storage errors
  }

  showUpdatingBanner();

  // Clear stale asset/html CacheStorage entries while keeping localStorage login & user data safe
  await clearServiceWorkerCachesOnly();

  try {
    if (swRegistration) {
      await swRegistration.update();
      if (swRegistration.waiting) {
        swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    }
  } catch {
    // ignore SW update errors
  }

  try {
    if (updateSWFn) {
      await updateSWFn(false);
    }
  } catch {
    // ignore registerSW callback errors
  }

  // Overwrite Android WebView / OEM browser HTTP disk cache for root & index.html before navigating
  try {
    await Promise.all([
      fetch('/', { cache: 'reload' }).catch(() => {}),
      fetch('/index.html', { cache: 'reload' }).catch(() => {}),
    ]);
  } catch {
    // ignore cache-reload prewarm errors
  }

  setTimeout(() => {
    try {
      window.location.replace(buildCacheBustedUrl());
    } catch {
      window.location.reload();
    }
  }, 250);
}

async function checkHtmlEntryBundleMismatch(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const currentEntry = getCurrentEntryScriptPath();
  if (!currentEntry) return false; // Dev Vite serves /index.tsx directly

  try {
    const res = await fetch(`/index.html?_v=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) return false;
    const html = await res.text();
    const latestEntry = extractEntryScriptPathFromHtml(html);
    if (latestEntry && latestEntry !== currentEntry) {
      await forceCleanUpdateAndReload(`bundle:${latestEntry}`);
      return true;
    }
  } catch {
    // Ignore transient network errors
  }
  return false;
}

async function checkServerVersion(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    const res = await fetch(`/api/app-version?t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    if (!res.ok) return;
    const data = await res.json();
    const serverVersion = typeof data?.version === 'string' ? data.version : '';
    if (!serverVersion) return;

    if (!baselineServerVersion) {
      baselineServerVersion = serverVersion;
      return;
    }

    if (serverVersion !== baselineServerVersion) {
      baselineServerVersion = serverVersion;
      await forceCleanUpdateAndReload(`api:${serverVersion}`);
    }
  } catch {
    // Offline or transient network issue; retry on next focus/interval
  }
}

async function checkForUpdatesNow(): Promise<void> {
  try {
    if (swRegistration) {
      await swRegistration.update();
    }
  } catch {
    // ignore SW check errors
  }
  const bundleChanged = await checkHtmlEntryBundleMismatch();
  if (!bundleChanged) {
    await checkServerVersion();
  }
}

export function initAutoUpdater(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  try {
    const buildId = getCurrentBundleBuildId();
    if (buildId) {
      localStorage.setItem(CLIENT_BUILD_KEY, buildId);
    }
  } catch {
    // ignore storage errors
  }

  let hadController = false;
  try {
    hadController = Boolean('serviceWorker' in navigator && navigator.serviceWorker?.controller);
    if ('serviceWorker' in navigator && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) {
          void forceCleanUpdateAndReload('sw-controllerchange');
        } else {
          hadController = true;
        }
      });
    }
  } catch {
    // Older Android WebView without full SW support
  }

  // Catch Vite chunk preload errors when a new deploy invalidates old hashed chunks mid-session
  window.addEventListener('vite:preloadError', (event) => {
    try {
      event.preventDefault();
    } catch {
      // ignore
    }
    void forceCleanUpdateAndReload('vite-preload-error');
  });

  try {
    if ('serviceWorker' in navigator) {
      updateSWFn = registerSW({
        immediate: true,
        onRegisteredSW(_swUrl, registration) {
          swRegistration = registration;
          if (registration) {
            void registration.update().catch(() => {});
          }
        },
        onNeedRefresh() {
          void forceCleanUpdateAndReload('sw-refresh');
        },
        onOfflineReady() {
          // Ready offline
        },
      });
    }
  } catch {
    // Graceful fallback if registerSW throws on restricted OEM WebView
  }

  // Immediate cold-start verification (catches stale cached APK HTML/JS immediately!)
  void checkForUpdatesNow();

  // Re-check when user switches back to the APK or restores from Android/iOS bfcache
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkForUpdatesNow();
    }
  });

  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      void checkForUpdatesNow();
    }
  });

  window.addEventListener('focus', () => {
    void checkForUpdatesNow();
  });

  window.addEventListener('online', () => {
    void checkForUpdatesNow();
  });

  // Periodic background poll while APK stays open in memory
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      void checkForUpdatesNow();
    }
  }, CHECK_INTERVAL_MS);
}
