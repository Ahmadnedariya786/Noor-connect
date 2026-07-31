# Changelog

All notable changes to Noor Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.2.0] - 2026-07-31

### Backup UI, Prayer Tracking Fixes & Cache Warning

#### ✨ New Features
- **Advanced Notification System**: Deep native integration for high-priority Adhaan notifications with direct lock-screen controls to "Stop Adhaan" or "Open App".
- **Context-Aware Prayer Quotes**: Intelligent prayer reminders that attach specific Quranic Ayahs or Ahadith related to the exact prayer time (e.g., Fajr-specific Hadith for Fajr reminders).
- **Islamic Nasheeds Library**: High-performance audio player with 400+ vocals-only, copyright-free nasheeds powered by a custom Cloudflare CDN.
- **Advanced Media Player**: Persistent background audio playback, queue management, favorites system, offline resilience, and weak-WiFi auto-buffering.
- **Backup System UI Redesign**: Gold-themed card with animated status indicator, success flash feedback, and CSS-only micro-interactions that preserve 60fps on low-end devices.
- **Expandable "How Backup Works" section**: Detailed 4-part guide explaining automatic device backup (20-min snapshots), Google Drive cloud backup, manual file export, and restore process. Translated in 5 languages.
- **Cache Clear Warning**: Replaced native `confirm()` dialog with a proper AlertDialog that clearly explains what will be removed (downloaded books, cached assets) and what stays safe (prayer records, bookmarks, settings, backup snapshot).

#### ⚡ Improvements
- **Modern Notification History**: Beautiful, fully-featured notification history tracking UI with rich visual cards, status badges, timestamp grouping, and categorical filtering.
- **Profile Polish**: "Open Source & Support" card redesigned with full-width buttons, and added direct WhatsApp feedback integration.
- **Dead Code Removed**: Deleted `SalahTracker.tsx` (205 lines), `PrayerTimesList.tsx` (451 lines), and `EnhancedPrayerTimesList.tsx` (111 lines) — all were imported but never rendered in any JSX.
- **Dashboard Cleanup**: Removed unused lazy imports for `PrayerTimesList`, `SalahTracker`, and `QazaTracker` from Dashboard.tsx.

### 🌐 Complete Language & Translation Overhaul (New in 2.2.0)
- **All Locale Files Synchronized**: All 5 languages (English, Arabic, Urdu, Bengali, Russian) now have **410 translation keys** each — previously 278-314 keys with 99-105 missing per language.
- **Hardcoded English Strings Eliminated**: Fixed 20+ AppBar titles, BottomNav labels, DashboardFeatureCards, and component strings that bypassed the i18n system. All now use `t()` translation function.
- **Locale-Aware Formatting**: `time-formatter.ts`, `useI18n.ts`, and `widget-service.ts` now respect the app's selected language for date/number formatting instead of hardcoded `en-US`.
- **RTL/Widget Sync Consistency**: Migrated components from bare `useTranslation()` to `useLanguage()` for proper RTL direction and native widget string sync across all supported languages.
- **Widget String Sync**: Native Android widgets now receive translated prayer labels (`fajr`, `dhuhr`, `asr`, `maghrib`, `isha`, `nextPrayer`, `todaysPrayers`) in all 5 languages.

#### 🐛 Bug Fixes
- **Widget Data Sync**: Fixed `QuranProgressWidget` badge behavior and corrected RTL text alignment in DailyHadith widget.
- **Critical Prayer Tracking Bridge**: Moved `syncMissedPrayersToQaza()` from the unused SalahTracker component into Dashboard.tsx. Missed prayers are now correctly auto-detected and added to qaza from the home screen.
- **Dashboard Prayer Time Validation**: Check-in now passes prayer times to `togglePrayer()`, so users get the "Cannot check in before prayer time" error instead of silently bypassing the time gate.
- **Qaza History Centralized**: Moved history and daily goal management from direct localStorage in QazaPage into `qaza-tracker.ts` lib functions (`getQazaHistory`, `addQazaHistoryEntry`, `getQazaDailyGoal`, `setQazaDailyGoal`).
- **PrayerName Type Deduplicated**: `qaza-tracker.ts` now re-exports `PrayerName` from `salah-tracker.ts` instead of maintaining a separate identical type definition.
- **Streak Reset on Foreground**: Added `visibilitychange` listener in Dashboard.tsx that calls `checkStreakReset()` when the app returns to foreground, ensuring streaks reset correctly even after days away.
- **Hadith Collection Flash Fix**: `HadithBookView` now initializes `metadataLoading` to `true` and checks `remoteCollectionData` instead of `staticCollectionData` for the loading guard. Eliminates the "1 book" flash when entering a collection.

