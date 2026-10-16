import React, { useState, useEffect, useCallback } from 'react';
import { Sparkles, Download, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import {
  checkNightlyUpdate,
  downloadAndInstallUpdate,
  formatReleaseDate,
  formatCommit,
  isBannerDismissed,
  dismissBanner,
  type UpdateCheckResult,
} from '@/lib/update-checker';
import { BUILD_COMMIT } from '@/buildInfo';

const LAST_AUTO_CHECK_KEY = 'noor_last_auto_check';
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

// In-memory guard to ensure auto-check runs exactly once per app launch on Home mount
let autoCheckedThisLaunch = false;

export const UpdateBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => isBannerDismissed());

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

    window.addEventListener('noor-update-check-result', handleUpdateResult as EventListener);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('noor-update-check-result', handleUpdateResult as EventListener);
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

  const handleInstall = () => {
    downloadAndInstallUpdate(updateInfo.release?.apkUrl);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    dismissBanner();
    setDismissed(true);
  };

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
      className="relative overflow-hidden p-3.5 rounded-2xl border transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 text-left animate-in fade-in slide-in-from-top-2 duration-300 select-none shadow-lg mb-3"
      style={{
        background: 'linear-gradient(135deg, var(--accent-soft) 0%, var(--surface) 100%)',
        borderColor: 'var(--border)',
        boxShadow: '0 4px 18px var(--accent-glow)',
      }}
      aria-label="Update available, tap to install"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: 'var(--accent)',
            color: 'var(--on-accent)',
          }}
        >
          <Sparkles className="w-4 h-4 fill-current" />
        </div>
        <div className="min-w-0">
          <p
            className="text-xs font-bold tracking-wide leading-tight"
            style={{ color: 'var(--accent-text)' }}
          >
            Update available
          </p>
          <p className="text-[11px] text-muted-foreground truncate pt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
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
  );
};
