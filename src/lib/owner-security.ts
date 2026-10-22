/**
 * Noor Connect — Cryptographic Owner Authorization & Security Engine
 *
 * Implements salted SHA-256 one-way hashing for Owner Master Key authentication,
 * session unlock management, brute-force cooldown protection, and diagnostics logging.
 *
 * ZERO PLAIN-TEXT STORAGE:
 * The owner key is never stored or checked in plain text. All verifications use
 * one-way SHA-256 digest comparisons against the salted cryptographic hash.
 */

import { recordDiagnosticEvent } from './diagnostics-engine';

export const OWNER_KEY_SALT = 'NOOR_CONNECT_ROYAL_SALT_v1:';

// Precomputed 64-character lowercase SHA-256 hex digest of the initial bootstrap key salted with OWNER_KEY_SALT.
// Plain-text key is NEVER written in the codebase.
export const INITIAL_BOOTSTRAP_HASH =
  'ecf0a8b4f0cf6bd22932de8dfe61e475ec78b9dcd7be36b02108a77138a841a6';

export const STORAGE_KEY_CUSTOM_HASH = 'noor_owner_key_hash';
export const STORAGE_KEY_UPGRADATION_LOCK = 'noor_owner_upgradation_lock';
export const STORAGE_KEY_FAILED_ATTEMPTS = 'noor_owner_failed_attempts';
export const STORAGE_KEY_COOLDOWN_UNTIL = 'noor_owner_cooldown_until';
export const SESSION_KEY_UNLOCKED_UNTIL = 'noor_owner_session_unlocked_until';

export const SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_FAILED_ATTEMPTS = 5;
export const COOLDOWN_DURATION_MS = 60 * 1000; // 60 seconds

// In-memory unlock cache for maximum performance (0ms overhead on standard checks)
let sessionUnlockedUntil = 0;

// Subscribers for reactive UI updates
type SecurityListener = () => void;
const securitySubscribers = new Set<SecurityListener>();

function notifySecuritySubscribers(): void {
  securitySubscribers.forEach((fn) => {
    try {
      fn();
    } catch {
      // Safe subscriber invocation guard
    }
  });
}

export function subscribeOwnerSecurity(listener: SecurityListener): () => void {
  securitySubscribers.add(listener);
  return () => {
    securitySubscribers.delete(listener);
  };
}

/**
 * Standard pure JS fallback for SHA-256 if crypto.subtle is unavailable in non-secure web contexts.
 */
function pureJsSha256(ascii: string): string {
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';
  const words: number[] = [];
  const asciiBitLength = ascii.length * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = candidate * candidate; i < 312; i += candidate) isComposite[i] = true;
      if (primeCounter < 8) hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      primeCounter++;
    }
  }

  ascii += '\x80';
  while ((ascii.length % 64) - 56) ascii += '\x00';
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength | 0;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const s0_2 = rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22);
      const s1_2 = rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25);
      const t1 = hash[7] + s1_2 + ch + k[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const t2 = s0_2 + maj;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + t1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (t1 + t2) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

/**
 * Computes salted SHA-256 lowercase 64-char hex string of any entered key.
 */
export async function hashOwnerKey(key: string): Promise<string> {
  const salted = OWNER_KEY_SALT + key.trim();

  try {
    if (
      typeof crypto !== 'undefined' &&
      crypto.subtle &&
      typeof crypto.subtle.digest === 'function'
    ) {
      const encoder = new TextEncoder();
      const data = encoder.encode(salted);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback to pure JS SHA-256 if subtle crypto throws or is unavailable
  }

  return pureJsSha256(salted);
}

/**
 * Returns the active 64-character SHA-256 lock hash (custom or bootstrap).
 */
export function getActiveOwnerHash(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem(STORAGE_KEY_CUSTOM_HASH);
      if (custom && /^[0-9a-f]{64}$/i.test(custom.trim())) {
        return custom.trim().toLowerCase();
      }
    }
  } catch {
    // Safe storage read fallback
  }
  return INITIAL_BOOTSTRAP_HASH;
}

