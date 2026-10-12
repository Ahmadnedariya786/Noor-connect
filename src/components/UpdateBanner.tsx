import React, { useState, useEffect } from 'react';
import { Sparkles, Download, X } from 'lucide-react';
import {
  checkNightlyUpdate,
  downloadAndInstallUpdate,
  formatReleaseDate,
  isBannerDismissed,
  dismissBanner,
  type UpdateCheckResult,
} from '@/lib/update-checker';

export const UpdateBanner: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(() => isBannerDismissed());

  useEffect(() => {
    let isMounted = true;
    checkNightlyUpdate(false)
      .then((res) => {
        if (isMounted) {
          setUpdateInfo(res);
        }
      })
      .catch(() => {
        // Safe silent fallback
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
      className="relative overflow-hidden p-3.5 rounded-2xl border transition-all active:scale-[0.99] cursor-pointer flex items-center justify-between gap-3 text-left animate-in fade-in slide-in-from-top-2 duration-300 select-none shadow-lg"
      style={{
        background: 'linear-gradient(135deg, rgba(201,134,10,0.14) 0%, rgba(201,134,10,0.05) 100%)',
        borderColor: 'rgba(201,134,10,0.32)',
        boxShadow: '0 4px 18px rgba(201,134,10,0.09)',
      }}
      aria-label="Update available, tap to install"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
          style={{
            background: 'linear-gradient(135deg, #FDE68A 0%, #F5C542 35%, #E8A317 70%, #D48F0E 100%)',
            color: '#1A1300',
          }}
        >
          <Sparkles className="w-4 h-4 fill-current" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-amber-500 dark:text-amber-400 tracking-wide leading-tight">
            Update available — tap to install
          </p>
          <p className="text-[11px] text-muted-foreground truncate pt-0.5">
            Nightly build • {formatReleaseDate(updateInfo.release?.publishedAt)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <div
          className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
          style={{
            background: 'rgba(201,134,10,0.18)',
            color: '#F5C542',
            border: '1px solid rgba(201,134,10,0.35)',
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
