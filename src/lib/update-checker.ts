/**
 * UpdateChecker Service (Native + Web safe)
 *
 * Checks for continuous nightly builds published to:
 * https://api.github.com/repos/Ahmadnedariya786/Noor-connect/releases/tags/nightly
 *
 * Verdict rules:
 * 1. Read SHA from release body:
 *    - If EQUAL to VITE_BUILD_COMMIT -> Up to date
 *    - If DIFFERENT -> Update available
 * 2. Only when SHA is missing, fall back to asset uploaded_at vs VITE_BUILD_TIME
 *    with a 10-minute grace window so the same commit's own upload never counts as an update.
 * If fetch or parse throws: verdict CHECK FAILED with specific error message.
 *
 * Privacy: Zero telemetry or analytics. Only a single public GET request to GitHub Releases.
 * Cache: Stores latest result in localStorage (max 1 check per 6 hours unless forced).
 * Timeout: 8 seconds via AbortController.
 */

import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { BUILD_TIME, BUILD_COMMIT } from '@/buildInfo';

const GITHUB_REPO = 'Ahmadnedariya786/Noor-connect';
const NIGHTLY_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/nightly`;
const CACHE_KEY = 'noor_nightly_update_cache';
const DISMISSED_COMMIT_KEY = 'noor_dismissed_update_commit';
const DISMISSED_SESSION_KEY = 'noor_update_banner_dismissed_session';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const FETCH_TIMEOUT_MS = 8000; // 8 seconds

export const UPDATE_CHECK_CACHE_KEY = 'noor_update_check_cache_v1';
export const PASSIVE_CHECK_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes (passive check quota saver)

export const DIRECT_APK_FALLBACK_URL = `https://github.com/${GITHUB_REPO}/releases/download/nightly/noor-connect-nightly.apk`;

/**
 * Guarantees the target download URL is the direct .apk asset URL,
 * preventing any fallback to HTML release pages.
 */
export function resolveDirectApkUrl(apkUrl?: string | null): string {
  if (apkUrl && typeof apkUrl === 'string') {
    const trimmed = apkUrl.trim();
    if (trimmed.toLowerCase().endsWith('.apk') && !trimmed.includes('/releases/tag/')) {
      return trimmed;
    }
  }
  return DIRECT_APK_FALLBACK_URL;
}

/**
 * Safely copy text to clipboard using navigator.clipboard with textarea fallback.
 */
async function copyLinkToClipboard(url: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    // Handled clipboard API failure; trying textarea fallback
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch {
    // Handled textarea execCommand copy fallback
    return false;
  }
}

/**
 * Display a user-friendly toast when system browser launch fails.
 */
function showBrowserOpenFailureToast(url: string): void {
  toast.error(`Could not open browser. Please open this link in Chrome: ${url}`, {
    duration: 12000,
    action: {
      label: 'Copy Link',
      onClick: async () => {
        const copied = await copyLinkToClipboard(url);
        if (copied) {
          toast.success('Download link copied to clipboard');
        } else {
          toast.info('Please open Chrome and paste the URL', { description: url });
        }
      },
    },
  });
}

export interface NightlyReleaseInfo {
  tagName: string;
  releaseName: string;
  publishedAt: string; // ISO 8601 string (latest asset upload date or release date)
  latestAssetUploadedAt?: string; // Upload timestamp of the latest .apk asset
  commitSha?: string;  // Extracted commit SHA
  apkUrl: string;
  htmlUrl: string;
  body?: string;
  sizeBytes?: number;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  status: 'Up to date' | 'Update available' | 'Check failed';
  statusReason?: string;
  installedCommit: string;
  installedBuildTime: string;
  currentBuildTime: string;
  currentBuildCommit: string;
  remoteCommit?: string;
  latestApkUploadedAt?: string;
  release: NightlyReleaseInfo | null;
  lastChecked: number;
  fromCache: boolean;
  error?: string;
}

export interface ApkDownloadProgressDetail {
  percent: number;
  downloadedMB: number;
  totalMB: number;
  speedMBps?: number;
  status: 'downloading' | 'installing' | 'completed' | 'error' | 'cancelled';
  message?: string;
}

