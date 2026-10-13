/**
 * UpdateChecker Service (Native + Web safe)
 *
 * Checks for continuous nightly builds published to:
 * https://api.github.com/repos/Ahmadnedariya786/Noor-connect/releases/tags/nightly
 *
 * Version comparison logic:
 * 1. Primary: Compare running build's VITE_BUILD_COMMIT against the release commit SHA.
 *    - If running commit EQUALS release commit → NO update (hide banner).
 *    - If running commit DIFFERS from release commit → update available.
 * 2. Fallback: If commit SHA is missing, compare release published_at against VITE_BUILD_TIME.
 * 3. Dismissal: Dismissing the banner records the dismissed commit SHA in localStorage so
 *    it never displays again for that same commit.
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
    // silent clipboard fallback - try execCommand
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
    // silent clipboard fallback
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
  publishedAt: string; // ISO 8601 string
  commitSha?: string;  // Extracted commit SHA
  apkUrl: string;
  htmlUrl: string;
  body?: string;
  sizeBytes?: number;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentBuildTime: string;
  currentBuildCommit: string;
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
    // silent date comparison fallback
    return false;
  }
}

/**
 * Extract commit SHA from release body, target_commitish, or metadata.
 */
export function extractCommitFromRelease(body?: string | null, targetCommitish?: string | null): string | null {
  if (body) {
    // 1. Direct machine-readable line: commit: <sha>
    const directMatch = body.match(/^commit:\s*([0-9a-f]{7,40})/im) ||
                        body.match(/commit:\s*([0-9a-f]{7,40})/i);
    if (directMatch?.[1]) {
      return directMatch[1].toLowerCase();
    }

    // 2. Markdown line: - **Commit SHA:** `<sha>` or - **Commit:** `<sha>`
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
 * Evaluates whether an update is available:
 * - If both commit SHAs are present: true ONLY if they differ; false if they equal.
 * - If commit SHA is missing: falls back to comparing published_at against buildTime.
 */
export function isUpdateAvailable(
  release: { commitSha?: string | null; publishedAt?: string | null } | null,
  local: { commitSha?: string | null; buildTime?: string | null }
): boolean {
  if (!release) return false;

  const localCommit = local.commitSha?.trim().toLowerCase();
  const remoteCommit = release.commitSha?.trim().toLowerCase();

  // 1. Primary: Compare by commit identity
  if (localCommit && remoteCommit && localCommit !== 'unknown' && remoteCommit !== 'unknown') {
    // Running build EQUALS release commit → NO update: hide banner entirely
    if (isSameCommit(localCommit, remoteCommit)) {
      return false;
    }
    // SHAs differ → Update available
    return true;
  }

  // 2. Fallback: published_at comparison only when SHA is missing
  return isRemoteNewer(release.publishedAt, local.buildTime);
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
    // silent storage read fallback
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
    // silent storage quota fallback
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
        await Browser.open({ url: directApkUrl, windowName: '_system' });
        return;
      } catch (browserErr) {
        console.warn('[UpdateChecker] Native Browser.open({ windowName: "_system" }) failed:', browserErr);
        showBrowserOpenFailureToast(directApkUrl);
        return;
      }
    }

    // Web / PWA fallback: open via Browser plugin with _system target
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: directApkUrl, windowName: '_system' });
    } catch (webErr) {
      console.warn('[UpdateChecker] Web Browser plugin fallback:', webErr);
      const opened = window.open(directApkUrl, '_system');
      if (!opened) {
        showBrowserOpenFailureToast(directApkUrl);
      }
    }
  } catch (err) {
    console.warn('[UpdateChecker] Failed to open download url:', err);
    showBrowserOpenFailureToast(directApkUrl);
  }
}

/**
 * Check for updates against GitHub Releases API with 8s timeout and 6h caching.
 */
