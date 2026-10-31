import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Shield, Eye, EyeOff, Lock, Clock, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import {
  verifyOwnerKey,
  getRemainingCooldownSeconds,
  subscribeOwnerSecurity,
} from '@/lib/owner-security';
import { useToast } from '@/hooks/use-toast';

export interface OwnerSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionTitle?: string;
  actionDescription?: string;
}

export const OwnerSecurityModal: React.FC<OwnerSecurityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'Owner Security Key Required',
  actionDescription = 'Protected customization & upgradation action. Enter your private Owner Master Key to proceed.',
}) => {
  const [keyInput, setKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownSec, setCooldownSec] = useState(() => getRemainingCooldownSeconds());
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) {
      setKeyInput('');
      setErrorMessage(null);
      setIsVerifying(false);
      return;
    }

    // Auto-focus the input on modal open
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const updateCooldown = () => {
      setCooldownSec(getRemainingCooldownSeconds());
    };

    updateCooldown();
    const unsub = subscribeOwnerSecurity(updateCooldown);

    const interval = setInterval(() => {
      updateCooldown();
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  if (!isOpen) return null;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isVerifying || cooldownSec > 0) return;

    const trimmed = keyInput.trim();
    if (!trimmed) {
      setErrorMessage('Please enter your Owner Master Key.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const res = await verifyOwnerKey(trimmed);
      if (res.success) {
        toast({
          title: '🔓 Owner Verified',
          description: 'Session unlocked for 15 minutes.',
        });
        setKeyInput('');
        if (onSuccess) {
          onSuccess();
        }
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid key.');
        if (res.remainingCooldown) {
          setCooldownSec(res.remainingCooldown);
        }
      }
    } catch {
      // Safe error handling for verification flow
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const isCooldownActive = cooldownSec > 0;
  const displayTitle = actionTitle.replace(/^🔒\s*/, '').trim();

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9995,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="owner-security-title"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-5 sm:p-6 space-y-4 relative animate-in zoom-in-95 duration-200 sheet-scroll-contain"
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--accent)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.85)',
          color: 'var(--text-primary)',
          overscrollBehavior: 'contain',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Luxury Shield Icon */}
        <div className="flex items-start gap-3.5 pr-6">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2, var(--accent)) 100%)',
              color: 'var(--on-accent, #000000)',
            }}
          >
            <Shield className="w-5 h-5 fill-current" />
          </div>
          <div>
            <h2
              id="owner-security-title"
              className="font-bold tracking-tight flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)', fontSize: '0.96rem', whiteSpace: 'nowrap' }}
            >
              <span>🔒 {displayTitle}</span>
            </h2>
            <p
              className="text-xs leading-relaxed mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {actionDescription}
            </p>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleVerify} className="space-y-3.5 pt-1">
          <div className="space-y-1.5">
            <div className="relative flex items-center">
              <Input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => {
                  setKeyInput(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={isVerifying || isCooldownActive}
                placeholder={isCooldownActive ? 'Security cooldown active...' : 'Enter Owner Master Key'}
                className="h-11 pr-10 text-sm rounded-xl font-mono"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: errorMessage ? 'var(--danger)' : 'var(--border)',
                  color: 'var(--text-primary)',
                }}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                className="text-[11px] font-medium leading-tight flex items-center gap-1.5 pt-0.5"
                style={{ color: 'var(--danger)' }}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cooldown Active Banner */}
            {isCooldownActive && (
              <div
                className="p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 border"
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  borderColor: 'rgba(239, 68, 68, 0.35)',
                  color: 'var(--danger)',
                }}
              >
                <Clock className="w-4 h-4 animate-spin shrink-0" />
                <span>Brute-force cooldown: {cooldownSec}s remaining</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isVerifying}
              className="h-10 text-xs font-semibold rounded-xl border transition-all"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isVerifying || isCooldownActive || !keyInput.trim()}
              className="h-10 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2, var(--accent)) 100%)',
                color: 'var(--on-accent, #000000)',
              }}
            >
              {isVerifying ? (
                <span>Verifying...</span>
              ) : (
                <>
                  <span>Verify & Unlock</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Security Footer Notice */}
        <div
          className="text-[10px] text-center pt-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Protected by SHA-256 salted cryptographic lock • Noor Connect Security
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