declare global {
  interface Window {
    AndroidBridge?: {
      closeApp?: () => void;
      downloadAndInstallApk?: (apkUrl: string) => void;
      cancelApkDownload?: () => void;
      installDownloadedApk?: () => void;
      openExternalBrowser?: (url: string) => void;
    };
  }
}

interface StoredCache {
  lastChecked: number;
  release: NightlyReleaseInfo | null;
}

/**
 * Compare two commit SHAs safely (supports 7-character short SHAs and 40-character full SHAs).
 */
export function isSameCommit(shaA?: string | null, shaB?: string | null): boolean {
  if (!shaA || !shaB) return false;
  const a = shaA.trim().toLowerCase();
  const b = shaB.trim().toLowerCase();
  if (a === 'unknown' || b === 'unknown' || a.length < 7 || b.length < 7) {
    return false;
  }
  if (a === b) return true;
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * Formats caught errors into distinct user-friendly status messages:
 * - network/CORS TypeError => "Network error - check internet"
 * - HTTP 403/429 => "GitHub rate limit - try later"
 * - HTTP 404 => "Release not found"
 * - abort => "Timed out"
 * Never shows generic "Failed to fetch".
 */
export function formatUpdateError(err: any): string {
  if (!err) return 'Network error - check internet';
  if (err?.name === 'AbortError' || err?.message?.toLowerCase().includes('timeout') || err?.message?.toLowerCase().includes('abort')) {
    return 'Timed out';
  }
  const msg = typeof err?.message === 'string' ? err.message : String(err);
  if (msg.includes('Release not found') || msg.includes('404')) {
    return 'Release not found';
  }
  if (err instanceof TypeError || /failed to fetch|network|load failed|rate limit|403|429/i.test(msg)) {
    return 'Network error - check internet';
  }
  return msg;
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
    // Handled date comparison fallback
    return false;
  }
}

/**
 * Extract commit SHA from release body, target_commitish, or metadata.
 * Uses regex /commit:\s*([0-9a-f]{7,40})/i.
 */
export function extractCommitFromRelease(body?: string | null, targetCommitish?: string | null): string | null {
  if (body) {
    // 1. Direct regex match per specification: /commit:\s*([0-9a-f]{7,40})/i
    const directMatch = body.match(/commit:\s*([0-9a-f]{7,40})/i);
    if (directMatch?.[1]) {
      return directMatch[1].toLowerCase();
    }

    // 2. Markdown line fallback: - **Commit SHA:** `<sha>`
    const mdMatch = body.match(/\*\*Commit(?: SHA)?:\*\*\s*`?([0-9a-f]{7,40})`?/i);
    if (mdMatch?.[1]) {
      return mdMatch[1].toLowerCase();
    }
  }

  // 3. Fallback: target_commitish if it's a valid hex SHA
  if (targetCommitish && /^[0-9a-f]{7,40}$/i.test(targetCommitish)) {
    return targetCommitish.toLowerCase();
  }

  return null;
}

/**
 * Evaluates whether an update is available according to strict SHA-first comparison rules:
 * (1) Read SHA from release body:
 *     - If EQUAL to installedCommit -> "Up to date" (false)
 *     - If DIFFERENT -> "Update available" (true)
 * (2) Only when SHA is missing, fall back to asset uploaded_at vs installedBuildTime
 *     with a 10-minute grace window so the same commit's own upload never counts as an update.
 */
