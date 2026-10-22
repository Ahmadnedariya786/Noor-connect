import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  Key,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  isOwnerSessionUnlocked,
  lockOwnerSession,
  getRemainingSessionSeconds,
  isUpgradationLockEnabled,
  setUpgradationLockEnabled,
  getActiveOwnerHash,
  hasCustomOwnerKey,
  changeOwnerSecretKey,
  resetOwnerSecretKeyToDefault,
  getRemainingCooldownSeconds,
  subscribeOwnerSecurity,
} from '@/lib/owner-security';
import { useToast } from '@/hooks/use-toast';

interface OwnerSecurityVaultCardProps {
  onRequireUnlock: (actionTitle?: string, actionDesc?: string) => void;
  onLockVault?: () => void;
}

export const OwnerSecurityVaultCard: React.FC<OwnerSecurityVaultCardProps> = ({
  onRequireUnlock,
  onLockVault,
}) => {
  const [isUnlocked, setIsUnlocked] = useState(() => isOwnerSessionUnlocked());
  const [remainingSec, setRemainingSec] = useState(() => getRemainingSessionSeconds());
  const [isUpgradeLocked, setIsUpgradeLocked] = useState(() => isUpgradationLockEnabled());
  const [cooldownSec, setCooldownSec] = useState(() => getRemainingCooldownSeconds());
  const [activeHash, setActiveHash] = useState(() => getActiveOwnerHash());
  const [isCustomKey, setIsCustomKey] = useState(() => hasCustomOwnerKey());

  // Key change form state
  const [isChangeFormOpen, setIsChangeFormOpen] = useState(false);
  const [currentKeyInput, setCurrentKeyInput] = useState('');
  const [newKeyInput, setNewKeyInput] = useState('');
  const [confirmKeyInput, setConfirmKeyInput] = useState('');
  const [showCurrentKey, setShowCurrentKey] = useState(false);
  const [showNewKey, setShowNewKey] = useState(false);
  const [isSubmittingKey, setIsSubmittingKey] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Hash copy state
  const [copiedHash, setCopiedHash] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    const syncState = () => {
      setIsUnlocked(isOwnerSessionUnlocked());
      setRemainingSec(getRemainingSessionSeconds());
      setIsUpgradeLocked(isUpgradationLockEnabled());
      setCooldownSec(getRemainingCooldownSeconds());
      setActiveHash(getActiveOwnerHash());
      setIsCustomKey(hasCustomOwnerKey());
    };

    syncState();
    const unsub = subscribeOwnerSecurity(syncState);

    const interval = setInterval(() => {
      syncState();
    }, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleToggleUpgradeLock = () => {
    if (!isUnlocked) {
      onRequireUnlock(
        'Toggle Upgradation Lock',
        'Toggling the APK Upgradation Security Lock requires Owner authorization.'
      );
      return;
    }
    const nextVal = !isUpgradeLocked;
    setUpgradationLockEnabled(nextVal);
    setIsUpgradeLocked(nextVal);
    toast({
      title: nextVal ? '🔒 Upgrades Protected' : '⚠️ Upgrades Unlocked',
      description: nextVal
        ? 'Owner Master Key is required for APK installations.'
        : 'APK installations can now proceed without key prompt.',
    });
  };

  const handleLockNow = () => {
    lockOwnerSession();
    setIsChangeFormOpen(false);
    setCurrentKeyInput('');
    setNewKeyInput('');
    setConfirmKeyInput('');
    toast({
      title: '🔒 Vault Locked',
      description: 'Owner session has been terminated.',
    });
    onLockVault?.();
  };

  const handleCopyHash = async () => {
    try {
      await navigator.clipboard.writeText(activeHash);
      setCopiedHash(true);
      toast({
        title: '✓ Hash Copied',
        description: 'SHA-256 Lock Hash copied to clipboard.',
      });
      setTimeout(() => setCopiedHash(false), 2000);
    } catch {
      // Clipboard fallback
      toast({
        title: 'Copy Failed',
        description: 'Could not copy to clipboard.',
      });
    }
  };

  const handleChangeKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentKeyInput.trim()) {
      setFormError('Please enter your current Owner Key.');
      return;
    }
    if (newKeyInput.length < 4) {
      setFormError('New key must be at least 4 characters long.');
      return;
    }
    if (newKeyInput !== confirmKeyInput) {
      setFormError('New keys do not match.');
      return;
    }

    setIsSubmittingKey(true);
    try {
      const res = await changeOwnerSecretKey(currentKeyInput, newKeyInput);
      if (res.success && res.newHash) {
        toast({
          title: '✓ Owner Key Updated',
          description: 'Salted SHA-256 hash saved. Zero plain-text stored.',
        });
        setCurrentKeyInput('');
        setNewKeyInput('');
        setConfirmKeyInput('');
        setIsChangeFormOpen(false);
        setActiveHash(res.newHash);
        setIsCustomKey(true);
      } else {
        setFormError(res.error || 'Failed to update owner key.');
      }
    } catch {
      // Safe error handling for change key
      setFormError('An unexpected error occurred while updating the key.');
    } finally {
      setIsSubmittingKey(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!currentKeyInput.trim()) {
      setFormError('Please enter your current key to reset to default.');
      return;
    }

    setIsSubmittingKey(true);
    try {
      const res = await resetOwnerSecretKeyToDefault(currentKeyInput);
      if (res.success) {
        toast({
          title: '✓ Reset to Bootstrap Default',
          description: 'Custom key override removed. Default lock hash restored.',
        });
        setCurrentKeyInput('');
        setNewKeyInput('');
        setConfirmKeyInput('');
        setIsChangeFormOpen(false);
        setActiveHash(getActiveOwnerHash());
        setIsCustomKey(false);
      } else {
        setFormError(res.error || 'Failed to reset key.');
      }
    } catch {
      // Safe error handling for reset
      setFormError('Failed to reset key.');
    } finally {
      setIsSubmittingKey(false);
    }
  };

  const formatSessionTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      className="p-4 space-y-3.5 rounded-2xl border w-full max-w-full box-border overflow-hidden transition-all duration-300"
      style={{
        background: 'var(--surface)',
        borderColor: isUnlocked ? 'var(--accent)' : 'var(--border)',
        boxShadow: isUnlocked ? '0 0 20px var(--accent-glow)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="p-1 rounded-lg"
            style={{
              background: isUnlocked ? 'var(--accent-soft)' : 'var(--surface-2)',
              color: isUnlocked ? 'var(--accent-text)' : 'var(--text-secondary)',
            }}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <Label className="text-xs font-bold uppercase tracking-wider block" style={{ color: 'var(--text-secondary)' }}>
              Owner Security Vault
            </Label>
            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
              SHA-256 cryptographic owner authorization & lock
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold flex items-center gap-1 border"
          style={{
            background: isUnlocked ? 'rgba(34, 197, 94, 0.12)' : 'var(--accent-soft)',
            borderColor: isUnlocked ? 'rgba(34, 197, 94, 0.3)' : 'var(--border)',
            color: isUnlocked ? 'var(--success)' : 'var(--accent-text)',
          }}
        >
          {isUnlocked ? (
            <>
              <Unlock className="w-3 h-3" />
              <span>🔓 Unlocked ({formatSessionTime(remainingSec)})</span>
            </>
          ) : (
            <>
              <Lock className="w-3 h-3" />
              <span>🔒 Locked</span>
            </>
          )}
        </div>
      </div>

      {/* Vault Status Overview */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono w-full">
        {/* Card 1: Upgrade Lock Status */}
        <div
          className="p-2.5 rounded-xl border flex flex-col justify-between gap-1"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
          }}
        >
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Upgrades & APK:
          </span>
          <span
            className="font-bold flex items-center gap-1"
            style={{
              color: isUpgradeLocked ? 'var(--accent-text)' : 'var(--warning)',
              fontSize: '0.78rem',
              whiteSpace: 'nowrap',
            }}
          >
            {isUpgradeLocked ? '🔒 Key Protected' : '⚠️ Unrestricted'}
          </span>
        </div>

        {/* Card 2: Key Hash Status */}
        <div
          className="p-2.5 rounded-xl border flex flex-col justify-between gap-1"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border)',
          }}
        >
          <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            Active Key Mode:
          </span>
          <span
            className="font-bold truncate"
            style={{
              color: 'var(--text-primary)',
              fontSize: '0.78rem',
              whiteSpace: 'nowrap',
            }}
          >
            {isCustomKey ? 'Master Key Active' : 'Protected (SHA-256)'}
          </span>
        </div>
      </div>

      {/* LOCKED VIEW: Unlock Vault Trigger */}
      {!isUnlocked && (
        <div className="space-y-2 pt-1">
          <Button
            size="sm"
            className="w-full h-9 rounded-xl font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2, var(--accent)) 100%)',
              color: 'var(--on-accent, #000000)',
            }}
            onClick={() => onRequireUnlock('Unlock Owner Security Vault', 'Enter your private Owner Master Key to unlock administrative settings.')}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Unlock Owner Vault 🔒</span>
          </Button>

          {cooldownSec > 0 && (
            <div
              className="p-2 rounded-xl text-[11px] font-medium flex items-center gap-1.5 border"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                color: 'var(--danger)',
              }}
            >
              <Clock className="w-3.5 h-3.5 animate-spin shrink-0" />
              <span>Brute-force lockout active: {cooldownSec}s remaining</span>
            </div>
          )}
        </div>
      )}

      {/* UNLOCKED VIEW: Full Administrative Capabilities */}
      {isUnlocked && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-300">
          {/* Action 1: Toggle Upgradation Lock */}
          <div
            className="p-3 rounded-xl border flex items-center justify-between gap-3"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Require Key for APK Updates
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                {isUpgradeLocked
                  ? 'Key is required before checking, downloading, or installing updates'
                  : 'Updates can be checked and downloaded freely'}
              </p>
            </div>
            <Button
              size="sm"
              variant={isUpgradeLocked ? 'default' : 'outline'}
              className="h-8 px-3 rounded-lg text-xs font-semibold shrink-0"
              style={{
                background: isUpgradeLocked ? 'var(--accent)' : 'transparent',
                color: isUpgradeLocked ? 'var(--on-accent)' : 'var(--text-primary)',
                borderColor: 'var(--border)',
              }}
              onClick={handleToggleUpgradeLock}
            >
              {isUpgradeLocked ? 'Lock: ON' : 'Lock: OFF'}
            </Button>
          </div>

          {/* Action 2: Active 64-char Hash Display with 1-Tap Copy */}
          <div
            className="p-3 rounded-xl border space-y-1.5"
            style={{
              background: 'var(--surface-2)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Active SHA-256 Lock Hash
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
                style={{ color: 'var(--accent-text)' }}
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3 h-3 text-[var(--success)]" />
                    <span style={{ color: 'var(--success)' }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Hash for Codebase Lock</span>
                  </>
                )}
              </button>
            </div>
            <pre
              className="text-[9.5px] font-mono p-2 rounded-lg border overflow-x-auto whitespace-pre-wrap select-all"
              style={{
                background: 'var(--bg-base)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                overflowWrap: 'anywhere',
                wordBreak: 'break-all',
              }}
            >
              {activeHash}
            </pre>
            <p className="text-[9.5px]" style={{ color: 'var(--text-secondary)' }}>
              One-way salted digest. You can paste this hash into INITIAL_BOOTSTRAP_HASH in owner-security.ts so no AI agent ever sees your raw key.
            </p>
          </div>

          {/* Action 3: Change Owner Secret Key Form */}
          {!isChangeFormOpen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
              onClick={() => setIsChangeFormOpen(true)}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Change Owner Secret Key</span>
            </Button>
          ) : (
            <form
              onSubmit={handleChangeKeySubmit}
              className="p-3 rounded-xl border space-y-2.5 animate-in fade-in duration-200"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                  Set New Owner Secret Key
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangeFormOpen(false);
                    setFormError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {formError && (
                <div
                  className="p-2 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: 'var(--danger)',
                  }}
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Current Key */}
              <div className="space-y-1">
                <Label className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Current Owner Key
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type={showCurrentKey ? 'text' : 'password'}
                    value={currentKeyInput}
                    onChange={(e) => setCurrentKeyInput(e.target.value)}
                    placeholder="Enter current key"
                    className="h-8 text-xs font-mono pr-8"
                    style={{
                      background: 'var(--bg-base)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentKey(!showCurrentKey)}
                    className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle show password"
                  >
                    {showCurrentKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* New Key */}
              <div className="space-y-1">
                <Label className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  New Secret Key
                </Label>
                <div className="relative flex items-center">
                  <Input
                    type={showNewKey ? 'text' : 'password'}
                    value={newKeyInput}
                    onChange={(e) => setNewKeyInput(e.target.value)}
                    placeholder="At least 4 characters"
                    className="h-8 text-xs font-mono pr-8"
                    style={{
                      background: 'var(--bg-base)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewKey(!showNewKey)}
                    className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle show password"
                  >
                    {showNewKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Key */}
              <div className="space-y-1">
                <Label className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                  Confirm New Secret Key
                </Label>
                <Input
                  type={showNewKey ? 'text' : 'password'}
                  value={confirmKeyInput}
                  onChange={(e) => setConfirmKeyInput(e.target.value)}
                  placeholder="Repeat new secret key"
                  className="h-8 text-xs font-mono"
                  style={{
                    background: 'var(--bg-base)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  type="submit"
                  disabled={isSubmittingKey || !newKeyInput || !confirmKeyInput}
                  size="sm"
                  className="flex-1 h-8 text-xs font-semibold rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2, var(--accent)) 100%)',
                    color: 'var(--on-accent, #000000)',
                  }}
                >
                  {isSubmittingKey ? 'Hashing & Saving...' : 'Save New Key'}
                </Button>

                {isCustomKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
                    onClick={handleResetToDefault}
                    disabled={isSubmittingKey}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset to Bootstrap
                  </Button>
                )}
              </div>
            </form>
          )}

          {/* Action 4: Lock Vault Now Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              borderColor: 'rgba(239, 68, 68, 0.3)',
              color: 'var(--danger)',
            }}
            onClick={handleLockNow}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Vault Now 🔒</span>
          </Button>
        </div>
      )}
    </div>
  );
};
