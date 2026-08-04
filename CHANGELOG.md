# Changelog

All notable changes to Noor Connect will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [2.2.0] - 2026-08-01

### ⚡ 5-Phase Performance Optimization Pass
- **Re-render churn eliminated**: Subscriber-counted global timer scheduler (starts/stops with subscribers); dashboard's 30s clock tick replaced with a derived 60s `minuteTick`; guarded state updates in countdown widgets, Ramadan widget, and the radio player stop redundant re-renders.
- **Long list rendering**: Hadith collections render in pages of 300 with IntersectionObserver infinite scroll; memoized cards for hadith, books, and radio stations; debounced Tafsir / Names of Allah search with cached filtered results.
- **Startup & bundle size**: Premium dashboard and the weekly chart are code-split (chart renders only when animations are enabled and the device can handle it); dead `chart.tsx` removed; module preload hints filtered for heavy chunks; first auto-backup and daily hadith fetch deferred to idle time with an in-memory parse cache.
- **GPU & CSS**: Gold shimmer sweep and skeletons run on compositor-only properties; 48 `transition: all` rules replaced with targeted transitions; framer `layout`/`layoutId` FLIP animations replaced with cheap fades; `reduce-blur` now also strips `.blur-light`/`.blur-medium` and all `blur-*` filters on low-end devices; static `will-change` layers removed.
- **Timer & memory leaks fixed**: Ebook download progress interval cleared on failure; periodic notification checks made idempotent with tracked interval + removable listener + `stopPeriodicChecks()`; dead `PrayerCountdown` component deleted; animation tier benchmark runs once per session instead of on every consumer mount.

### 📻 Live Streams Reliability & Fullscreen Fixes
- **Fixed Broken Makkah & Madinah Streams**: Replaced the CORS-blocked Aloula CDN redirect URLs (rejected by browsers before playback starts) with verified, CORS-enabled `m.live.net.sa` HLS streams as the primary sources.
- **Automatic Source Fallback**: If the primary stream fails, the player automatically switches to the secondary Aloula source once before showing a friendly "Stream temporarily unavailable. Please try again later." message.
- **Android Cleartext Whitelist**: `m.live.net.sa` added to `network_security_config.xml` so streams play on Android (cleartext HTTP on port 1935).
- **Android Fullscreen Rendering Fix**: Entering fullscreen now uses native `requestFullscreen` + landscape orientation lock on Android, fills the entire screen edge-to-edge (`100vw`/`100vh` with safe-area insets), and recalculates video sizing on `resize`/`orientationchange` so the picture stays centered with `object-fit: contain`. Exiting fullscreen restores the 16:9 layout and unlocks orientation.
- **Quality Selector Cleanup**: Quality picker hidden when the active stream only exposes a single quality level (primary `m.live.net.sa` streams are single-variant 720p).
- **Source Info Cards Synced**: In-player stream source info cards updated to match the new `m.live.net.sa` primary + Aloula fallback configuration.

### 🤖 Android Stability
- **Android 14+ Crash Fix**: Replaced the adaptive app icon (rejected by Android 14+ strict notification validation) with a proper white-on-transparent vector drawable — fixes the `BadForegroundServiceNotificationException` crash in `WidgetForegroundService` and prevents the same crash in `AdhanPlaybackService` and `WidgetRefreshWorker`.

### 🕌 Major Prayer Times & Quran Refactor
- **usePrayerTimes Hook Complete Rewrite**: Simplified logic with signature-based caching deduping, robust fallback chain (geolocation → stored → manual → timezone default), and separated notification scheduling into new `usePrayerNotifications` hook with 1s throttle.
- **Removed Standalone Mushaf Viewer**: Deleted the standalone `/mushaf` image-based viewer feature to streamline the app. The app now exclusively uses the vertical-scrolling `/quran` reader (which still utilizes the beautiful Madani Mushaf WebP images and integrates with recitation progress/streaks).
- **GlobalPrayerAlarm Optimization**: localStorage caching skips redundant geolocation/API calls when today's times already cached; abort controller for clean fetch cancellation.

### 🌸 Noor Cycle & Women's Wellness
- **Smart Notifications**: Added highly contextual local nudges for Fertile Window tracking (15 days before predicted period) and a smart Qaza Fasting reminder (Sunday evening prompt to make up missed Ramadan fasts, if the user is in Tuhr).
- **Major UI/UX Overhaul**: Transitioned the tracker from a sidebar layout to a fully mobile-optimized native Bottom Tab Bar, preventing layout overlaps.
- **Health Tracking Integrations**: Built a daily Water Hydration Tracker (8 glasses) and a 1-10 Pain Scale logger directly into the Today and Log tabs.
- **Deep System Integration**: Unified the `haidh-tracker-v2` engine. It now actively communicates with the broader app to automatically silence Prayer Notifications and halt Qaza (Missed Prayer) auto-syncing while a cycle is active.
- **Log Confirmation UX**: "Log Today's Data" now shows a "Logged for {date}" confirmation card with a locked summary and a Modify Data button — no more ambiguous saves.
- **Pain Scale Persistence**: Pain levels are now saved into the daily log record (survive tab switches and app restarts) instead of existing only in component state.
- **Missed Fast Count Fix**: Turning off a missed fast now decrements the count instead of double-counting.
- **Performance Optimizations**: Eliminated a heavy, GPU-bound `animate-pulse` effect on the Tuhr icon that was causing frame drops on legacy devices. Removed fragmented legacy state files.
- **Islamic Wellness Library**: Curated Fiqh & Wellness articles added to the Islamic knowledge tab, covering nutrition, exercise, and mental health from an Islamic perspective.