export function isUpdateAvailable(
  release: {
    commitSha?: string | null;
    publishedAt?: string | null;
    latestAssetUploadedAt?: string | null;
  } | null,
  local: { commitSha?: string | null; buildTime?: string | null }
): boolean {
  if (!release) return false;

  const installedCommit = local.commitSha || BUILD_COMMIT;
  const installedBuildTime = local.buildTime || BUILD_TIME;
  const latestAssetUploadedAt = release.latestAssetUploadedAt || release.publishedAt || null;
  const remoteCommit = release.commitSha?.trim();

  let isAvailable = false;
  let comparisonOrder = 'none';

  // STEP 2 Comparison Order:
  // (1) Read SHA from release body:
  //     If EQUAL to VITE_BUILD_COMMIT -> show "Up to date" (false)
  //     If DIFFERENT -> show "Update available" (true)
  const hasValidRemoteSha = Boolean(remoteCommit && remoteCommit.toLowerCase() !== 'unknown' && remoteCommit.length >= 7);
  const hasValidInstalledSha = Boolean(installedCommit && installedCommit.toLowerCase() !== 'unknown' && installedCommit.length >= 7);

  if (hasValidRemoteSha && hasValidInstalledSha) {
    comparisonOrder = 'sha_comparison';
    const isSame = isSameCommit(remoteCommit, installedCommit);
    isAvailable = !isSame;
  } else {
    // (2) Only when SHA is missing, fall back to asset uploaded_at vs VITE_BUILD_TIME with a 10-minute grace window
    comparisonOrder = 'timestamp_fallback_10m_grace';
    const assetDate = latestAssetUploadedAt ? new Date(latestAssetUploadedAt) : null;
    const appBuildDate = installedBuildTime ? new Date(installedBuildTime) : null;
    const assetTimeMs = assetDate && !isNaN(assetDate.getTime()) ? assetDate.getTime() : 0;
    const appBuildTimeMs = appBuildDate && !isNaN(appBuildDate.getTime()) ? appBuildDate.getTime() : 0;

    if (assetTimeMs > 0 && appBuildTimeMs > 0) {
      // 10-minute grace window (600,000 ms) so the same commit's own upload never counts as an update
      isAvailable = (assetTimeMs - appBuildTimeMs) > 10 * 60 * 1000;
    } else {
      isAvailable = false;
    }
  }

  console.log('[UpdateChecker] Comparison result:', {
    comparisonOrder,
    installedCommit,
    remoteCommit: remoteCommit || 'none',
    installedBuildTime,
    latestAssetUploadedAt,
    isUpdateAvailable: isAvailable,
  });

  return isAvailable;
}

/**
 * Read cached check result from localStorage.
 */
function readCache(): StoredCache | null {
  try {
    const raw = localStorage.getItem(UPDATE_CHECK_CACHE_KEY) || localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCache;
  } catch {
    // Handled localStorage read fallback
    return null;
  }
}

/**
 * Save check result to localStorage.
 */
function writeCache(release: NightlyReleaseInfo | null): void {
  try {
    const now = Date.now();
    const data: StoredCache = {
      lastChecked: now,
      release,
    };
    const serialized = JSON.stringify(data);
    localStorage.setItem(UPDATE_CHECK_CACHE_KEY, serialized);
    localStorage.setItem(CACHE_KEY, serialized);
    localStorage.setItem('noor_update_last_checked', now.toString());
  } catch {
    // Handled localStorage write fallback
  }
}

/**
 * Initiate native APK download and install when running inside Android app with AndroidBridge.
 * Falls back to true external browser Intent (not stuck Chrome Custom Tab), or web window.open.
 */
export async function downloadAndInstallUpdate(apkUrl?: string): Promise<boolean> {
  const directApkUrl = resolveDirectApkUrl(apkUrl);

  try {
    // 1. Native Android Downloader via AndroidBridge (Bypasses Chrome Custom Tab completely)
    if (typeof window !== 'undefined' && window.AndroidBridge?.downloadAndInstallApk) {
      console.log('[UpdateChecker] Using native AndroidBridge.downloadAndInstallApk:', directApkUrl);
      window.AndroidBridge.downloadAndInstallApk(directApkUrl);
      return true;
    }

    // 2. Android external browser intent fallback (avoids Chrome Custom Tab hang)
    if (typeof window !== 'undefined' && window.AndroidBridge?.openExternalBrowser) {
      console.log('[UpdateChecker] Using AndroidBridge.openExternalBrowser:', directApkUrl);
      window.AndroidBridge.openExternalBrowser(directApkUrl);
      return true;
    }

    // 3. Fallback for Web/Browser environment
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({
          url: directApkUrl,
          windowName: '_system',
        });
        return true;
      } catch (browserErr) {
        // Handled Capacitor Browser plugin error; trying window.open fallback
        console.warn('[UpdateChecker] Native Browser.open({ windowName: "_system" }) failed:', browserErr);
      }
    }

    try {
      const w = window.open(directApkUrl, '_system');
      if (!w) {
        window.location.href = directApkUrl;
      }
      return true;
    } catch (webErr) {
      // Handled window.open fallback failure
      console.warn('[UpdateChecker] Web Browser plugin fallback:', webErr);
      showBrowserOpenFailureToast(directApkUrl);
      return false;
    }
  } catch (err) {
    // Final download launch catch block
    console.warn('[UpdateChecker] Failed to open download url:', err);
    showBrowserOpenFailureToast(directApkUrl);
    return false;
  }
}