export async function checkNightlyUpdate(force = false): Promise<UpdateCheckResult> {
  const currentBuildTime = BUILD_TIME;
  const currentBuildCommit = BUILD_COMMIT;

  // 1. Check cache first (unless force check requested)
  if (!force) {
    const cached = readCache();
    if (cached && typeof cached.lastChecked === 'number') {
      const age = Date.now() - cached.lastChecked;
      if (age < CHECK_INTERVAL_MS) {
        const hasUpdate = isUpdateAvailable(cached.release, {
          commitSha: currentBuildCommit,
          buildTime: currentBuildTime,
        });
        return {
          hasUpdate,
          currentBuildTime,
          currentBuildCommit,
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
    // Add cache-busting parameter to prevent stale CDN / browser responses
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
          currentBuildTime,
          currentBuildCommit,
          release: null,
          lastChecked: Date.now(),
          fromCache: false,
        };
      }
      throw new Error(`GitHub API HTTP ${res.status}`);
    }

    const data = await res.json();
    const publishedAt = data.published_at || data.created_at;
    const commitSha = extractCommitFromRelease(data.body, data.target_commitish) || undefined;

    // Locate direct APK download URL from release assets
    // Sort assets in descending order by updated_at / created_at / ID so the LATEST APK is always picked
    let apkUrl = DIRECT_APK_FALLBACK_URL;
    let sizeBytes: number | undefined;

    if (Array.isArray(data.assets)) {
      const apkAssets = data.assets.filter((a: any) =>
        (typeof a?.name === 'string' && a.name.toLowerCase().endsWith('.apk')) ||
        a?.content_type === 'application/vnd.android.package-archive' ||
        (typeof a?.browser_download_url === 'string' && a.browser_download_url.toLowerCase().endsWith('.apk'))
      );

      apkAssets.sort((a: any, b: any) => {
        const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
        const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
        const timeA = isNaN(dateA) ? 0 : dateA;
        const timeB = isNaN(dateB) ? 0 : dateB;
        if (timeA !== timeB) {
          return timeB - timeA; // Descending: latest first
        }
        return (Number(b.id) || 0) - (Number(a.id) || 0);
      });

      const latestApk = apkAssets[0];
      if (latestApk?.browser_download_url) {
        apkUrl = latestApk.browser_download_url;
        sizeBytes = typeof latestApk.size === 'number' ? latestApk.size : undefined;
      }
    }

    const releaseInfo: NightlyReleaseInfo = {
      tagName: data.tag_name || 'nightly',
      releaseName: data.name || 'Nightly Build',
      publishedAt,
      commitSha,
      apkUrl: resolveDirectApkUrl(apkUrl),
      htmlUrl: data.html_url || `https://github.com/${GITHUB_REPO}/releases/tag/nightly`,
      body: data.body,
      sizeBytes,
    };

    writeCache(releaseInfo);

    const hasUpdate = isUpdateAvailable(releaseInfo, {
      commitSha: currentBuildCommit,
      buildTime: currentBuildTime,
    });

    return {
      hasUpdate,
      currentBuildTime,
      currentBuildCommit,
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
      const hasUpdate = isUpdateAvailable(cached.release, {
        commitSha: currentBuildCommit,
        buildTime: currentBuildTime,
      });
      return {
        hasUpdate,
        currentBuildTime,
        currentBuildCommit,
        release: cached.release,
        lastChecked: cached.lastChecked,
        fromCache: true,
        error: message,
      };
    }

    return {
      hasUpdate: false,
      currentBuildTime,
      currentBuildCommit,
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
    return 'Recent';
  }
}

/**
 * Record a dismissed commit SHA in localStorage so the banner is never shown again for that same commit.
 */
export function dismissUpdateCommit(commitSha?: string | null): void {
  if (!commitSha) return;
  try {
    localStorage.setItem(DISMISSED_COMMIT_KEY, commitSha.trim().toLowerCase());
  } catch {
    // Ignore storage issues
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
    // Ignore
  }
}
