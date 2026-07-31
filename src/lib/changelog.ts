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
    version: '2.2.0',
    date: '2026-07-31',
    title: 'Backup UI, Prayer Tracking Fixes & Cache Warning',
    changes: [
      { type: 'feature', description: 'Advanced Notification System: Deep native integration for high-priority Adhaan notifications with direct lock-screen controls to "Stop Adhaan" or "Open App".' },
      { type: 'feature', description: 'Context-Aware Prayer Quotes: Intelligent prayer reminders that attach specific Quranic Ayahs or Ahadith related to the exact prayer time (e.g., Fajr-specific Hadith for Fajr reminders).' },
      { type: 'feature', description: 'Islamic Nasheeds Library: High-performance audio player with 400+ vocals-only, copyright-free nasheeds powered by a custom Cloudflare CDN.' },
      { type: 'feature', description: 'Advanced Media Player: Persistent background audio playback, queue management, favorites system, offline resilience, and weak-WiFi auto-buffering.' },
      { type: 'feature', description: 'Backup System UI Redesign: Gold-themed card with animated status indicator, success flash feedback, and CSS-only micro-interactions that preserve 60fps on low-end devices.' },
      { type: 'feature', description: 'Expandable "How Backup Works" section: Detailed 4-part guide explaining automatic device backup (20-min snapshots), Google Drive cloud backup, manual file export, and restore process. Translated in 5 languages.' },
      { type: 'feature', description: 'Cache Clear Warning: Replaced native confirm() dialog with a proper AlertDialog that clearly explains what will be removed (downloaded books, cached assets) and what stays safe (prayer records, bookmarks, settings, backup snapshot).' },
      { type: 'improvement', description: 'Modern Notification History: Beautiful, fully-featured notification history tracking UI with rich visual cards, status badges, timestamp grouping, and categorical filtering.' },
      { type: 'improvement', description: 'Profile Polish: "Open Source & Support" card redesigned with full-width buttons, and added direct WhatsApp feedback integration.' },
      { type: 'fix', description: 'Widget Data Sync: Fixed QuranProgressWidget badge behavior and corrected RTL text alignment in DailyHadith widget.' },
      { type: 'fix', description: 'Critical Prayer Tracking Bridge: Moved syncMissedPrayersToQaza() from the unused SalahTracker component into Dashboard.tsx. Missed prayers are now correctly auto-detected and added to qaza from the home screen.' },
      { type: 'fix', description: 'Dashboard Prayer Time Validation: Check-in now passes prayer times to togglePrayer(), so users get the "Cannot check in before prayer time" error instead of silently bypassing the time gate.' },
      { type: 'fix', description: 'Qaza History Centralized: Moved history and daily goal management from direct localStorage in QazaPage into qaza-tracker.ts lib functions (getQazaHistory, addQazaHistoryEntry, getQazaDailyGoal, setQazaDailyGoal).' },
      { type: 'fix', description: 'PrayerName Type Deduplicated: qaza-tracker.ts now re-exports PrayerName from salah-tracker.ts instead of maintaining a separate identical type definition.' },
      { type: 'fix', description: 'Streak Reset on Foreground: Added visibilitychange listener in Dashboard.tsx that calls checkStreakReset() when the app returns to foreground, ensuring streaks reset correctly even after days away.' },
      { type: 'fix', description: 'Hadith Collection Flash Fix: HadithBookView now initializes metadataLoading to true and checks remoteCollectionData instead of staticCollectionData for the loading guard. Eliminates the "1 book" flash when entering a collection.' },
      { type: 'improvement', description: 'Dead Code Removed: Deleted SalahTracker.tsx (205 lines), PrayerTimesList.tsx (451 lines), and EnhancedPrayerTimesList.tsx (111 lines) — all were imported but never rendered in any JSX.' },
      { type: 'improvement', description: 'Dashboard Cleanup: Removed unused lazy imports for PrayerTimesList, SalahTracker, and QazaTracker from Dashboard.tsx.' },
    ],
  },
  {
    version: '2.0.1',
    date: '2026-07-21',
    title: 'Quran Progress Tracking Fixes',
    changes: [
      { type: 'fix', description: 'Fixed incorrect surah count: Progress now only counts fully completed surahs (when all ayahs are read), not partially read ones.' },
      { type: 'fix', description: 'Fixed misleading UI text: Updated "Surahs Completed" to "Surahs fully Completed" for clarity.' },
      { type: 'fix', description: 'Fixed wrong progress calculation: Changed from ayah-based estimation to accurate page-based tracking (604 total pages).' },
      { type: 'fix', description: 'Fixed position tracking bug: Progress now tracks current page position instead of maximum page ever visited.' },
      { type: 'fix', description: 'Fixed widget sync mismatch: Added widget-compatible localStorage key sync for native Android widgets.' },
      { type: 'improvement', description: 'Updated QuranProgressWidget to display pages read (X/604) instead of ayahs.' },
      { type: 'improvement', description: 'Modified quran-features service to track pages read and calculate percentage based on pages.' },
      { type: 'improvement', description: 'Fixed QuranReader to use current page instead of maxPageViewed for progress.' },
      { type: 'improvement', description: 'Added widget progress synchronization with proper payload formatting.' },
    ],
  },
  {
    version: '2.0.0',
    date: '2026-07-10',
    title: 'Noor Connect 2.0 — Major Release',
    changes: [
      { type: 'feature', description: 'Widget System v2: 5 native Kotlin widgets (Next Prayer, Daily Ayah, Daily Hadith, Quran Progress, Tasbeeh Counter) rebuilt from scratch with Material You dynamic color.' },
      { type: 'feature', description: 'Noor Cycle: ovulation day tracking, cycle insights, fertile window, analytics tab with recharts, and PDF doctor report export.' },
      { type: 'feature', description: 'Seerah chapters and Qisas (Stories of Prophets) reader with offline tafsir support and progress tracking.' },
      { type: 'feature', description: 'Zakat Calculator: silver asset calculation, exchange rate fallback service, and preferred currency persistence.' },
      { type: 'feature', description: 'Hadith expansion: 10 new collections (adab, ahmad, bulugh, darimi, forty, hisn, malik, mishkat, riyadussalihin, shamail), HadithDetail page, and HadithBookmarks.' },
      { type: 'feature', description: 'Backup & Restore: cross-platform localStorage-based backup with auto-restore on reinstall and smart background processing.' },
      { type: 'feature', description: 'Low-end device optimizations: device detection, adaptive performance settings, React Query tuning, and 30+ FPS target on 2016+ devices.' },
      { type: 'feature', description: 'Islamic Remedies: mood grid redesign, full-screen remedy viewer with framer-motion entrance animations, gamification, and Dashboard widget.' },
      { type: 'feature', description: 'Radio Statistics & Achievements: per-station listening stats, total watch time, streak tracking, and unlockable achievements.' },
      { type: 'feature', description: 'Quran reading progress (X/Y) on all book cards, uploads, and detail modal; PDF reader with local worker and blob: CSP fix.' },
      { type: 'feature', description: 'LiveStreams: aggressive HLS buffering (120s), quality switcher UI (Auto/320p/480p), and hardcapped recovery loop to prevent OS freezing on weak networks.' },
      { type: 'feature', description: 'Qibla enhancements: single smart button with geo-anchor note, magnetic declination correction via NOAA API, device orientation and metal-interference warnings with calibration UX.' },
      { type: 'fix', description: 'Critical Haidh Tracker fixes: prayer pause/resume on cycle start/end, backup inclusion, gender filter, and route consolidation.' },
      { type: 'fix', description: 'TypeScript strictness: removed unsafe JSON.parse and as any casts, fixed dependency arrays, race conditions, and memory leaks.' },
      { type: 'fix', description: 'Widget stability: WidgetBootReceiver refactor, payload validation logging, thread-safe HadithBundle.cachedHadiths, and Arabic RTL fixes.' },
      { type: 'fix', description: 'Quran Reader: chunked progressive rendering to fix massive FPS drop and CLS; surah-to-page mapping corrected with proper +2 image offset.' },
      { type: 'fix', description: 'SurahList: wrapped navigation in startTransition to fix poor INP; replaced react-window v1 List with standard mapped list.' },
      { type: 'fix', description: 'Splash screen: removed framer-motion and rewrote in pure CSS, cutting LCP from 5s to under 1s.' },
      { type: 'fix', description: 'Hadith: singleton FPS monitor, fixed double API calls, back navigation, loading states, and collection metadata (totalHadith/totalBooks).' },
      { type: 'fix', description: 'Hadith bookmarks: new HadithBookmarks page, useHadithBookmarks hook, and bookmark buttons on all hadith pages.' },
      { type: 'fix', description: 'Settings: Toggle "Animations" now correctly disables all heavy Framer Motion animations globally across the app.' },
      { type: 'fix', description: 'Quran Reader: Resolved text overflow issues where English Surah names were going off-screen on smaller devices.' },
      { type: 'fix', description: 'Quran Reader: Added an instant golden loading spinner and useTransition hook to eliminate the slight delay when opening a Surah.' },
      { type: 'fix', description: 'App Icon: Removed android:roundIcon attribute from AndroidManifest to resolve icon rendering issues on legacy Android brands.' },
      { type: 'improvement', description: 'F-Droid Metadata: Updated license to GPL-3.0-or-later and synchronized feature descriptions (Widgets, Menstrual Tracker, Zakat) for store publication.' },
      { type: 'improvement', description: 'RadioStats consolidated into unified MediaStats tracking Live Makkah/Madinah watch time.' },
      { type: 'improvement', description: 'Spotify-inspired PremiumDashboard with gold/green accents, dynamic greetings, and backdrop blurs.' },
      { type: 'improvement', description: 'Device performance imports fixed for backward compatibility (performance-optimizations instead of device-performance.ts).' },
      { type: 'improvement', description: 'Removed vestigial Quran Display Settings from Profile page (font size slider, script style dropdown, and clear cache button) since Quran now uses Mushaf image pages.' },
      { type: 'improvement', description: 'Deleted orphaned components MushafPage.tsx and MushafWord.tsx which were no longer imported anywhere in the app.' },
      { type: 'improvement', description: 'F-Droid APK size reduction: stripped >300MB of offline JSON data via clean-dist-data.js, allowing the F-Droid build to heavily rely on remote CDNs for an 84MB footprint.' },
      { type: 'fix', description: 'Qibla performance: removed conflicting CSS transitions on the compass dial, eliminating sensor jitter and rubber-banding lag on legacy Android devices.' },
      { type: 'improvement', description: 'App UI polish: applied the Azimuth premium dark/amber aesthetic to all dashboard widgets, standardizing colors and blurs.' },
      { type: 'fix', description: 'Removed chunking errors to resolve Vercel deployment circular dependency and React Context rendering issues.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-03',
    title: 'Expanded Features — Zen Mode, Hadith, Widgets, Noor Cycle',
    changes: [
      { type: 'feature', description: 'Zen Mode (Tasbeeh) with dhikr counter, categories, and review mode.' },
      { type: 'feature', description: 'Quiz expansion: categories, review mode, and gamification streaks.' },
      { type: 'feature', description: 'Duas expansion: search, DuaOfDay, audio playback, and counter.' },
      { type: 'feature', description: 'Hadith/Seerah/Qisas UI/UX overhaul: skeleton loading, Continue Reading cards, share buttons, and copy-with-toast.' },
      { type: 'feature', description: 'Noor Cycle (Haidh Tracker) foundation with 6 tabs (Calendar, Ghusl, Islamic, Log, Settings, Today).' },
      { type: 'feature', description: 'Islamic Remedies mood grid redesign, full-screen viewer, gamification stats, and Dashboard widget.' },
      { type: 'feature', description: 'Widget system rebuilt from scratch with native Kotlin implementation and Material You design.' },
      { type: 'feature', description: 'Comprehensive performance optimization for low-end devices: React.memo, virtualization, code-splitting, and lazy loading.' },
      { type: 'feature', description: 'Notification overhaul: fixed hadith randomization, low-end device throttling, dynamic SW dates, dedup scheduling, and caching.' },
      { type: 'fix', description: 'Qibla: compass heading accuracy, layout overflow fixes, and F-Droid compliance with custom FOSS sensor implementation.' },
      { type: 'fix', description: 'Profile page: madhab labels updated, Islamic sleep reminder toggle added, SurahList react-window import fixed.' },
      { type: 'fix', description: 'Calendar: wired daysUntilRamadan, replaced offline fallback with tabular Islamic calendar, and dynamic Eid date lookup.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-30',
    title: 'Live Radio Widget & Native Android Improvements',
    changes: [
      { type: 'feature', description: 'Brand new Live Quran Radio Widget with direct background audio playback and home screen controls.' },
      { type: 'feature', description: 'Complete rebuild of Next Adhan, Daily Ayah, and Daily Schedule Widgets in native Kotlin for perfect Doze mode performance.' },
      { type: 'fix', description: 'Fixed Quiz streak logic and Daily check-in errors during Menstrual Mode overrides.' },
      { type: 'improvement', description: 'Added premium Android 14 notification center integration with large icon display support.' },
      { type: 'fix', description: 'Corrected premature Eid Mubarak popups from triggering before Shawwal.' },
      { type: 'fix', description: 'Replaced non-free qibla library with custom FOSS sensor implementation for F-Droid compliance.' },
      { type: 'fix', description: 'Refactored geolocation to use Web API and consolidated Permission Manager for cross-platform stability.' },
      { type: 'fix', description: 'Fixed qibla compass heading, layout overflow, and widget data flow bugs.' },
      { type: 'fix', description: 'Critical security fixes: TypeScript strict mode enabled, XSS vulnerability patched, ErrorBoundary added, and console.log stripped from production.' },
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
  
  if (state.lastSeenVersion === currentVersion) {
    return false;
  }
  
  const lastSeenIndex = CHANGELOG_DATA.findIndex(c => c.version === state.lastSeenVersion);
  const currentIndex = CHANGELOG_DATA.findIndex(c => c.version === currentVersion);
  
  if (state.lastSeenVersion === '') {
    return currentIndex !== -1;
  }
  
  return currentIndex !== -1 && currentIndex < lastSeenIndex;
}

export function getUnseenChangelogs(): VersionChangelog[] {
  const state = getChangelogState();
  const lastSeenIndex = CHANGELOG_DATA.findIndex(c => c.version === state.lastSeenVersion);
  
  if (lastSeenIndex === -1) {
    const currentIndex = CHANGELOG_DATA.findIndex(c => c.version === CURRENT_APP_VERSION);
    return currentIndex !== -1 ? [CHANGELOG_DATA[currentIndex]] : [];
  }
  
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