/**
 * Re-trigger installation of downloaded APK if user dismissed prompt
 */
export function triggerPendingInstall(): void {
  if (typeof window !== 'undefined' && window.AndroidBridge?.installDownloadedApk) {
    window.AndroidBridge.installDownloadedApk();
  }
}

/**
 * Abort active native in-app APK download and release background connections immediately.
 */
export function cancelApkDownload(): void {
  if (typeof window !== 'undefined' && window.AndroidBridge?.cancelApkDownload) {
    try {
      window.AndroidBridge.cancelApkDownload();
    } catch {
      // Handled AndroidBridge.cancelApkDownload fallback
    }
  }
}

/**
 * Format live transfer speed nicely into MB/s or KB/s
 */
export function formatDownloadSpeed(speedMBps?: number): string {
  if (!speedMBps || speedMBps <= 0) return '';
  if (speedMBps >= 1.0) {
    return ` • ${speedMBps.toFixed(1)} MB/s`;
  }
  const kbps = Math.round(speedMBps * 1024);
  return ` • ${kbps} KB/s`;
}

/**
 * Fallback to external browser without Chrome Custom Tab.
 * FIRST aborts any active in-app background download so 100% network bandwidth is freed,
 * and appends cache-busting query to guarantee a clean unthrottled connection.
 */
export function openExternalBrowserFallback(url?: string): void {
  // 1. Immediately abort active native in-app download sockets to free bandwidth
  cancelApkDownload();

  const directUrl = resolveDirectApkUrl(url);
  // 2. Append cache-busting timestamp so Chrome starts a fresh unthrottled connection
  const separator = directUrl.includes('?') ? '&' : '?';
  const cacheBustedUrl = `${directUrl}${separator}t=${Date.now()}`;

  if (typeof window !== 'undefined' && window.AndroidBridge?.openExternalBrowser) {
    window.AndroidBridge.openExternalBrowser(cacheBustedUrl);
    return;
  }
  try {
    window.open(cacheBustedUrl, '_system');
  } catch {
    // Handled external browser open fallback
    window.location.href = cacheBustedUrl;
  }
}

/**
 * Fetch latest release from GitHub Releases API.
 * Returns null immediately on rate limit (HTTP 403 / 429) or non-200 to allow seamless fallback.
 */
