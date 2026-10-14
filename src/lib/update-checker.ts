/**
 * UpdateChecker Service (Native + Web safe)
 *
 * Checks for continuous nightly builds published to:
 * https://api.github.com/repos/Ahmadnedariya786/Noor-connect/releases/tags/nightly
 *
 * Verdict rules:
 * UPDATE AVAILABLE if:
 *   (remoteCommit exists AND remoteCommit !== installedCommit)
 *   OR (latestApkUploadedAt parsed as Date is more than 60 seconds newer than installed build time).
 * Otherwise UP TO DATE.
 * If fetch or parse throws: verdict CHECK FAILED with the error message stored.
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
 * Evaluates whether an update is available according to strict verdict rules:
 * UPDATE AVAILABLE if:
 *   (remoteCommit exists AND remoteCommit !== installedCommit)
 *   OR (latestApkUploadedAt parsed as Date is more than 60 seconds newer than installed build time).
 * Otherwise UP TO DATE.
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

  // Rule 1: remoteCommit exists AND remoteCommit !== installedCommit
  const remoteCommitExists = Boolean(remoteCommit && remoteCommit.toLowerCase() !== 'unknown');
  const commitDiffers = remoteCommitExists && !isSameCommit(remoteCommit, installedCommit);

  // Rule 2: latestApkUploadedAt parsed as Date is more than 60 seconds newer than installed build time
  const assetDate = latestAssetUploadedAt ? new Date(latestAssetUploadedAt) : null;
  const appBuildDate = installedBuildTime ? new Date(installedBuildTime) : null;
  const assetTimeMs = assetDate && !isNaN(assetDate.getTime()) ? assetDate.getTime() : 0;
  const appBuildTimeMs = appBuildDate && !isNaN(appBuildDate.getTime()) ? appBuildDate.getTime() : 0;

  let isTimeNewer = false;
  if (assetTimeMs > 0 && appBuildTimeMs > 0) {
    // More than 60 seconds newer
    isTimeNewer = (assetTimeMs - appBuildTimeMs) > 60 * 1000;
  }

  const isAvailable = commitDiffers || isTimeNewer;

  // TASK 1 & 2: Detailed logging at every step (retained)
  console.log('[UpdateChecker] Local build info:', {
    currentBuildTime: installedBuildTime,
    appBuildDate: appBuildDate ? appBuildDate.toISOString() : null,
    currentBuildCommit: installedCommit || 'unknown',
  });
  console.log('[UpdateChecker] Latest APK asset uploaded_at:', {
    latestAssetUploadedAt,
    assetDate: assetDate ? assetDate.toISOString() : null,
  });
  console.log('[UpdateChecker] Comparison result (Is new?):', {
    isNew: isTimeNewer ? 'Yes' : 'No',
    isUpdateAvailable: isAvailable ? 'Yes' : 'No',
    assetTimeMs,
    appBuildTimeMs,
    diffSeconds: Math.round((assetTimeMs - appBuildTimeMs) / 1000),
  });
  console.log('Update Check:', {
    appBuildTime: installedBuildTime,
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
    const raw = localStorage.getItem(CACHE_KEY);
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
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem('noor_update_last_checked', now.toString());
  } catch {
    // Handled localStorage write fallback
  }
}

/**
 * Force download through the SYSTEM browser (Chrome) using Capacitor's Browser plugin
 * with windowName: '_system'. Never uses an in-app browser, iframe, or WebView.
 */
export async function downloadAndInstallUpdate(apkUrl?: string): Promise<void> {
  const directApkUrl = resolveDirectApkUrl(apkUrl);

  try {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({
          url: directApkUrl,
          windowName: '_system',
        });
        return;
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
    } catch (webErr) {
      // Handled window.open fallback failure
      console.warn('[UpdateChecker] Web Browser plugin fallback:', webErr);
      showBrowserOpenFailureToast(directApkUrl);
    }
  } catch (err) {
    // Final download launch catch block
    console.warn('[UpdateChecker] Failed to open download url:', err);
    showBrowserOpenFailureToast(directApkUrl);
  }
}

/**
 * Check for updates against GitHub Releases API with 8s timeout and 6h caching.
 * cache: 'no-store' AND ?t=<timestamp> applied to every network fetch.
 * Manual check (force = true) clears stored cache first and always refetches.
 */
