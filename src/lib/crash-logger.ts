/**
 * Crash Logger & Diagnostics ("Black Box")
 * Bridges backwards-compatible crash APIs to the new Deep X-Ray Diagnostics Engine.
 */

import {
  recordDiagnosticEvent,
  getDiagnosticEntries,
  clearDiagnostics,
  initDiagnosticsEngine,
  getSafeRoute,
  type DiagnosticCategory,
  type DiagnosticEvent,
} from './diagnostics-engine';

export interface CrashEntry {
  message: string;
  stack: string;
  time: string;
  route: string;
  type?: string;
  step?: string;
  commit?: string;
}

export {
  recordDiagnosticEvent,
  getDiagnosticEntries,
  clearDiagnostics,
  initDiagnosticsEngine,
  getSafeRoute,
  type DiagnosticCategory,
  type DiagnosticEvent,
};

export function recordCrash(entry: {
  message: string;
  stack?: string;
  route?: string;
  time?: string;
  type?: string;
  step?: string;
  commit?: string;
}): void {
  const category: DiagnosticCategory =
    entry.type === 'react-boundary' ? 'REACT_CRASH' : 'RUNTIME_ERROR';

  recordDiagnosticEvent({
    category,
    message: entry.message || 'Unknown error',
    stack: entry.stack,
    route: entry.route,
    time: entry.time,
    commit: entry.commit,
    type: entry.type,
    step: entry.step,
  });
}

export function getLastCrashes(): CrashEntry[] {
  const events = getDiagnosticEntries();
  return events
    .filter(
      (e) =>
        e.category === 'REACT_CRASH' ||
        e.category === 'RUNTIME_ERROR' ||
        e.type === 'startup-crash'
    )
    .slice(0, 5)
    .map((e) => ({
      message: e.message,
      stack: e.stack || '',
      time: e.time,
      route: e.route,
      ...(e.type ? { type: e.type } : {}),
      ...(e.step ? { step: e.step } : {}),
      ...(e.commit ? { commit: e.commit } : {}),
    }));
}

export function clearCrashes(): void {
  clearDiagnostics();
}

export function initCrashLogger(): void {
  initDiagnosticsEngine();
}