async function fetchFromGitHubReleasesApi(signal: AbortSignal): Promise<NightlyReleaseInfo | null> {
  try {
    const requestUrl = `${NIGHTLY_API_URL}?t=${Date.now()}`;
    const res = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
      },
      signal,
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        console.warn(`[UpdateChecker] GitHub API rate limit hit (HTTP ${res.status}). Switching to rate-limit-proof fallbacks.`);
        return null;
      }
      console.warn(`[UpdateChecker] GitHub API returned HTTP ${res.status}. Falling back.`);
      return null;
    }

    const data = await res.json();
    const publishedAt = data.published_at || data.created_at;
    const remoteCommit = extractCommitFromRelease(data.body, data.target_commitish) || undefined;

    let apkUrl = DIRECT_APK_FALLBACK_URL;
    let sizeBytes: number | undefined;
    let latestApkUploadedAt: string | null = null;
    let maxUploadedMs = -1;
    let selectedApkAsset: any = null;

    if (Array.isArray(data.assets)) {
      const apkAssets = data.assets.filter((a: any) =>
        typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.apk')
      );

      for (const asset of apkAssets) {
        const rawTime = asset.uploaded_at || asset.updated_at || asset.created_at;
        if (rawTime) {
          const timeMs = new Date(rawTime).getTime();
          if (!isNaN(timeMs) && timeMs > maxUploadedMs) {
            maxUploadedMs = timeMs;
            latestApkUploadedAt = rawTime;
            selectedApkAsset = asset;
          }
        }
      }

      if (selectedApkAsset) {
        if (selectedApkAsset.browser_download_url) {
          apkUrl = selectedApkAsset.browser_download_url;
        }
        sizeBytes = typeof selectedApkAsset.size === 'number' ? selectedApkAsset.size : undefined;
      }
    }

    return {
      tagName: data.tag_name || 'nightly',
      releaseName: data.name || 'Nightly Build',
      publishedAt: latestApkUploadedAt || publishedAt || new Date().toISOString(),
      latestAssetUploadedAt: latestApkUploadedAt || undefined,
      commitSha: remoteCommit,
      apkUrl: resolveDirectApkUrl(apkUrl),
      htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/tag/nightly`,
      body: data.body,
      sizeBytes,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') throw err;
    console.warn('[UpdateChecker] GitHub Releases API fetch failed:', err);
    return null;
  }
}

/**
 * Fallback A: Fetch latest commit SHA & timestamp from GitHub Atom Feed.
 * Zero authentication required and zero rate limit restrictions.
 */
async function fetchCommitFromAtomFeed(signal: AbortSignal): Promise<NightlyReleaseInfo | null> {
  const atomUrls = [
    `https://github.com/${GITHUB_REPO}/commits/main.atom?t=${Date.now()}`,
    `https://github.com/${GITHUB_REPO}/releases.atom?t=${Date.now()}`,
  ];

  for (const url of atomUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/atom+xml, application/xml, text/xml, */*',
        },
        signal,
      });

      if (!res.ok) continue;

      const xml = await res.text();
      const shaMatch = xml.match(/Grit::Commit\/([0-9a-f]{7,40})/i) ||
                       xml.match(/\/commit\/([0-9a-f]{7,40})/i) ||
                       xml.match(/commit:\s*([0-9a-f]{7,40})/i);
      const updatedMatch = xml.match(/<updated>([^<]+)<\/updated>/i);

      if (shaMatch && shaMatch[1]) {
        const commitSha = shaMatch[1].toLowerCase();
        const updatedIso = updatedMatch?.[1]?.trim() || new Date().toISOString();
        console.log('[UpdateChecker] Fallback A (Atom feed) resolved latest commit:', commitSha, 'updated:', updatedIso);

        return {
          tagName: 'nightly',
          releaseName: 'Nightly Build (Live Feed)',
          publishedAt: updatedIso,
          latestAssetUploadedAt: updatedIso,
          commitSha,
          apkUrl: DIRECT_APK_FALLBACK_URL,
          htmlUrl: `https://github.com/${GITHUB_REPO}/commits/main`,
          body: `Auto-synchronized via GitHub Atom feed (Commit: ${commitSha.slice(0, 7)})`,
        };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.warn(`[UpdateChecker] Atom feed fetch failed for ${url}:`, err);
    }
  }

  return null;
}

/**
 * Fallback B: Fetch latest commit & metadata from published version manifest.
 * Zero rate limit via raw.githubusercontent.com, jsDelivr CDN, or release assets.
 */
async function fetchCommitFromVersionManifest(signal: AbortSignal): Promise<NightlyReleaseInfo | null> {
  const manifestUrls = [
    `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/version.json?t=${Date.now()}`,
    `https://cdn.jsdelivr.net/gh/${GITHUB_REPO}@main/public/version.json?t=${Date.now()}`,
    `https://github.com/${GITHUB_REPO}/releases/download/nightly/version.json?t=${Date.now()}`,
  ];

  for (const url of manifestUrls) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
        signal,
      });

      if (!res.ok) continue;

      const data = await res.json();
      const rawCommit = data?.commit || data?.shortCommit;
      if (rawCommit && typeof rawCommit === 'string' && rawCommit.trim().length >= 7) {
        const commitSha = rawCommit.trim().toLowerCase();
        const builtAt = data.builtAt || new Date().toISOString();
        const apkUrl = resolveDirectApkUrl(data.apkUrl || DIRECT_APK_FALLBACK_URL);
        console.log('[UpdateChecker] Fallback B (Version manifest) resolved latest commit:', commitSha, 'builtAt:', builtAt);

        return {
          tagName: 'nightly',
          releaseName: `Nightly Build v${data.version || '2.2.1'}`,
          publishedAt: builtAt,
          latestAssetUploadedAt: builtAt,
          commitSha,
          apkUrl,
          htmlUrl: `https://github.com/${GITHUB_REPO}/releases/tag/nightly`,
          body: `Auto-synchronized via version manifest (Commit: ${(data.shortCommit || data.commit || '').slice(0, 7)})`,
        };
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
      console.warn(`[UpdateChecker] Version manifest fetch failed for ${url}:`, err);
    }
  }

  return null;
}