/**
 * Returns whether a custom owner key override has been saved.
 */
export function hasCustomOwnerKey(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const custom = localStorage.getItem(STORAGE_KEY_CUSTOM_HASH);
      return Boolean(custom && /^[0-9a-f]{64}$/i.test(custom.trim()));
    }
  } catch {
    // Safe storage read fallback
  }
  return false;
}

/**
 * Gets remaining brute-force cooldown in seconds, or 0 if inactive.
 */
export function getRemainingCooldownSeconds(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const until = Number(localStorage.getItem(STORAGE_KEY_COOLDOWN_UNTIL) || '0');
      const now = Date.now();
      if (until > now) {
        return Math.ceil((until - now) / 1000);
      }
    }
  } catch {
    // Safe storage read fallback
  }
  return 0;
}

/**
 * Checks whether the 15-minute owner session is currently unlocked.
 */
export function isOwnerSessionUnlocked(): boolean {
  const now = Date.now();
  if (sessionUnlockedUntil > now) return true;

  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = Number(sessionStorage.getItem(SESSION_KEY_UNLOCKED_UNTIL) || '0');
      if (stored > now) {
        sessionUnlockedUntil = stored;
        return true;
      }
    }
  } catch {
    // Safe storage read fallback
  }
  return false;
}

/**
 * Returns the remaining session unlock time in seconds (or 0 if locked).
 */
export function getRemainingSessionSeconds(): number {
  const now = Date.now();
  if (sessionUnlockedUntil > now) {
    return Math.ceil((sessionUnlockedUntil - now) / 1000);
  }
  try {
    if (typeof sessionStorage !== 'undefined') {
      const stored = Number(sessionStorage.getItem(SESSION_KEY_UNLOCKED_UNTIL) || '0');
      if (stored > now) {
        return Math.ceil((stored - now) / 1000);
      }
    }
  } catch {
    // Safe storage read fallback
  }
  return 0;
}

/**
 * Unlocks owner session for 15 minutes.
 */
export function unlockOwnerSession(): void {
  const until = Date.now() + SESSION_DURATION_MS;
  sessionUnlockedUntil = until;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY_UNLOCKED_UNTIL, until.toString());
    }
  } catch {
    // Safe storage write fallback
  }
  notifySecuritySubscribers();
}

/**
 * Locks owner session immediately.
 */
export function lockOwnerSession(): void {
  sessionUnlockedUntil = 0;
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY_UNLOCKED_UNTIL);
    }
  } catch {
    // Safe storage write fallback
  }
  notifySecuritySubscribers();
}

/**
 * Returns whether Upgradation Lock is enabled (default: false for zero-friction user updates).
 */
export function isUpgradationLockEnabled(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(STORAGE_KEY_UPGRADATION_LOCK);
      return val === 'true';
    }
  } catch {
    // Safe storage read fallback
  }
  return false;
}

/**
 * Toggles Upgradation Lock ON or OFF.
 */
export function setUpgradationLockEnabled(enabled: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_UPGRADATION_LOCK, enabled ? 'true' : 'false');
    }
  } catch {
    // Safe storage write fallback
  }
  notifySecuritySubscribers();
}

/**
 * Verifies entered key against the active salted SHA-256 hash.
 * Handles failed attempts, 60-second cooldown, and diagnostics logging.
 */
