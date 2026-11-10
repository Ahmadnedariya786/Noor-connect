import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Download, X, Check, ExternalLink, RotateCw, ShieldAlert } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  checkNightlyUpdate,
  downloadAndInstallUpdate,
  openExternalBrowserFallback,
  cancelOtaDownload,
  installReadyApk,
  subscribeOtaStatus,
  isBannerDismissed,
  dismissBanner,
  type UpdateCheckResult,
  type OtaStatus,
} from '@/lib/update-checker';
import { BUILD_COMMIT, APP_VERSION } from '@/buildInfo';

const LAST_AUTO_CHECK_KEY = 'noor_last_auto_check';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

let autoCheckedThisLaunch = false;

export const UpdateBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => isBannerDismissed());
  const [otaStatus, setOtaStatus] = useState<OtaStatus>({
    state: 'idle',
    engine: 'none',
    downloadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    speedMBps: 0,
    error: '',
    downloadedMB: 0,
    totalMB: 0,
  });

  const runSilentUpdateCheck = useCallback(async () => {
    try {
      localStorage.setItem(LAST_AUTO_CHECK_KEY, Date.now().toString());
      const res = await checkNightlyUpdate(false);
      if (res.hasUpdate && res.status === 'Update available') {
        const localCommit = BUILD_COMMIT || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BUILD_COMMIT) || '';
        const remoteCommit = res.release?.commitSha || '';
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
      // Handled silent background update check failure safely
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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleResume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Listen to external check result (e.g. manual trigger in Settings)
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
    window.addEventListener('noor-update-check-result', handleUpdateResult as EventListener);

    // Subscribe to unified OTA status (handles push events + 250ms polling)
    const unsubscribeOta = subscribeOtaStatus((status) => {
      if (isMounted) {
        setOtaStatus(status);
      }
    });

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('noor-update-check-result', handleUpdateResult as EventListener);
      unsubscribeOta();
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

  const handleInstallAction = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (otaStatus.state === 'installing' || otaStatus.state === 'verifying') {
      installReadyApk();
      return;
    }
    if (otaStatus.state === 'permission_required') {
      installReadyApk();
      return;
    }

    downloadAndInstallUpdate(updateInfo.release?.apkUrl, updateInfo.expectedBytes || updateInfo.release?.expectedBytes);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (otaStatus.state === 'downloading' || otaStatus.state === 'connecting') {
      cancelOtaDownload();
      return;
    }
    dismissBanner();
    setDismissed(true);
  };

  const handleBrowserFallback = (e: React.MouseEvent) => {
    e.stopPropagation();
    cancelOtaDownload();
    openExternalBrowserFallback(updateInfo.release?.apkUrl);
  };

  const state = otaStatus.state;
  const isConnecting = state === 'connecting';
  const isDownloading = state === 'downloading';
  const isVerifying = state === 'verifying';
  const isPermission = state === 'permission_required';
  const isInstalling = state === 'installing';
  const isCancelled = state === 'cancelled';
  const isError = state === 'error';
  const isIdle = state === 'idle';

  // Compute exact non-truncating banner copy (zero truncation at 360px budget)
  let titleText = 'Update available';
  let subtitleText = `Nightly v${(updateInfo.release?.tagName || '').replace(/^v/, '') || APP_VERSION || '2.3.0'}`;

  if (isConnecting) {
    titleText = 'Connecting...';
    subtitleText = 'Starting download...';
  } else if (isDownloading) {
    if (otaStatus.totalBytes > 0) {
      titleText = `Downloading • ${otaStatus.percent}%`;
      const speedPart = otaStatus.speedMBps > 0 ? ` • ${otaStatus.speedMBps.toFixed(1)} MB/s` : '';
      subtitleText = `${otaStatus.downloadedMB} / ${otaStatus.totalMB} MB${speedPart}`;
    } else {
      titleText = 'Downloading...';
      const speedPart = otaStatus.speedMBps > 0 ? ` • ${otaStatus.speedMBps.toFixed(1)} MB/s` : '';
      subtitleText = `${otaStatus.downloadedMB} MB${speedPart}`;
    }
  } else if (isVerifying) {
    titleText = 'Verifying update...';
    subtitleText = 'Checking file integrity';
  } else if (isPermission) {
    titleText = 'Permission needed';
    subtitleText = 'Allow installs to continue';
  } else if (isInstalling) {
    titleText = 'Opening installer...';
    subtitleText = 'Tap to install if closed';
  } else if (isCancelled) {
    titleText = 'Download paused';
    subtitleText = 'Tap Retry to resume';
  } else if (isError) {
    titleText = 'Download failed';
    subtitleText = 'Retry or use Browser';
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleInstallAction}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleInstallAction();
        }
      }}
      className="relative overflow-hidden p-3 rounded-2xl border transition-all active:scale-[0.99] cursor-pointer flex flex-col gap-2 text-left animate-in fade-in slide-in-from-top-2 duration-300 select-none shadow-lg mb-3"
      style={{
        background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 100%)',
        borderColor: 'var(--border)',
        boxShadow: '0 4px 18px var(--accent-glow)',
      }}
      aria-label="Update available, tap to install"
    >
      <div className="flex items-center justify-between gap-2.5 w-full">
        {/* Left: Icon + Compact Non-Truncating Copy */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{
              background: isInstalling ? 'var(--success)' : isPermission ? 'var(--warning)' : 'var(--accent)',
              color: 'var(--on-accent)',
            }}
          >
            {isInstalling ? (
              <Check className="w-4 h-4 stroke-[2.5]" />
            ) : isPermission ? (
              <ShieldAlert className="w-4 h-4 stroke-[2.5]" />
            ) : isDownloading || isConnecting || isVerifying ? (
              <RotateCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 fill-current" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-bold tracking-wide leading-tight truncate"
              style={{ color: 'var(--accent-text)' }}
            >
              {titleText}
            </p>
            <p
              className="text-[11px] text-muted-foreground truncate pt-0.5"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {subtitleText}
            </p>
          </div>
        </div>

        {/* Right: Adaptive Compact Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isInstalling ? (
            <button
              type="button"
              onClick={handleInstallAction}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              style={{
                background: 'var(--accent)',
                color: 'var(--on-accent)',
              }}
            >
              <Download className="w-3 h-3" />
              <span>Tap to install APK</span>
            </button>
          ) : isPermission ? (
            <button
              type="button"
              onClick={handleInstallAction}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              style={{
                background: 'var(--warning)',
                color: '#000000',
              }}
            >
              <span>Allow</span>
            </button>
          ) : isDownloading ? (
            <div className="flex items-center gap-1">
              <div
                className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold"
                style={{
                  background: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                  border: '1px solid var(--border)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {otaStatus.totalBytes > 0 ? `${otaStatus.percent}%` : `${otaStatus.downloadedMB}M`}
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                aria-label="Pause download"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isCancelled || isError ? (
            <button
              type="button"
              onClick={handleInstallAction}
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

          {isIdle && (
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1 text-muted-foreground/60 hover:text-foreground rounded-lg transition-colors"
              aria-label="Dismiss update banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live Glowing Download Progress Bar */}
      {isDownloading && (
        <div className="w-full h-1.5 rounded-full bg-black/20 dark:bg-white/10 overflow-hidden relative">
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${Math.max(5, Math.min(100, otaStatus.totalBytes > 0 ? otaStatus.percent : 15))}%`,
              background: 'linear-gradient(90deg, var(--accent), var(--accent-2))',
              boxShadow: '0 0 10px var(--accent-glow)',
            }}
          />
        </div>
      )}

      {/* Secondary Browser Fallback Link (Visible in every active/error state) */}
      {!isIdle && (
        <div className="flex items-center justify-between pt-0.5 text-[10px] text-muted-foreground/80">
          <span>{isError ? 'Stream failed' : 'Stuck or prompt closed?'}</span>
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
