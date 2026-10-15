import { useEffect, useState, useCallback } from 'react';
import { Bell, Clock, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ─────────────────────────────────────────────────────────────────────────────
 * Singleton promise-based bridge
 * Any module can call showExactAlarmRationale() and await the user's choice.
 * The React component below fulfills the pending promise when the user acts.
 * ─────────────────────────────────────────────────────────────────────────── */

type Resolver = (allowed: boolean) => void;

// Module-level queue of pending requests (usually only one at a time)
const pendingResolvers: Resolver[] = [];

// Custom DOM events used to communicate between non-React and React contexts
const SHOW_EVENT = 'exact-alarm-rationale-show';

/**
 * Show the in-app "Permission Required" rationale modal.
 * Resolves with `true` when the user taps "Allow",
 * resolves with `false` when the user taps "Not Now" or dismisses.
 *
 * Safe to call from any context (React or plain TS modules).
 */
export function showExactAlarmRationale(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    pendingResolvers.push(resolve);
    window.dispatchEvent(new CustomEvent(SHOW_EVENT));
  });
}

/** Internal: fulfill all pending resolvers with the user's decision */
function fulfillPending(allowed: boolean): void {
  let resolver: Resolver | undefined;
  // eslint-disable-next-line no-cond-assign
  while ((resolver = pendingResolvers.shift()) !== undefined) {
    resolver(allowed);
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
 * React component — mount once at the app root (see App.tsx)
 * ─────────────────────────────────────────────────────────────────────────── */

export function ExactAlarmPermissionDialog() {
  const [open, setOpen] = useState(false);

  const handleShow = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(SHOW_EVENT, handleShow);
    return () => {
      window.removeEventListener(SHOW_EVENT, handleShow);
    };
  }, [handleShow]);

  const handleAllow = useCallback(() => {
    setOpen(false);
    fulfillPending(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setOpen(false);
    fulfillPending(false);
  }, []);

  if (!open) return null;

  return (
    /* ── Backdrop ── */
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={handleDismiss}
      aria-modal="true"
      role="dialog"
      aria-labelledby="exact-alarm-dialog-title"
    >
      {/* ── Panel ── */}
      <div
        className="relative w-full max-w-sm rounded-3xl border border-amber-500/20 shadow-2xl overflow-hidden"
        style={{
          background:
            'linear-gradient(160deg, hsl(222,28%,12%) 0%, hsl(222,24%,10%) 100%)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle gold glow top-edge */}
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, hsl(45,85%,55%), transparent)',
          }}
        />

        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-6 pt-7 pb-6 space-y-5">
          {/* ── Icon cluster ── */}
          <div className="flex items-center justify-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, hsla(45,85%,55%,0.18), hsla(45,85%,55%,0.06))',
                border: '1px solid hsla(45,85%,55%,0.3)',
              }}
            >
              {/* Stacked icon: Bell + Clock to symbolise timed prayer alerts */}
              <div className="relative">
                <Bell
                  className="w-8 h-8"
                  style={{ color: 'hsl(45,85%,60%)' }}
                />
                <Clock
                  className="w-4 h-4 absolute -bottom-1 -right-1 rounded-full"
                  style={{
                    color: 'hsl(45,85%,60%)',
                    background: 'hsl(222,28%,12%)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ── Title ── */}
          <div className="text-center space-y-2">
            <h2
              id="exact-alarm-dialog-title"
              className="text-lg font-bold tracking-tight"
              style={{ color: 'hsl(45,85%,65%)' }}
            >
              Permission Required
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              To send accurate prayer notifications, this app needs permission
              to schedule exact alarms. This is required by Android to deliver
              timely Adhan alerts.
            </p>
          </div>

          {/* ── Info pill ── */}
          <div
            className="flex items-start gap-3 rounded-2xl px-4 py-3"
            style={{
              background: 'hsla(45,85%,55%,0.07)',
              border: '1px solid hsla(45,85%,55%,0.15)',
            }}
          >
            <Shield
              className="w-4 h-4 mt-0.5 shrink-0"
              style={{ color: 'hsl(45,85%,60%)' }}
            />
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
              You will be taken to the{' '}
              <span style={{ color: 'hsl(45,85%,60%)' }}>
                Alarms &amp; reminders
              </span>{' '}
              settings page. Enable the toggle for Noor Connect, then return to
              the app.
            </p>
          </div>

          {/* ── Actions ── */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              id="exact-alarm-allow-btn"
              onClick={handleAllow}
              className="w-full h-12 rounded-2xl font-semibold text-sm"
              style={{
                background:
                  'linear-gradient(135deg, hsl(45,85%,48%), hsl(38,90%,42%))',
                color: 'hsl(222,28%,10%)',
                border: 'none',
              }}
            >
              Allow
            </Button>
            <Button
              id="exact-alarm-cancel-btn"
              onClick={handleDismiss}
              variant="ghost"
              className="w-full h-11 rounded-2xl text-sm font-medium"
              style={{ color: 'rgba(255,255,255,0.45)' }}
            >
              Not Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