export async function verifyOwnerKey(
  inputKey: string
): Promise<{ success: boolean; error?: string; remainingCooldown?: number }> {
  const cooldownSec = getRemainingCooldownSeconds();
  if (cooldownSec > 0) {
    return {
      success: false,
      error: `Security cooldown active. Please wait ${cooldownSec}s before retrying.`,
      remainingCooldown: cooldownSec,
    };
  }

  const trimmed = (inputKey || '').trim();
  if (!trimmed) {
    return { success: false, error: 'Please enter your Owner Master Key.' };
  }

  const computedHash = await hashOwnerKey(trimmed);
  const activeHash = getActiveOwnerHash();

  if (computedHash.toLowerCase() === activeHash.toLowerCase()) {
    // Reset failed attempts on success
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY_FAILED_ATTEMPTS);
        localStorage.removeItem(STORAGE_KEY_COOLDOWN_UNTIL);
      }
    } catch {
      // Safe storage cleanup fallback
    }

    unlockOwnerSession();
    return { success: true };
  }

  // Handle failed attempt
  let failed = 0;
  try {
    if (typeof localStorage !== 'undefined') {
      failed = Number(localStorage.getItem(STORAGE_KEY_FAILED_ATTEMPTS) || '0') + 1;
      localStorage.setItem(STORAGE_KEY_FAILED_ATTEMPTS, failed.toString());
    }
  } catch {
    // Safe storage fallback
    failed = 1;
  }

  if (failed >= MAX_FAILED_ATTEMPTS) {
    const cooldownUntil = Date.now() + COOLDOWN_DURATION_MS;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_COOLDOWN_UNTIL, cooldownUntil.toString());
        localStorage.removeItem(STORAGE_KEY_FAILED_ATTEMPTS);
      }
    } catch {
      // Safe storage write fallback
    }

    // Log [SECURITY_WARN] event in the Deep X-Ray Diagnostics buffer
    try {
      recordDiagnosticEvent({
        category: 'CONSOLE_WARN',
        message:
          '[SECURITY_WARN] Cooldown activated: 5 consecutive failed owner key attempts. Locked for 60 seconds.',
        extra: {
          timestamp: new Date().toISOString(),
          cooldownSeconds: 60,
        },
      });
    } catch {
      // Safe diagnostics recording guard
    }

    notifySecuritySubscribers();

    return {
      success: false,
      error: '5 consecutive failed attempts. Security cooldown active for 60 seconds.',
      remainingCooldown: 60,
    };
  }

  const remaining = MAX_FAILED_ATTEMPTS - failed;
  notifySecuritySubscribers();

  return {
    success: false,
    error: `Invalid Owner Security Key. (${remaining} attempt${remaining === 1 ? '' : 's'} remaining before 60s cooldown)`,
  };
}

/**
 * Changes the owner secret key after verifying the current key.
 * Stores ONLY the newly computed salted SHA-256 hash.
 */
export async function changeOwnerSecretKey(
  currentKey: string,
  newKey: string
): Promise<{ success: boolean; error?: string; newHash?: string }> {
  const trimmedNew = (newKey || '').trim();
  if (trimmedNew.length < 4) {
    return { success: false, error: 'New secret key must be at least 4 characters long.' };
  }

  // Verify current key first
  const currentTrimmed = (currentKey || '').trim();
  const currentHash = await hashOwnerKey(currentTrimmed);
  const activeHash = getActiveOwnerHash();

  if (currentHash.toLowerCase() !== activeHash.toLowerCase()) {
    return { success: false, error: 'Current Owner Security Key is incorrect.' };
  }

  const newHash = await hashOwnerKey(trimmedNew);

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_CUSTOM_HASH, newHash);
    }
  } catch {
    return { success: false, error: 'Failed to write new key hash to local storage.' };
  }

  // Refresh active session unlock
  unlockOwnerSession();
  notifySecuritySubscribers();

  return { success: true, newHash };
}

/**
 * Resets custom key override back to the initial bootstrap lock hash.
 */
export async function resetOwnerSecretKeyToDefault(
  currentKey: string
): Promise<{ success: boolean; error?: string }> {
  const currentTrimmed = (currentKey || '').trim();
  const currentHash = await hashOwnerKey(currentTrimmed);
  const activeHash = getActiveOwnerHash();

  if (currentHash.toLowerCase() !== activeHash.toLowerCase()) {
    return { success: false, error: 'Current Owner Security Key is incorrect.' };
  }

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_CUSTOM_HASH);
    }
  } catch {
    // Safe storage cleanup fallback
  }

  unlockOwnerSession();
  notifySecuritySubscribers();

  return { success: true };
}