---

## [2.0.1] - 2026-07-21

### Quran Progress Tracking Fixes

#### 🐛 Bug Fixes
- Fixed incorrect surah count: Progress now only counts fully completed surahs (when all ayahs are read), not partially read ones.
- Fixed misleading UI text: Updated "Surahs Completed" to "Surahs fully Completed" for clarity.
- Fixed wrong progress calculation: Changed from ayah-based estimation to accurate page-based tracking (604 total pages).
- Fixed position tracking bug: Progress now tracks current page position instead of maximum page ever visited.
- Fixed widget sync mismatch: Added widget-compatible localStorage key sync for native Android widgets.

#### ⚡ Improvements
- Updated `QuranProgressWidget` to display pages read (X/604) instead of ayahs.
- Modified `quran-features` service to track pages read and calculate percentage based on pages.
- Fixed `QuranReader` to use current page instead of `maxPageViewed` for progress.
- Added widget progress synchronization with proper payload formatting.

---

## [2.0.0] - 2026-07-10

### Noor Connect 2.0 — Major Release

#### ✨ New Features
- **Widget System v2**: 5 native Kotlin widgets (Next Prayer, Daily Ayah, Daily Hadith, Quran Progress, Tasbeeh Counter) rebuilt from scratch with Material You dynamic color.
- **Noor Cycle**: Ovulation day tracking, cycle insights, fertile window, analytics tab with recharts, and PDF doctor report export.
- **Seerah chapters and Qisas (Stories of Prophets)**: Reader with offline tafsir support and progress tracking.
- **Zakat Calculator**: Silver asset calculation, exchange rate fallback service, and preferred currency persistence.
- **Hadith expansion**: 10 new collections (adab, ahmad, bulugh, darimi, forty, hisn, malik, mishkat, riyadussalihin, shamail), HadithDetail page, and HadithBookmarks.
- **Backup & Restore**: Cross-platform localStorage-based backup with auto-restore on reinstall and smart background processing.
- **Low-end device optimizations**: Device detection, adaptive performance settings, React Query tuning, and 30+ FPS target on 2016+ devices.
- **Islamic Remedies**: Mood grid redesign, full-screen remedy viewer with framer-motion entrance animations, gamification, and Dashboard widget.
- **Radio Statistics & Achievements**: Per-station listening stats, total watch time, streak tracking, and unlockable achievements.
- **Quran reading progress (X/Y)**: On all book cards, uploads, and detail modal; PDF reader with local worker and blob: CSP fix.
- **LiveStreams**: Aggressive HLS buffering (120s), quality switcher UI (Auto/320p/480p), and hardcapped recovery loop to prevent OS freezing on weak networks.
- **Qibla enhancements**: Single smart button with geo-anchor note, magnetic declination correction via NOAA API, device orientation and metal-interference warnings with calibration UX.

#### 🐛 Bug Fixes
- Critical Haidh Tracker fixes: prayer pause/resume on cycle start/end, backup inclusion, gender filter, and route consolidation.
- TypeScript strictness: removed unsafe `JSON.parse` and `as any` casts, fixed dependency arrays, race conditions, and memory leaks.
- Widget stability: `WidgetBootReceiver` refactor, payload validation logging, thread-safe `HadithBundle.cachedHadiths`, and Arabic RTL fixes.
- Quran Reader: Chunked progressive rendering to fix massive FPS drop and CLS; surah-to-page mapping corrected with proper +2 image offset.
- SurahList: Wrapped navigation in `startTransition` to fix poor INP; replaced react-window v1 List with standard mapped list.
- Splash screen: Removed framer-motion and rewrote in pure CSS, cutting LCP from 5s to under 1s.
- Hadith: Singleton FPS monitor, fixed double API calls, back navigation, loading states, and collection metadata (totalHadith/totalBooks).
- Hadith bookmarks: New HadithBookmarks page, `useHadithBookmarks` hook, and bookmark buttons on all hadith pages.
- Settings: Toggle "Animations" now correctly disables all heavy Framer Motion animations globally across the app.
- Quran Reader: Resolved text overflow issues where English Surah names were going off-screen on smaller devices.
- Quran Reader: Added an instant golden loading spinner and `useTransition` hook to eliminate the slight delay when opening a Surah.
- App Icon: Removed `android:roundIcon` attribute from AndroidManifest to resolve icon rendering issues on legacy Android brands.

