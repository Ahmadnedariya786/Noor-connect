import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Download, X, Check, ExternalLink, RotateCw } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  checkNightlyUpdate,
  downloadAndInstallUpdate,
  triggerPendingInstall,
  openExternalBrowserFallback,
  formatReleaseDate,
  formatCommit,
  isBannerDismissed,
  dismissBanner,
  type UpdateCheckResult,
  type ApkDownloadProgressDetail,
} from '@/lib/update-checker';
import { BUILD_COMMIT } from '@/buildInfo';

const LAST_AUTO_CHECK_KEY = 'noor_last_auto_check';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

// In-memory guard to ensure auto-check runs exactly once per app launch on Home mount
let autoCheckedThisLaunch = false;

export const UpdateBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => isBannerDismissed());
  const [downloadProgress, setDownloadProgress] = useState<ApkDownloadProgressDetail | null>(null);

  const runSilentUpdateCheck = useCallback(async () => {
    try {
      localStorage.setItem(LAST_AUTO_CHECK_KEY, Date.now().toString());
      // Silent cache-busted update check
      const res = await checkNightlyUpdate(true);
      if (res.hasUpdate && res.status === 'Update available') {
        const localCommit = BUILD_COMMIT || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) || '';
        const remoteCommit = res.release?.commitSha || '';
        // Verify release commit SHA differs from build commit
        if (remoteCommit && localCommit && remoteCommit.toLowerCase().startsWith(localCommit.toLowerCase())) {
          setUpdateInfo(null);
          return;
        }
        setUpdateInfo(res);
        setDismissed(isBannerDismissed());
      } else {
        setUpdateInfo(null);
      }
    } catch {
      // Handled silent background update check failure - no toast, no banner
      setUpdateInfo(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // 1. Silent auto-check on Home mount once per app launch
    if (!autoCheckedThisLaunch) {
      autoCheckedThisLaunch = true;
      runSilentUpdateCheck();
    }

    // 2. Resume-from-background check if older than 6 hours
    const handleResume = () => {
      if (!isMounted) return;
      try {
        const last = Number(localStorage.getItem(LAST_AUTO_CHECK_KEY) || '0');
        if (Date.now() - last > SIX_HOURS_MS) {
          runSilentUpdateCheck();
        }
      } catch {
        // silent fallback for resume check timestamp read
      }
    };

    // Listen to native app resume
    let appStateHandle: { remove: () => void } | null = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', (state) => {
        if (state.isActive) {
          handleResume();
        }
      }).then((handle) => {
        appStateHandle = handle;
      }).catch(() => {
        // silent fallback for capacitor appState listener
      });
    }

    // Listen to web document visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Also listen to any external check result (e.g. manual trigger in Settings)
    const handleUpdateResult = (e: CustomEvent<UpdateCheckResult>) => {
      if (isMounted && e.detail) {
        if (e.detail.hasUpdate && e.detail.status === 'Update available') {
          setUpdateInfo(e.detail);
          setDismissed(isBannerDismissed());
        } else {
          setUpdateInfo(null);
        }
      }
    };

    // Listen to native APK download progress dispatched from MainActivity.java
    const handleApkProgress = (e: CustomEvent<ApkDownloadProgressDetail>) => {
      if (isMounted && e.detail) {
        setDownloadProgress(e.detail);
      }
    };

    window.addEventListener('noor-update-check-result', handleUpdateResult as EventListener);
    window.addEventListener('apkDownloadProgress', handleApkProgress as EventListener);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('noor-update-check-result', handleUpdateResult as EventListener);
      window.removeEventListener('apkDownloadProgress', handleApkProgress as EventListener);
      if (appStateHandle) {
        try {
          appStateHandle.remove();
        } catch {
          // silent fallback on listener cleanup
        }
      }
    };
  }, [runSilentUpdateCheck]);

  if (!updateInfo?.hasUpdate || dismissed) {
    return null;
  }

  const handleInstall = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (downloadProgress?.status === 'installing' || downloadProgress?.status === 'completed') {
      triggerPendingInstall();
      return;
    }
    downloadAndInstallUpdate(updateInfo.release?.apkUrl);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissBanner();
    setDismissed(true);
  };

  const handleBrowserFallback = (e: React.MouseEvent) => {
    e.stopPropagation();
    openExternalBrowserFallback(updateInfo.release?.apkUrl);
  };

  const isDownloading = downloadProgress?.status === 'downloading';
  const isInstalledOrReady = downloadProgress?.status === 'installing' || downloadProgress?.status === 'completed';
  const isError = downloadProgress?.status === 'error';

  const subtitle = updateInfo.release?.publishedAt
    ? `Nightly build · ${formatReleaseDate(updateInfo.release.publishedAt)}`
    : (updateInfo.release?.commitSha ? `Commit: ${formatCommit(updateInfo.release.commitSha)}` : 'Nightly build');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleInstall}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleInstall();
        }
      }}
      className="relative overflow-hidden p-3.5 rounded-2xl border transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-2.5 text-left animate-in fade-in slide-in-from-top-2 duration-300 select-none shadow-lg mb-3"
      style={{
        background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 100%)',
        borderColor: 'var(--border)',
        boxShadow: '0 4px 18px var(--accent-glow)',
      }}
      aria-label="Update available, tap to install"
    >
      <div className="flex items-center justify-between gap-3 w-full">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: isInstalledOrReady ? 'var(--success)' : 'var(--accent)',
              color: 'var(--on-accent)',
            }}
          >
            {isInstalledOrReady ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : isDownloading ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 fill-current" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className="text-xs font-bold tracking-wide leading-tight truncate"
              style={{ color: 'var(--accent-text)' }}
            >
              {isDownloading
                ? `Downloading update... ${downloadProgress.percent >= 0 ? downloadProgress.percent + '%' : ''}`
                : isInstalledOrReady
                ? '✓ Downloaded! Launching Installer...'
                : isError
                ? 'Download failed'
                : 'Update available'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate pt-0.5">
              {isDownloading
                ? `${downloadProgress.downloadedMB.toFixed(1)} MB / ${downloadProgress.totalMB > 0 ? downloadProgress.totalMB.toFixed(1) + ' MB' : '...'}`
                : isError
                ? (downloadProgress.message || 'Tap to retry')
                : subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {isInstalledOrReady ? (
            <button
              type="button"
              onClick={handleInstall}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
              }}
            >
              <Download className="w-3 h-3" />
              <span>Install Now</span>
            </button>
          ) : isDownloading ? (
            <div
              className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)',
                border: '1px solid var(--border)',
              }}
            >
              {downloadProgress.percent >= 0 ? `${downloadProgress.percent}%` : '...'}
            </div>
          ) : isError ? (
            <button
              type="button"
              onClick={handleInstall}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)',
                border: '1px solid var(--border)',
              }}
            >
              <RotateCw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          ) : (
            <div
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent-text)',
                border: '1px solid var(--border)',
              }}
            >
              <Download className="w-3 h-3" />
              <span>Install</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 text-muted-foreground/60 hover:text-foreground rounded-lg transition-colors"
            aria-label="Dismiss update banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Live Glowing Download Progress Bar */}
      {isDownloading && (
        <div className="w-full h-1.5 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.max(5, Math.min(100, downloadProgress.percent >= 0 ? downloadProgress.percent : 15))}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              boxShadow: '0 0 10px var(--accent-glow)',
            }}
          />
        </div>
      )}

      {/* Secondary Browser Fallback Link */}
      {(isDownloading || isInstalledOrReady || isError) && (
        <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground/80">
          <span>Stuck or prompt dismissed?</span>
          <button
            type="button"
            onClick={handleBrowserFallback}
            className="inline-flex items-center gap-1 text-[var(--accent-text)] hover:underline font-medium"
          >
            <span>Download via Browser</span>
            <ExternalLink className="w-2.5 h-2.5" />
          </button>
        </div>
      )}
    </div>
  );
};
