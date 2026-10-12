/**
 * UpdateChecker Service (Native + Web safe)
 *
 * Checks for continuous nightly builds published to:
 * https://api.github.com/repos/Ahmadnedariya786/Noor-connect/releases/tags/nightly
 *
 * Privacy: Zero telemetry or analytics. Only a single public GET request to GitHub Releases.
 * Cache: Stores latest result in localStorage (max 1 check per 6 hours unless forced).
 * Timeout: 8 seconds via AbortController.
 */

import { Capacitor } from '@capacitor/core';
import { BUILD_TIME } from '@/buildInfo';

const GITHUB_REPO = 'Ahmadnedariya786/Noor-connect';
const NIGHTLY_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/nightly`;
const CACHE_KEY = 'noor_nightly_update_cache';
const DISMISSED_SESSION_KEY = 'noor_update_banner_dismissed_session';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 8000; // 8 seconds

export interface NightlyReleaseInfo {
  tagName: string;
  releaseName: string;
  publishedAt: string; // ISO 8601 string
  apkUrl: string;
  htmlUrl: string;
  body?: string;
  sizeBytes?: number;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentBuildTime: string;
  release: NightlyReleaseInfo | null;
  lastChecked: number;
  fromCache: boolean;
  error?: string;
}

interface StoredCache {
  lastChecked: number;
  release: NightlyReleaseInfo | null;
}

/**
 * Compare two ISO timestamps safely.
 * Returns true if remote ISO is newer than local ISO.
 */
export function isRemoteNewer(remoteIso?: string | null, localIso?: string | null): boolean {
  if (!remoteIso || !localIso) return false;
  try {
    const remoteTime = new Date(remoteIso).getTime();
    const localTime = new Date(localIso).getTime();
    return !isNaN(remoteTime) && !isNaN(localTime) && remoteTime > localTime;
  } catch {
    return false;
  }
}

/**
 * Read cached check result from localStorage.
 */
function readCache(): StoredCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCache;
  } catch {
    return null;
  }
}

/**
 * Save check result to localStorage.
 */
function writeCache(release: NightlyReleaseInfo | null): void {
  try {
    const data: StoredCache = {
      lastChecked: Date.now(),
      release,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota or disabled storage
  }
}

/**
 * Open the APK download URL in the system browser so Android's download manager handles it.
 */
export async function downloadAndInstallUpdate(apkUrl?: string): Promise<void> {
  const targetUrl = apkUrl || `https://github.com/${GITHUB_REPO}/releases/download/nightly/noor-connect-nightly.apk`;

  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: targetUrl });
        return;
      } catch (browserErr) {
        console.warn('[UpdateChecker] Native Browser plugin fallback:', browserErr);
      }
    }

    // Web or fallback
    const newWindow = window.open(targetUrl, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      window.location.href = targetUrl;
    }
  } catch (err) {
    console.warn('[UpdateChecker] Failed to open download url:', err);
    window.location.href = targetUrl;
  }
}

/**
 * Check for updates against GitHub Releases API with 8s timeout and 6h caching.
 */
export async function checkNightlyUpdate(force = false): Promise<UpdateCheckResult> {
  const currentBuildTime = BUILD_TIME;

  // 1. Check cache first (unless force check requested)
  if (!force) {
    const cached = readCache();
    if (cached && typeof cached.lastChecked === 'number') {
      const age = Date.now() - cached.lastChecked;
      if (age < CHECK_INTERVAL_MS) {
        const hasUpdate = isRemoteNewer(cached.release?.publishedAt, currentBuildTime);
        return {
          hasUpdate,
          currentBuildTime,
          release: cached.release,
          lastChecked: cached.lastChecked,
          fromCache: true,
        };
      }
    }
  }

  // 2. Fetch fresh release metadata with 8-second timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(NIGHTLY_API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      // 404 means no nightly release published yet — safe fallback
      if (res.status === 404) {
        writeCache(null);
        return {
          hasUpdate: false,
          currentBuildTime,
          release: null,
          lastChecked: Date.now(),
          fromCache: false,
        };
      }
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const data = await res.json();
    const publishedAt = data.published_at || data.created_at;

    // Locate the APK asset from release assets
    let apkUrl = `https://github.com/${GITHUB_REPO}/releases/download/nightly/noor-connect-nightly.apk`;
    let sizeBytes: number | undefined;

    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: any) =>
        (typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')) ||
        a.content_type === 'application/vnd.android.package-archive'
      );
      if (apkAsset?.browser_download_url) {
        apkUrl = apkAsset.browser_download_url;
        sizeBytes = apkAsset.size;
      }
    }

    const releaseInfo: NightlyReleaseInfo = {
      tagName: data.tag_name || 'nightly',
      releaseName: data.name || 'Nightly Build',
      publishedAt,
      apkUrl,
      htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/tag/nightly`,
      body: data.body,
      sizeBytes,
    };

    writeCache(releaseInfo);

    const hasUpdate = isRemoteNewer(publishedAt, currentBuildTime);

    return {
      hasUpdate,
      currentBuildTime,
      release: releaseInfo,
      lastChecked: Date.now(),
      fromCache: false,
    };
  } catch (err: any) {
    const isTimeout = err?.name === 'AbortError';
    const message = isTimeout ? 'Request timed out (8s)' : (err?.message || 'Update check failed');

    // On network failure, fall back to cached info if available
    const cached = readCache();
    if (cached?.release) {
      const hasUpdate = isRemoteNewer(cached.release.publishedAt, currentBuildTime);
      return {
        hasUpdate,
        currentBuildTime,
        release: cached.release,
        lastChecked: cached.lastChecked,
        fromCache: true,
        error: message,
      };
    }

    return {
      hasUpdate: false,
      currentBuildTime,
      release: null,
      lastChecked: Date.now(),
      fromCache: false,
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Format an ISO date for display (e.g. "Oct 12, 2026, 6:30 PM")
 */
export function formatReleaseDate(isoString?: string | null): string {
  if (!isoString) return 'Recent';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Recent';
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recent';
  }
}

/**
 * Check if the user dismissed the update banner for this session.
 */
export function isBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Dismiss the update banner for the active session.
 */
export function dismissBanner(): void {
  try {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
  } catch {
    // Ignore
  }
}