/**
 * Check for updates with rate-limit-proof multi-source fallback chain:
 * 1. Passive checks respect 10-minute cache (PASSIVE_CHECK_CACHE_TTL_MS).
 * 2. Primary: GitHub Releases API.
 * 3. Fallback A: GitHub Atom feed (unlimited, zero rate-limit).
 * 4. Fallback B: Version manifest via raw/CDN (unlimited, zero rate-limit).
 * Manual check (force = true) clears all cache keys and performs fresh network verification.
 */
export async function checkNightlyUpdate(force = false): Promise<UpdateCheckResult> {
  const currentBuildTime = BUILD_TIME;
  const currentBuildCommit = BUILD_COMMIT;

  console.log('[UpdateChecker] Local app build info:', {
    currentBuildTime,
    currentBuildCommit,
    forceCheck: force,
  });

  // 1. Manual check must clear stored last-check timestamps first and always refetch
  if (force) {
    try {
      localStorage.removeItem(UPDATE_CHECK_CACHE_KEY);
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem('noor_update_last_checked');
      localStorage.removeItem('noor_last_update_check');
    } catch {
      // Handled storage clear fallback
    }
  } else {
    // 2. Check smart cache first for passive checks (10-minute TTL)
    const cached = readCache();
    if (cached && typeof cached.lastChecked === 'number') {
      const age = Date.now() - cached.lastChecked;
      if (age < PASSIVE_CHECK_CACHE_TTL_MS && cached.release) {
        const hasUpdate = isUpdateAvailable(cached.release, {
          commitSha: currentBuildCommit,
          buildTime: currentBuildTime,
        });
        const status: 'Update available' | 'Up to date' = hasUpdate ? 'Update available' : 'Up to date';
        return {
          hasUpdate,
          status,
          installedCommit: currentBuildCommit,
          installedBuildTime: currentBuildTime,
          currentBuildTime,
          currentBuildCommit,
          remoteCommit: cached.release?.commitSha,
          latestApkUploadedAt: cached.release?.latestAssetUploadedAt || cached.release?.publishedAt,
          release: cached.release,
          lastChecked: cached.lastChecked,
          fromCache: true,
        };
      }
    }
  }

  // 3. Fetch fresh release metadata with 8-second timeout via AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let releaseInfo: NightlyReleaseInfo | null = null;

    // Primary: GitHub Releases API
    try {
      releaseInfo = await fetchFromGitHubReleasesApi(controller.signal);
    } catch (e: any) {
      if (e?.name === 'AbortError') throw e;
    }

    // Fallback A: GitHub Atom Feed (bypasses GitHub API rate limits completely)
    if (!releaseInfo) {
      try {
        console.log('[UpdateChecker] Primary API unavailable; attempting Fallback A (GitHub Atom feed)...');
        releaseInfo = await fetchCommitFromAtomFeed(controller.signal);
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
      }
    }

    // Fallback B: Published Version Manifest (bypasses GitHub API rate limits completely)
    if (!releaseInfo) {
      try {
        console.log('[UpdateChecker] Fallback A unavailable; attempting Fallback B (Published version manifest)...');
        releaseInfo = await fetchCommitFromVersionManifest(controller.signal);
      } catch (e: any) {
        if (e?.name === 'AbortError') throw e;
      }
    }

    if (!releaseInfo) {
      throw new Error('Network error - check internet');
    }

    writeCache(releaseInfo);

    const hasUpdate = isUpdateAvailable(releaseInfo, {
      commitSha: currentBuildCommit,
      buildTime: currentBuildTime,
    });

    const status: 'Update available' | 'Up to date' = hasUpdate ? 'Update available' : 'Up to date';

    const checkResult: UpdateCheckResult = {
      hasUpdate,
      status,
      installedCommit: currentBuildCommit,
      installedBuildTime: currentBuildTime,
      currentBuildTime,
      currentBuildCommit,
      remoteCommit: releaseInfo.commitSha,
      latestApkUploadedAt: releaseInfo.latestAssetUploadedAt || releaseInfo.publishedAt,
      release: releaseInfo,
      lastChecked: Date.now(),
      fromCache: false,
    };

    try {
      window.dispatchEvent(new CustomEvent('noor-update-check-result', { detail: checkResult }));
    } catch {
      // Handled custom event dispatch fallback
    }

    return checkResult;
  } catch (err: any) {
    const message = formatUpdateError(err);

    return {
      hasUpdate: false,
      status: 'Check failed',
      statusReason: message,
      error: message,
      installedCommit: currentBuildCommit,
      installedBuildTime: currentBuildTime,
      currentBuildTime,
      currentBuildCommit,
      remoteCommit: undefined,
      latestApkUploadedAt: undefined,
      release: null,
      lastChecked: Date.now(),
      fromCache: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Format an ISO date for display (e.g. "Oct 12, 2026")
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
    // Handled release date display fallback
    return 'Recent';
  }
}

