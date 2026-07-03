/**
 * Changelog Service
 * Manages app changelog data and tracks which versions have been seen by the user
 */

import { CURRENT_APP_VERSION } from './constants';

export type ChangeType = 'feature' | 'fix' | 'improvement' | 'breaking' | 'security';

export interface Change {
  type: ChangeType;
  description: string;
}

export interface VersionChangelog {
  version: string;
  date: string;
  title: string;
  changes: Change[];
}

export interface ChangelogState {
  lastSeenVersion: string;
  dismissedVersions: string[];
}

const STORAGE_KEYS = {
  CHANGELOG_STATE: 'changelog-state',
};

// Changelog data - ordered from newest to oldest
export const CHANGELOG_DATA: VersionChangelog[] = [
  {
    version: '1.2.0',
    date: '2026-03-30',
    title: 'Live Radio Widget & Native Android Improvements',
    changes: [
      { type: 'feature', description: 'Brand new Live Quran Radio Widget with direct background audio playback and home screen controls.' },
      { type: 'feature', description: 'Complete rebuild of Next Adhan, Daily Ayah, and Daily Schedule Widgets in native Kotlin for perfect Doze mode performance.' },
      { type: 'fix', description: 'Fixed Quiz streak logic and Daily check-in errors during Menstrual Mode overrides.' },
      { type: 'improvement', description: 'Added premium Android 14 notification center integration with large icon display support.' },
      { type: 'fix', description: 'Corrected premature Eid Mubarak popups from triggering before Shawwal.' }
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-20',
    title: 'Gender-Based Features & Menstrual Mode',
    changes: [
      { type: 'feature', description: 'Added gender selection for personalized experience' },
      { type: 'feature', description: 'Menstrual mode for prayer notification management' },
      { type: 'feature', description: 'Widget customization system' },
      { type: 'improvement', description: 'Enhanced dashboard with customizable widgets' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-03-01',
    title: 'Initial Release',
    changes: [
      { type: 'feature', description: 'Quran reading with audio recitation' },
      { type: 'feature', description: 'Prayer times with location detection' },
      { type: 'feature', description: 'Qibla direction finder' },
      { type: 'feature', description: 'Daily ayah and hadith' },
      { type: 'feature', description: 'Tasbeeh counter' },
      { type: 'feature', description: 'Islamic quiz with XP system' },
      { type: 'feature', description: 'Duas and supplications collection' },
      { type: 'feature', description: '99 Names of Allah' },
    ],
  },
];

export function getChangelogState(): ChangelogState {
  const saved = localStorage.getItem(STORAGE_KEYS.CHANGELOG_STATE);
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    lastSeenVersion: '',
    dismissedVersions: [],
  };
}

export function saveChangelogState(state: ChangelogState): void {
  localStorage.setItem(STORAGE_KEYS.CHANGELOG_STATE, JSON.stringify(state));
}

export function markVersionAsSeen(version: string): void {
  const state = getChangelogState();
  state.lastSeenVersion = version;
  if (!state.dismissedVersions.includes(version)) {
    state.dismissedVersions.push(version);
  }
  saveChangelogState(state);
}

export function hasUnseenChangelog(): boolean {
  const state = getChangelogState();
  const currentVersion = CURRENT_APP_VERSION;
  
  // Check if current version has been seen
  if (state.lastSeenVersion === currentVersion) {
    return false;
  }
  
  // Check if there are any changelogs for versions newer than last seen
  const lastSeenIndex = CHANGELOG_DATA.findIndex(c => c.version === state.lastSeenVersion);
  const currentIndex = CHANGELOG_DATA.findIndex(c => c.version === currentVersion);
  
  // If we haven't seen anything, show changelog for current version
  if (state.lastSeenVersion === '') {
    return currentIndex !== -1;
  }
  
  // Show if current version is different from last seen
  return currentIndex !== -1 && currentIndex < lastSeenIndex;
}

export function getUnseenChangelogs(): VersionChangelog[] {
  const state = getChangelogState();
  const lastSeenIndex = CHANGELOG_DATA.findIndex(c => c.version === state.lastSeenVersion);
  
  if (lastSeenIndex === -1) {
    // Show all if nothing seen, or just current version
    const currentIndex = CHANGELOG_DATA.findIndex(c => c.version === CURRENT_APP_VERSION);
    return currentIndex !== -1 ? [CHANGELOG_DATA[currentIndex]] : [];
  }
  
  // Return all changelogs since last seen
  return CHANGELOG_DATA.slice(0, lastSeenIndex);
}

export function getChangelogForVersion(version: string): VersionChangelog | undefined {
  return CHANGELOG_DATA.find(c => c.version === version);
}

export function getAllChangelogs(): VersionChangelog[] {
  return CHANGELOG_DATA;
}

export function getChangeTypeIcon(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return '✨';
    case 'fix':
      return '🐛';
    case 'improvement':
      return '⚡';
    case 'breaking':
      return '⚠️';
    case 'security':
      return '🔒';
    default:
      return '📝';
  }
}

export function getChangeTypeLabel(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return 'New Feature';
    case 'fix':
      return 'Bug Fix';
    case 'improvement':
      return 'Improvement';
    case 'breaking':
      return 'Breaking Change';
    case 'security':
      return 'Security';
    default:
      return 'Update';
  }
}

export function getChangeTypeColor(type: ChangeType): string {
  switch (type) {
    case 'feature':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'fix':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'improvement':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'breaking':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'security':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}
