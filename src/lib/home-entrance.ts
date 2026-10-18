/**
 * Home Entrance Animation Session State
 * Tracks whether the home screen entrance animation has already played during this app session.
 * Subsequent tab returns and resumes skip entrance animations to prevent dim/washed-out rendering.
 */

let hasCompletedHomeEntranceSession = false;

export function hasHomeEntranceCompleted(): boolean {
  return hasCompletedHomeEntranceSession;
}

export function markHomeEntranceCompleted(): void {
  hasCompletedHomeEntranceSession = true;
}

export function resetHomeEntranceForTesting(): void {
  hasCompletedHomeEntranceSession = false;
}