### 🎵 Nasheed Player Upgrades
- **New Equalizer Component**: Animated audio visualizer with configurable bars, colors, heights, and animation timing.
- **Offline Playback Cache**: Played nasheeds cached for offline listening (200 tracks, 90-day retention, quota-safe) with cache status indicators.
- **Filter by Artist**: Quick artist-filter chips for browsing 400+ nasheed library.
- **Back to Top**: Instant jump to top of long library lists.

### ⚡ Performance & Core Web Vitals
- **Added react-window & @types/react-window** for virtualized list support.
- **Prayer Times Hook**: Race condition fixes (removed stale ref checks), `parseTime` throws on invalid input instead of returning current time.
- **GlobalPrayerAlarm**: Module-level side effects moved to `useEffect`; event listener type safety fixed; missing cleanup listeners added.

### 🛡️ Code Quality & Lint Fixes
- **Resolved 12 lint errors**: 5 empty catch blocks (added non-critical comments), 1 `require()`→`import` conversion, 4 `@ts-ignore`→`@ts-expect-error` with descriptions, 1 parsing error (extra closing braces).
- **Settings.tsx**: Fixed empty catch block (eslint error).
- **TypeScript**: Stricter types in prayer times and alarm modules.

### 🕌 Prayer Tracking & Qaza Fixes
- **Critical Prayer Tracking Bridge**: `syncMissedPrayersToQaza()` moved from unused SalahTracker into Dashboard.tsx — missed prayers auto-detected and added to qaza from home screen.
- **Dashboard Prayer Time Validation**: Check-in passes prayer times to `togglePrayer()`, showing "Cannot check in before prayer time" error instead of silently bypassing.
- **Qaza History Centralized**: Moved to `qaza-tracker.ts` lib functions (`getQazaHistory`, `addQazaHistoryEntry`, `getQazaDailyGoal`, `setQazaDailyGoal`).
- **Streak Reset on Foreground**: `visibilitychange` listener calls `checkStreakReset()` on app return, ensuring streaks reset correctly after days away.
- **Hadith Collection Flash Fix**: `HadithBookView` initializes `metadataLoading` to `true`, checks `remoteCollectionData` for loading guard — eliminates "1 book" flash.

### 🧹 Dead Code Cleanup
- **Deleted Unused Components**: `SalahTracker.tsx` (205 lines), `PrayerTimesList.tsx` (451 lines), `EnhancedPrayerTimesList.tsx` (111 lines) — imported but never rendered.
- **Dashboard Cleanup**: Removed unused lazy imports for `PrayerTimesList`, `SalahTracker`, `QazaTracker`.

### 🌐 Complete Language & Translation Overhaul
- **All 5 Languages Synchronized**: English, Arabic, Urdu, Bengali, Russian — 410 translation keys each (was 278-314 with 99-105 missing).
- **Hardcoded English Strings Eliminated**: 20+ AppBar titles, BottomNav labels, DashboardFeatureCards now use `t()`.
- **Locale-Aware Formatting**: `time-formatter.ts`, `useI18n.ts`, `widget-service.ts` respect selected language.
- **RTL/Widget Sync Consistency**: Migrated to `useLanguage()` for proper RTL and widget string sync.
- **Widget String Sync**: Android widgets receive translated prayer labels in all 5 languages.

### 🔔 Intelligent Notification Engine
- **Ghost Notification Fix**: Ramadan reminders (Suhoor, Iftar, Tarawih) no longer persist into other months — safety clear on-boot sweeps native OS buffer.
- **Deterministic Scheduling**: Predictable ID mapping (`Suhoor: 2001`, `Iftar: 2002`) replaces random hashes for proper overwrite/cancel.
- **Accurate Calendar Countdowns**: Async `islamicCalendarService` replaces deprecated tabular estimates.

### 🛡️ Bulletproof Backup & Restore System
- **Unified Backup Service**: Single `backup-service.ts` consolidates legacy systems — existing backups auto-migrated on first launch.
- **Complete Data Capture**: All localStorage + Capacitor Preferences + e-book metadata, Seerah/Qisas/Hadith progress, quiz economy, sleep settings, global player states, Eid checklists.
- **Always-On Auto Save**: Snapshot every 20 min of use + on app close; latest overwrites previous; offered back on reinstall.
- **Google Cloud Backup Rules**: `backup_rules.xml` + `data_extraction_rules.xml` declare WebView storage and preferences for Android Auto Backup (caches excluded for 25MB limit).
- **Real Export on Android**: Backup button opens system share sheet (save to Downloads, Drive, Files) — previously failed silently in WebView.
- **First-Launch Restore Prompt**: Auto-detects previous data after reinstall, offers one-tap restore.
- **Never Loses Data Silently**: Verifies integrity, warns on older-over-newer import, recovers partially from failures, reports in plain language.

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