#### ⚡ Improvements
- **F-Droid Metadata**: Updated license to GPL-3.0-or-later and synchronized feature descriptions (Widgets, Menstrual Tracker, Zakat) for store publication.
- RadioStats consolidated into unified MediaStats tracking Live Makkah/Madinah watch time.
- Spotify-inspired PremiumDashboard with gold/green accents, dynamic greetings, and backdrop blurs.
- Device performance imports fixed for backward compatibility (performance-optimizations instead of device-performance.ts).
- Removed vestigial Quran Display Settings from Profile page (font size slider, script style dropdown, and clear cache button) since Quran now uses Mushaf image pages.
- Deleted orphaned components `MushafPage.tsx` and `MushafWord.tsx` which were no longer imported anywhere in the app.
- F-Droid APK size reduction: stripped >300MB of offline JSON data via `clean-dist-data.js`, allowing the F-Droid build to heavily rely on remote CDNs for an 84MB footprint.
- Qibla performance: removed conflicting CSS transitions on the compass dial, eliminating sensor jitter and rubber-banding lag on legacy Android devices.
- App UI polish: applied the Azimuth premium dark/amber aesthetic to all dashboard widgets, standardizing colors and blurs.
- Removed chunking errors to resolve Vercel deployment circular dependency and React Context rendering issues.

---

## [1.3.0] - 2026-07-03

### Expanded Features — Zen Mode, Hadith, Widgets, Noor Cycle

#### ✨ New Features
- **Zen Mode (Tasbeeh)**: Dhikr counter, categories, and review mode.
- **Quiz expansion**: Categories, review mode, and gamification streaks.
- **Duas expansion**: Search, DuaOfDay, audio playback, and counter.
- **Hadith/Seerah/Qisas UI/UX overhaul**: Skeleton loading, Continue Reading cards, share buttons, and copy-with-toast.
- **Noor Cycle (Haidh Tracker) foundation**: 6 tabs (Calendar, Ghusl, Islamic, Log, Settings, Today).
- **Islamic Remedies**: Mood grid redesign, full-screen viewer, gamification stats, and Dashboard widget.
- **Widget system**: Rebuilt from scratch with native Kotlin implementation and Material You design.
- **Performance optimization**: Low-end device optimizations: React.memo, virtualization, code-splitting, and lazy loading.
- **Notification overhaul**: Fixed hadith randomization, low-end device throttling, dynamic SW dates, dedup scheduling, and caching.

#### 🐛 Bug Fixes
- Qibla: compass heading accuracy, layout overflow fixes, and F-Droid compliance with custom FOSS sensor implementation.
- Profile page: madhab labels updated, Islamic sleep reminder toggle added, SurahList react-window import fixed.
- Calendar: Wired `daysUntilRamadan`, replaced offline fallback with tabular Islamic calendar, and dynamic Eid date lookup.

---

## [1.2.0] - 2026-03-30

### Live Radio Widget & Native Android Improvements

#### ✨ New Features
- **Live Quran Radio Widget**: Direct background audio playback and home screen controls.
- **Next Adhan, Daily Ayah, and Daily Schedule Widgets**: Rebuilt in native Kotlin for perfect Doze mode performance.

#### 🐛 Bug Fixes
- Fixed Quiz streak logic and Daily check-in errors during Menstrual Mode overrides.
- Corrected premature Eid Mubarak popups from triggering before Shawwal.
- Replaced non-free qibla library with custom FOSS sensor implementation for F-Droid compliance.
- Refactored geolocation to use Web API and consolidated Permission Manager for cross-platform stability.
- Fixed qibla compass heading, layout overflow, and widget data flow bugs.
- Critical security fixes: TypeScript strict mode enabled, XSS vulnerability patched, ErrorBoundary added, and console.log stripped from production.

#### ⚡ Improvements
- Added premium Android 14 notification center integration with large icon display support.

---

## [1.1.0] - 2026-03-20

### Gender-Based Features & Menstrual Mode

#### ✨ New Features
- Added gender selection for personalized experience.
- Menstrual mode for prayer notification management.
- Widget customization system.

#### ⚡ Improvements
- Enhanced dashboard with customizable widgets.

---

## [1.0.0] - 2026-03-01

### Initial Release

#### ✨ Features
- Quran reading with audio recitation.
- Prayer times with location detection.
- Qibla direction finder.
- Daily ayah and hadith.
- Tasbeeh counter.
- Islamic quiz with XP system.
- Duas and supplications collection.
- 99 Names of Allah.

---

*This project is licensed under the [GNU General Public License v3.0](LICENSE).*