export async function checkNightlyUpdate(force = false): Promise<UpdateCheckResult> {
  const currentBuildTime = BUILD_TIME;
  const currentBuildCommit = BUILD_COMMIT;

  // Log local app's build time/commit before checking
  console.log('[UpdateChecker] Local app build info:', {
    currentBuildTime,
    currentBuildCommit,
    forceCheck: force,
  });

  // 1. Manual check must clear stored last-check timestamp first and always refetch
  if (force) {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem('noor_update_last_checked');
      localStorage.removeItem('noor_last_update_check');
    } catch {
      // Handled storage clear fallback
    }
  } else {
    // Check cache first (unless force check requested)
    const cached = readCache();
    if (cached && typeof cached.lastChecked === 'number') {
      const age = Date.now() - cached.lastChecked;
      if (age < CHECK_INTERVAL_MS) {
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

  // 2. Fetch fresh release metadata with 8-second timeout, cache: 'no-store', and ?t=<timestamp>
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const requestUrl = `${NIGHTLY_API_URL}?t=${Date.now()}`;
    const res = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 404) {
        writeCache(null);
        return {
          hasUpdate: false,
          status: 'Up to date',
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
      }
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const data = await res.json();
    const publishedAt = data.published_at || data.created_at;

    // Parse remoteCommit: first match of regex /commit:\s*([0-9a-f]{7,40})/i in the release body (case-insensitive, allow missing)
    let remoteCommit: string | undefined = undefined;
    if (typeof data.body === 'string') {
      const match = data.body.match(/commit:\s*([0-9a-f]{7,40})/i);
      if (match && match[1]) {
        remoteCommit = match[1].toLowerCase();
      }
    }

    // Log fetched Release data (specifically the assets array)
    console.log('[UpdateChecker] Fetched Release data:', {
      tagName: data.tag_name,
      releaseName: data.name,
      targetCommitish: data.target_commitish,
      assetsCount: Array.isArray(data.assets) ? data.assets.length : 0,
      assets: data.assets,
    });

    // Parse latestApkUploadedAt: the MAX uploaded_at among assets whose name ends with .apk
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
        // Max uploaded_at (or updated_at / created_at fallback if uploaded_at key absent)
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

      // Log the uploaded_at timestamp of the .apk asset
      console.log('[UpdateChecker] APK asset selected:', {
        name: selectedApkAsset?.name,
        uploaded_at: latestApkUploadedAt,
        sizeBytes,
        apkUrl,
      });
    }

    const releaseInfo: NightlyReleaseInfo = {
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

    writeCache(releaseInfo);

    // 3. Verdict rules:
    // UPDATE AVAILABLE if (remoteCommit exists AND remoteCommit !== installedCommit)
    //                OR (latestApkUploadedAt parsed as Date is more than 60 seconds newer than installed build time).
    // Otherwise UP TO DATE.
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
      remoteCommit,
      latestApkUploadedAt: latestApkUploadedAt || undefined,
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
    // If fetch or parse throws: verdict CHECK FAILED with the error message stored
    const isTimeout = err?.name === 'AbortError';
    const message = isTimeout ? 'Request timed out (8s)' : (err?.message || 'Update check failed');

    console.warn('[UpdateChecker] Check failed:', message, err);

    return {
      hasUpdate: false,
      status: 'Check failed',
      statusReason: message,
      installedCommit: currentBuildCommit,
      installedBuildTime: currentBuildTime,
      currentBuildTime,
      currentBuildCommit,
      remoteCommit: undefined,
      latestApkUploadedAt: undefined,
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

/**
 * Check if the update banner was dismissed for this commit or session.
 */
export function isBannerDismissed(commitSha?: string | null): boolean {
  if (commitSha && isCommitDismissed(commitSha)) {
    return true;
  }
  try {
    return sessionStorage.getItem(DISMISSED_SESSION_KEY) === '1';
  } catch {
    // Handled sessionStorage read error
    return false;
  }
}

/**
 * Dismiss the update banner (persisting the commit SHA in localStorage).
 */
export function dismissBanner(commitSha?: string | null): void {
  if (commitSha) {
    dismissUpdateCommit(commitSha);
  }
  try {
    sessionStorage.setItem(DISMISSED_SESSION_KEY, '1');
  } catch {
    // Handled sessionStorage write error
  }
}