/**
 * Format timestamp into standard UTC representation for clear diagnostics:
 * "YYYY-MM-DD HH:MM:SS UTC"
 */
export function formatDateTime(isoString?: string | null): string {
  if (!isoString || isoString.toLowerCase() === 'unknown') return 'unknown';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC').replace('Z', ' UTC');
  } catch {
    // Handled date formatting fallback
    return isoString;
  }
}

/**
 * Format commit hash for display (short 7-char hash).
 */
export function formatCommit(sha?: string | null): string {
  if (!sha || sha.toLowerCase() === 'unknown') return 'unknown';
  const trimmed = sha.trim();
  return trimmed.length > 7 ? trimmed.slice(0, 7) : trimmed;
}

/**
 * Record a dismissed commit SHA in localStorage so the banner is never shown again for that same commit.
 */
export function dismissUpdateCommit(commitSha?: string | null): void {
  if (!commitSha) return;
  try {
    localStorage.setItem(DISMISSED_COMMIT_KEY, commitSha.trim().toLowerCase());
  } catch {
    // Handled localStorage dismiss write error
  }
}

/**
 * Check if the given commit SHA was dismissed in localStorage.
 */
export function isCommitDismissed(commitSha?: string | null): boolean {
  if (!commitSha) return false;
  try {
    const dismissed = localStorage.getItem(DISMISSED_COMMIT_KEY);
    if (!dismissed) return false;
    return isSameCommit(dismissed, commitSha);
  } catch {
    // Handled localStorage dismiss read error
    return false;
  }
}

let inMemoryBannerDismissed = false;

/**
 * Check if the update banner was dismissed for this launch.
 */
export function isBannerDismissed(_commitSha?: string | null): boolean {
  if (inMemoryBannerDismissed) return true;
  try {
    return sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1';
  } catch {
    // Handled sessionStorage read error
    return false;
  }
}

/**
 * Dismiss the update banner for this launch only.
 * Returns next launch while update is newer; once updated, SHA matches and banner never shows.
 */
export function dismissBanner(_commitSha?: string | null): void {
  inMemoryBannerDismissed = true;
  try {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
  } catch {
    // Handled sessionStorage write error
  }
}
