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
    version: '2.2.1',
    date: '2026-10-27',
    title: 'Phase 3 & Phase 2 Polish — Tilawah, Hifz, Heatmaps & Dark-Jewel Themes',
    changes: [
      { type: 'feature', description: 'Online-First Live Prayer Engine & 1-Page A4 Masjid Timetable PDF: High-precision calculation with AlAdhan live sync, manual minute offsets, and 1-tap print/export.' },
      { type: 'feature', description: 'All-in-One Worship, Sunnah & Fasting Heatmap Journal: Comprehensive salah tracking, Sunnah prayer chains, fast logs, and interactive GitHub-style consistency heatmaps.' },
      { type: 'feature', description: 'Smart Khatmah Planner + Juz 1–30 + # Jump: Pace your Quran completion with daily portions, Juz index, and quick jumping by page or chapter.' },
      { type: 'feature', description: 'Upgraded 3D Gemstone Tasbeeh & Sunnah Chain: Tactile counting with authentic bead physical response and instant native home widget synchronization.' },
      { type: 'feature', description: '5 Dark-Jewel Themes: Curated Oxford Gold, Madinah Emerald, Imperial Violet, Burgundy Velvet, and Desert Scroll palettes.' },
      { type: 'fix', description: 'Eliminated cold-start OS GPS dialog collision and streamlined Set Location search with zero bleed-through suggestions.' },
    ],
  },
  {
    version: '2.2.0',
    date: '2026-08-01',
    title: 'APK Size Optimization, Modular Settings Architecture, Smart Notifications & Major Refactor',
    changes: [
      { type: 'feature', description: 'Modular Settings Experience: Rebuilt Settings into a fast, intuitive index with streamlined sub-sections for smooth navigation and lower memory usage.' },
      { type: 'feature', description: 'Expanded Islamic Notification Suite: Added 5 new smart notification categories to NotificationManager and settings toggle panel — Pre-Fajr Tahajjud & Night Prayer, Salat al-Duha alerts, Sunnah Fasting (Mondays & Thursdays), Daily Quran Tilawat goal reminders, and Bedtime Sunnah Azkar.' },
      { type: 'improvement', description: 'Privacy-First Community & Support: Direct team support email and community channels.' },
      { type: 'fix', description: 'Native Widget Reliability: Quran Progress widget now updates promptly and reliably across home screen refreshes.' },
      { type: 'fix', description: 'Native Widget Reliability: Daily Ayah and Hadith widgets seamlessly provide authentic daily wisdom with robust fallback handling.' },
      { type: 'fix', description: 'Native Widget Reliability: Removing one widget type preserves active foreground monitoring and scheduled adhan alerts for remaining widgets.' },
      { type: 'fix', description: 'Native Widget Reliability: Prayer times maintain strict astronomical precision without unwanted daylight-saving hour offsets.' },
      { type: 'fix', description: 'Native Widget Reliability: Widget prayer data synchronization guarantees real-time synchronization with active app settings.' },
      { type: 'fix', description: 'Native Widget Reliability: Enabled device-protected storage for widgets, ensuring accurate updates even immediately after phone reboot.' },
      { type: 'improvement', description: 'Native Widget Cleanup: Streamlined background services for minimal battery consumption.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Premium Visual Redesign: All five widgets completely redesigned with Material 3 glassmorphism, translucent inner rim borders, gold gradient dividers, and unified Arabic brand headers.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Light + Dark Themes: All 5 widgets now ship a full light palette alongside the dark theme, switching appearance dynamically with the system.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — System Corner Radius: Adaptive rounded corners harmonized with Android 12+ system launcher curves.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Reconfigurable Widgets: All 5 widgets support instant reconfiguration (size, theme, accent) directly from the home screen.' },
      { type: 'improvement', description: 'Native Widget Quality Pass — Contrast: Refined typography and color contrast across both light and dark modes for superior readability.' },
      { type: 'improvement', description: 'APK Size Reduction: Streamlined bundled media and compressed assets for a significantly smaller download size.' },
      { type: 'improvement', description: 'Performance Optimization Pass: Smooth 60fps dashboard experience with intelligent component re-rendering and shared scheduling.' },
      { type: 'improvement', description: 'Faster Long Lists: Infinite scrolling and responsive memoization across Hadith books, Tafsir, and Names of Allah.' },
      { type: 'improvement', description: 'Faster App Startup: Optimized initial load times and deferred non-critical background tasks for instantaneous app launch.' },
      { type: 'improvement', description: 'Smoother Low-End Devices: Adaptive rendering tailored to device capabilities for smooth transitions everywhere.' },
      { type: 'fix', description: 'Memory Management: Clean resource lifecycle management ensuring zero background leaks.' },
      { type: 'fix', description: 'Live Streams Reliability: Resilient Makkah and Madinah HLS live streaming with automatic source failover.' },
      { type: 'fix', description: 'Android Fullscreen Rendering: Edge-to-edge landscape viewing with notch avoidance and responsive video scaling.' },
      { type: 'improvement', description: 'Quality Selector Cleanup: Clean, uncluttered streaming controls adapt to available stream bandwidth.' },
      { type: 'feature', description: 'Major Prayer Calculation Rewrite: High-precision calculation engine with robust offline fallback chain and throttled notifications.' },
      { type: 'improvement', description: 'Unified Quran Experience: Focused all Quran reading through the high-performance continuous Quran reader.' },
      { type: 'feature', description: 'Personalized Cycle & Health Companion: Intuitive bottom navigation bar with daily water hydration tracker and wellness insights.' },
      { type: 'feature', description: 'Smart Wellness Notifications: Gentle contextual reminders and Sunday evening voluntary fast suggestions.' },
      { type: 'feature', description: 'Personalized Worship Synchronization: Seamlessly pauses missed prayer calculations and silences alerts during personal rest periods.' },
      { type: 'improvement', description: 'Daily Wellness Logging: Clear confirmation cards and quick-edit options for effortless daily tracking.' },
      { type: 'fix', description: 'State Persistence: Reliable local storage ensures wellness logs persist across tab switches and restarts.' },
      { type: 'fix', description: 'Fasting Tracker Accuracy: Accurate calculation and count adjustments for completed and remaining fasts.' },
      { type: 'fix', description: 'Android 14+ Notification Reliability: Enhanced background notification handling and icon rendering across all recent Android versions.' },
      { type: 'fix', description: 'Background Service Resilience: Improved stability for background widget updates and adhan alerts.' },
      { type: 'feature', description: 'Islamic Wellness Library: Curated Islamic guidance and wellness articles on mental health, nutrition, and exercise.' },
      { type: 'improvement', description: 'Personalized Worship & Notification Preferences: Unified settings storage with smooth UI transitions and responsive performance.' },
      { type: 'feature', description: 'Prayer Alarm Caching: Efficient local caching reduces redundant network requests and conserves battery.' },
      { type: 'feature', description: 'Audio Equalizer: Dynamic animated audio visualizer for Nasheed Player with smooth bars and jewel styling.' },
      { type: 'feature', description: 'Nasheed Offline Playback: Playback caching ensures your favorite nasheeds remain accessible without an active connection.' },
      { type: 'feature', description: 'Artist Filtering: Convenient artist chips for effortless browsing through the nasheed catalog.' },
      { type: 'feature', description: 'Quick Scroll to Top: 1-tap jump to the top of long lists throughout the application.' },
      { type: 'feature', description: 'Virtualized List Support: High-efficiency virtual scrolling for smooth browsing through thousands of records.' },
      { type: 'improvement', description: 'Prayer Times Accuracy: Robust time parsing and eliminated race conditions in prayer status calculations.' },
      { type: 'improvement', description: 'Global Alarm Lifecycle: Safe background lifecycle management and clean event listener teardown.' },
      { type: 'fix', description: 'Settings Stability: Polished preference handling and error recovery across all device configurations.' },
      { type: 'fix', description: 'Prayer Tracking Bridge: Automated missed prayer detection syncs seamlessly from the home screen.' },
      { type: 'fix', description: 'Check-in Validation: Prevents premature prayer check-in before the actual prayer time has arrived.' },
      { type: 'fix', description: 'Qaza History Centralized: Robust tracking and goal setting for making up missed prayers.' },
      { type: 'fix', description: 'Streak Reset Logic: Intelligently evaluates streak continuity upon returning to the app.' },
      { type: 'fix', description: 'Hadith Collection Loading: Smooth skeleton loading eliminates content flashing when opening Hadith collections.' },
      { type: 'improvement', description: 'Codebase Streamlining: Cleaned obsolete legacy modules for faster builds and reduced memory overhead.' },
      { type: 'improvement', description: 'Dashboard Optimization: Streamlined home screen initialization for instant response.' },
      { type: 'improvement', description: 'Comprehensive Multilingual Coverage: Full localization across all supported languages with authentic cultural formatting.' },
      { type: 'improvement', description: 'Intelligent Notification Engine: Deterministic scheduling and reliable calendar countdowns.' },
      { type: 'improvement', description: 'Bulletproof Backup & Restore: 100% offline-ready local backup with system share sheet export and automatic safety checks.' },
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
      { type: 'feature', description: 'Qibla Enhancements: Single smart button with geo-anchor note, magnetic declination correction, and metal-interference calibration assistance.' },
      { type: 'fix', description: 'Personalized Cycle & Worship Settings: Automated prayer pause/resume, backup sync, and streamlined routing.' },
      { type: 'fix', description: 'Data Integrity & Memory Management: Enhanced data safety, eliminated memory leaks, and improved long-session stability.' },
      { type: 'fix', description: 'Widget Stability: Resilient background receiver architecture, validated payload handling, and polished Arabic typography.' },
      { type: 'fix', description: 'Quran Reader: Progressive rendering for high-FPS reading and perfectly aligned page numbers.' },
      { type: 'fix', description: 'SurahList: Smooth navigation transitions and responsive list rendering.' },
      { type: 'fix', description: 'Splash Screen: Fast CSS splash screen cutting startup latency significantly.' },
      { type: 'fix', description: 'Hadith: Smooth collection browsing, persistent bookmarks, and instant back navigation.' },
      { type: 'fix', description: 'Hadith Bookmarks: Dedicated bookmark management across all Hadith collections.' },
      { type: 'fix', description: 'Settings: Motion preference toggle cleanly controls heavy animations globally.' },
      { type: 'fix', description: 'Quran Reader: Resolved text overflow issues where English Surah names were going off-screen on smaller devices.' },
      { type: 'fix', description: 'Quran Reader: Instant golden loading indicator for smooth opening transitions.' },
      { type: 'fix', description: 'App Icon: High-contrast adaptive icon rendering across all Android launchers.' },
      { type: 'improvement', description: 'Open-Source & Privacy Alignment: Updated licensing metadata and synchronized feature documentation.' },
      { type: 'improvement', description: 'Media Statistics: Consolidated listening and watch time tracking for Makkah and Madinah live streams.' },
      { type: 'improvement', description: 'Premium Dashboard: Dark and jewel accents, dynamic greetings, and elegant backdrops.' },
      { type: 'improvement', description: 'Backward Compatibility: Refined device optimization routines for seamless execution on older devices.' },
      { type: 'improvement', description: 'Streamlined Quran Engine: Optimized reading assets for a leaner, faster application.' },
      { type: 'improvement', description: 'App Footprint Reduction: Optimized packaged assets for faster downloads and reduced storage usage.' },
      { type: 'fix', description: 'Qibla Performance: Sensor stabilization and smoothed dial motion for responsive orientation.' },
      { type: 'improvement', description: 'App UI Polish: Standardized colors, subtle blurs, and jewel accents across all dashboard widgets.' },
      { type: 'fix', description: 'Deployment & Rendering Stability: Resolved asset chunking and rendering consistency across platforms.' },
    ],
  },
  {
    version: '1.3.0',
    date: '2026-07-03',
    title: 'Expanded Features — Zen Mode, Hadith, Widgets, Noor Cycle',
    changes: [
      { type: 'feature', description: 'Zen Mode (Tasbeeh) with tactile dhikr counter, categories, and review mode.' },
      { type: 'feature', description: 'Quiz expansion: categories, review mode, and gamification streaks.' },
      { type: 'feature', description: 'Duas expansion: search, Dua of the Day, audio playback, and repetition counter.' },
      { type: 'feature', description: 'Hadith/Seerah/Qisas UI/UX overhaul: skeleton loading, Continue Reading cards, share buttons, and copy-with-toast.' },
      { type: 'feature', description: 'Personalized Cycle & Health Companion: Comprehensive wellness companion with calendar, ghusl reminders, and wellness insights.' },
      { type: 'feature', description: 'Islamic Remedies mood grid redesign, full-screen viewer, gamification stats, and Dashboard widget.' },
      { type: 'feature', description: 'Widget system rebuilt from scratch with native Kotlin implementation and Material You design.' },
      { type: 'feature', description: 'Comprehensive performance optimization for low-end devices: memoization, virtualization, code-splitting, and lazy loading.' },
      { type: 'feature', description: 'Notification overhaul: authentic hadith randomization, low-end device throttling, and deduplicated scheduling.' },
      { type: 'fix', description: 'Qibla: compass heading accuracy, layout overflow fixes, and high-precision sensor calibration.' },
      { type: 'fix', description: 'Profile Page: Updated calculation method labels, Islamic sleep reminders, and smooth surah listing.' },
      { type: 'fix', description: 'Calendar: wired daysUntilRamadan, replaced offline fallback with tabular Islamic calendar, and dynamic Eid date lookup.' },
    ],
  },
  {
    version: '1.2.0',
    date: '2026-03-30',
    title: 'Live Radio Widget & Native Android Improvements',
    changes: [
      { type: 'feature', description: 'Brand new Live Quran Radio Widget with direct background audio playback and home screen controls.' },
      { type: 'feature', description: 'Complete rebuild of Next Adhan, Daily Ayah, and Daily Schedule Widgets in native Kotlin for perfect battery efficiency.' },
      { type: 'fix', description: 'Streaks & Check-in: Ensured daily quiz streaks and check-in rewards adapt gracefully to personalized worship preferences.' },
      { type: 'improvement', description: 'Added premium Android notification center integration with large icon display support.' },
      { type: 'fix', description: 'Accurate Islamic holiday alerts and celebratory Eid greetings.' },
      { type: 'fix', description: 'High-precision sensor calibration for reliable Qibla direction finding.' },
      { type: 'fix', description: 'Refactored geolocation with robust offline fallbacks and consolidated permissions.' },
      { type: 'fix', description: 'Fixed qibla compass heading, layout overflow, and widget data flow bugs.' },
      { type: 'security', description: 'Core Security & Resilience: Enhanced data boundary protection, secure script handling, and resilient error recovery.' },
    ],
  },
  {
    version: '1.1.0',
    date: '2026-03-20',
    title: 'Personalized Worship & Notification Preferences',
    changes: [
      { type: 'feature', description: 'Added profile customization for a tailored Islamic companion experience' },
      { type: 'feature', description: 'Personalized worship mode for intelligent prayer notification management' },
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
      return 'bg-[var(--accent-soft)] text-[var(--accent-text)] border-[var(--border)]';
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
