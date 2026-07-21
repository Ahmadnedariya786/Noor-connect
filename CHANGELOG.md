# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.1] - 2026-07-21

### 📖 Quran Progress Tracking Fixes

**Fixed critical issues with Quran reading progress tracking and display:**

#### Bug Fixes
- **Incorrect surah count**: Progress now only counts fully completed surahs (when all ayahs are read), not partially read ones
- **Misleading UI text**: Updated "Surahs Completed" to "Surahs fully Completed" for clarity
- **Wrong progress calculation**: Changed from ayah-based estimation to accurate page-based tracking (604 total pages)
- **Position tracking bug**: Fixed progress to track current page position instead of maximum page ever visited
- **Widget sync mismatch**: Added widget-compatible localStorage key sync for native Android widgets

#### Technical Changes
- Updated `QuranProgressWidget` to display pages read (X/604) instead of ayahs
- Modified `quran-features` service to track pages read and calculate percentage based on pages
- Fixed `QuranReader` to use current page instead of maxPageViewed for progress
- Added widget progress synchronization with proper payload formatting
- Added `WIDGET_PROGRESS_KEY` to match widget sync expectations
- Created `syncWidgetProgress()` method for widget data synchronization
- Updated `saveRecitationProgress()` to automatically sync widget data

---

## [2.0.0] - 2026-07-10

### 🔒 Stability & Reliability — "Widget Hardening Release"

This release focuses entirely on making the widget system production-ready across all Android OEMs and OS versions (Android 8–14+). No new user-facing features — pure engineering hardening.

#### Android Native (Kotlin)

**Boot/Doze Resilience**
- `android:directBootAware="true"` on all 7 widget receivers + `WidgetBootReceiver` + `WidgetAlarmReceiver` for credential-encrypted storage access on locked boot
- `LOCKED_BOOT_COMPLETED` intent filter for immediate alarm rescheduling before user unlock
- Foreground service type `SPECIAL_USE` with manifest property justification for API 34+

**Dynamic Resize Handling**
- `onAppWidgetOptionsChanged()` implemented in all 5 widget providers
- `minWidth`/`maxResizeWidth` attributes in widget XML for 2×2 → 4×3 range
- Layout recalculates on launcher grid changes (4×4, 5×5, 5×6)

**Battery Optimization Awareness**
- `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` prompt on first launch + re-check on resume
- Critical for step detection & location monitoring foreground service survival

**RTL/Locale Support**
- `android:layoutDirection="locale"` + `android:textDirection="locale"` on all widget root layouts
- Arabic/Persian/Urdu text renders correctly without manual RTL overrides

**Sensor/Permission Graceful Degradation**
- `WidgetForegroundService.checkCapabilities()` detects missing step sensors / denied location permission at startup
- Logs warnings, disables only affected features — never crashes
- HealthCheckWorker verifies service health every 6 hours, auto-restarts if dead

**Update Throttling**
- 500ms minimum interval between RemoteViews updates per widget ID (prevents system ANR at 30/sec limit)
- `WidgetPrefs.canUpdateWidget()` / `recordWidgetUpdate()` enforce client-side

**Backup/Restore**
- `WidgetBackupAgent` + `backup_rules.xml` — saves widget config (size, theme, density, accent) but excludes volatile payloads (prayer times, daily content, quran progress, tasbeeh)
- Payloads re-sync from app on restore

**Cold-Start Bridge Guard**
- `registerPlugin()` with 5s timeout + promise caching in `widgetBridge.ts`
- Exponential backoff retry (3×, 500ms base) on all Capacitor bridge calls
- Payload validation before native send (prayer count, index ranges, timestamps, percentage bounds)

**Exact Alarm Safety Net**
- 15-minute fallback alarm scheduled alongside every exact prayer alarm
- Catches missed exact alarms on OEMs that throttle them

**Worker Isolation**
- `WidgetRefreshWorker` continues on partial failures — logs per-widget errors, reports success if any widget updated
- Self-cancels periodic work when zero widget instances remain

#### Web/TypeScript

- `widgetBridge.ts`: Cold-start registration guard, retry wrapper, strict payload validation
- `widget-service.ts`: `lastUpdated` timestamps on all payloads (prayer, daily content, quran progress)
- `widget-types.ts`: Extended all interfaces with `lastUpdated` fields
- TypeScript compiles clean (`npx tsc --noEmit`)

**Android Version Bump**
- `versionCode: 6` → `6` (incremented)
- `versionName: "2.0.0"` → `"2.1.0"`

---

## [2.0.0] - 2026-07-10

### 🚀 Major Features

#### Widget System v2 — Native Kotlin Rebuild
- **5 beautiful widgets**: Next Prayer (live countdown + progress ring), Daily Ayah, Daily Hadith (grade-colored), Quran Progress (ring + streak + Ramadan goal), Tasbeeh Counter (tap-to-increment, haptic, dhikr cycle)
- **Unified refresh**: Single WorkManager (30min periodic + expedited + motion-based step detection)
- **Prayer alarms**: Exact alarms at each prayer time with graceful inexact fallback
- **Boot/Time/Locale survival**: Centralized via `WidgetBootReceiver` → `WidgetRefreshWorker`
- **Capacitor bridge (`WidgetBridge`)**: 4 methods — `syncPrayerData`, `syncDailyContent`, `syncQuranProgress`, `pushTasbeehIncrement`
- **Strict validation**: Prayer payload requires exactly 6 prayers, valid `nextPrayerIndex`

#### Noor Cycle (Haidh Tracker) — Major Expansion
- **Ovulation day, cycle insights, nifas tools, education FAQ**
- **Analytics tab, fertile window, PDF report** for Noor Cycle
- **Critical bug fixes**: Prayer pause, backup, gender filter, route consolidation

#### Seerah & Qisas Features
- **Seerah chapters** with offline tafsir support
- **Qisas (Stories of Prophets)** reader with progress tracking

#### Zakat Calculator Enhancements
- **Silver asset calculation** alongside gold
- **Exchange rate fallback** and currency preferences

#### Hadith Collections Expansion
- **10 new collections** (adab, ahmad, bulugh, darimi, forty, hisn, malik, mishkat, riyadussalihin, shamail)
- **HadithDetail page** and **HadithBookmarks** with full navigation
- **75 hadiths bundled** from all 16 collection JSONs as widget fallback

#### Backup & Restore (Cross-Platform)
- localStorage-based (no native filesystem dependency)
- Auto-backup on first install, auto-restore on reinstall
- Background processing with `requestIdleCallback` / `setTimeout` to avoid UI blocking

#### Low-End Device Optimizations (2016+ target, 30+ FPS)
- **Device detection**: CPU cores, deviceMemory, connection type, save-data mode
- **React Query tuning**: Reduced cache times, fewer retries on low-end
- **Background processing**: Heavy ops offloaded via `requestIdleCallback`
- **Animation reduction**: Respects `prefers-reduced-motion`, auto-reduces on low-end

#### Quran Progress & Radio Enhancements
- **Reading progress display**: Page numbers (X/Y) on all book cards, uploads, and detail modal
- **PDF reader optimizations**: Local pdf.js worker, blob: CSP fix, page slider/scrubber
- **Radio Statistics & Achievements**: Per-station stats, total listening time, streak tracking, unlockable achievements

#### Islamic Remedies (Tibb-e-Nabawi) — Complete UI Overhaul
- **Two-phase experience**: Mood grid (12 moods, responsive 2-col mobile / 3-col desktop) → Full-screen remedy viewer with smooth Framer Motion entrance animations
- **Rich visual design**: Warm gradient backgrounds, 3xl/4xl Arabic typography, type badges, Play/Copy/Next actions
- **Daily Remedy Card** with visible gradient background and interactive check animation
- **Gamified stats bar**: Streak, views, favorites, XP in clean single-line layout
- **Search + type filter pills** (above input), **Favorites page** linked from main view
- **Dashboard widget revived**: Daily remedy, gamification stats, favorites toggle, next/copy/play actions

#### LiveStreams & Qibla Improvements
- **LiveStreams**: Aggressive HLS buffering (120s), quality switcher UI (Auto/320p/480p), and hardcapped recovery loop to prevent OS freezing on weak networks
- **Qibla**: Single smart button with geo-anchor note; magnetic declination correction via NOAA API; device orientation and metal-interference warnings with calibration UX
- **Qibla Performance**: Eliminated sensor jitter and UI lag on legacy Android devices by removing conflicting CSS transitions on the compass dial, falling back to pure 60fps hardware-accelerated JS interpolation

#### F-Droid & Build Optimizations
- **APK Size Reduction**: Implemented a comprehensive F-Droid prebuild script (`clean-dist-data.js`) to strip >300MB of offline Tafsir, Hadith, and Mushaf JSON data from the bundled APK, relying purely on CDNs to achieve an 84MB target size.
- **Chunk Optimization**: Removed massive vendor chunks and separated i18n manual chunks to resolve Vercel deployment circular dependency and Context errors.

### 🐛 Critical Bug Fixes

#### Core Stability
- **JSON.parse safety**: try-catch on all fallback parsing (QuranReader, etc.)
- **TypeScript strictness**: Removed `as any` casts, proper types throughout
- **Async error handling**: Proper try-catch for all async operations
- **React hooks**: Fixed dependency arrays, functional updates for race conditions
- **localStorage quota**: Cleanup strategies with user-friendly errors
- **Memory leaks**: Event listener cleanup
- **Null checks**: Consistent patterns across codebase
- **Settings Sync**: "Animations" toggle correctly persists to `Preferences` and forcibly disables heavy Framer Motion animations across all routes for reduced layout shifts.

#### Quran & Hadith Fixes
- **Quran Reader**: Chunked progressive rendering to fix massive FPS drop and CLS; surah-to-page mapping corrected with proper +2 image offset
- **SurahList**: Wrapped navigation in `startTransition` and added instant golden loading spinner to eliminate perceived delay; replaced `react-window` v1 List with standard mapped list
- **Text Overflow**: Overhauled the Surah card layout using strict `min-w-0` constraints and truncation to stop English translations from breaking the grid on 4-inch screens
- **Splash Screen**: Removed `framer-motion` and rewrote in pure CSS, cutting LCP from ~5s to under 1s
- **Hadith**: Converted `monitorFPS()` RAF loop to module-level singleton (was starting 1 loop per component); fixed double API call, back navigation, and loading states
- **Hadith Bookmark Navigation**: New `HadithBookmarks` page, `useHadithBookmarks` hook, and bookmark buttons on all hadith pages
- **Hadith Metadata**: Added 7 missing collection profiles; fixed all `totalHadith`/`totalBooks` counts to match actual JSON data; fixed book names ('Book 1' → proper names)

#### Widget Fixes
- **WidgetBootReceiver**: Removed LOCKED_BOOT_COMPLETED handling (credential-protected storage), delegated to WidgetRefreshWorker
- **WidgetPayloads**: Added logging to all fromJson methods (was silently failing)
- **WidgetRefreshWorker**: Replaced reflection with provider instances
- **DailyHadithWidget**: Unknown grades now use neutral color (not Sahih green)
- **NextPrayerWidget**: Countdown uses localized strings, minute precision only, 1-hour boundary fixed
- **Widget layouts**: Fixed Arabic RTL (textDirection + textAlignment), countdown overlay, format-string preview defaults, Tasbeeh content descriptions

#### Android Manifest & Build
- Added `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission for AdhanPlaybackService
- Removed duplicate flatDir entry in build.gradle
- **App Icon Rendering**: Removed deprecated `android:roundIcon` property to fix critical launch icon corruption on legacy OEM skins (Xiaomi, Vivo)
- **F-Droid Store Metadata**: Updated `com.noorconnect.app.yml` with GPL-3.0-or-later license, and synchronized feature descriptions (including Menstrual Tracker, Zakat, Widgets) to the `en-US` manifest.
- Cleaned proguard-rules.pro (single wildcard keep for widgets)

#### Technical Improvements
- **Thread safety**: `@Volatile` on HadithBundle.cachedHadiths
- **Logging**: All payload parsing failures now logged with context
- **Kotlin**: Fixed nullable issues in LocationChangeService, StepDetectionService
- **Imports**: Cleaned unused, added missing
- **Device performance imports**: Fixed backward-compatible imports (`performance-optimizations` instead of `device-performance.ts`)
- **TypeScript**: Fixed missing React import in `AdaptiveMotion.tsx`; added WebGL shader compilation/linking error checks in `useAnimationTier.ts`
- **PWA**: Replaced `beforeinstallprompt` with F-Droid redirect in `PWAInstallPrompt.tsx`; hidden on Capacitor native
- **CSP**: Added `blob:` to `connect-src` for local PDF caching
- **Cleanup**: Removed vestigial Quran Display Settings from Profile page and deleted orphaned `MushafPage.tsx` / `MushafWord.tsx` components no longer used by the Mushaf image-based reader.

### 🔧 Technical Improvements

#### Performance
- **Timer management**: Centralized `globalTimerManager` for all intervals
- **Component memoization**: Heavy components wrapped in `memo()`
- **Lazy loading**: Images via IntersectionObserver
- **RAF throttling**: Smooth scroll/resize handlers
- **Bundle size**: Code-splitting, tree-shaking optimized

#### Architecture
- **WidgetBridge TypeScript wrapper**: Clean async API with noop fallback for web
- **Widget payload types**: Strict TypeScript/Kotlin sync via `widget-types.ts` / `WidgetPayloads.kt`
- **Settings persistence**: Unified Preferences + localStorage
- **Service layer**: Backup, notification, prayer, Qibla services refactored
- **RadioStats**: Consolidated into unified `MediaStats` tracking Live Makkah/Madinah watch time

---

## [1.3.0] - 2026-07-03

### Features
- **Zen Mode (Tasbeeh)** + Quiz categories/review + Duas expansion (search, DuaOfDay, audio, counter)
- **Hadith/Seerah/Qisas UI/UX**: skeleton loading, Continue Reading, share buttons, copy with toast
- **Islamic Remedies**: Mood grid redesign, full-screen viewer, gamification, Dashboard widget
- **Widget system**: Rebuilt from scratch (#22)
- **Noor Cycle (Haidh Tracker)**: Ovulation day, cycle insights, nifas tools, education FAQ
- **Analytics tab, fertile window, PDF report** for Noor Cycle
- **Zakat calculator**: Silver asset calculation, exchange rate fallback, currency preferences
- **Quran Radio**: Listening statistics and tracking system with achievements
- **PDF reader optimizations**: Local pdf.js worker, blob: CSP fix, page progress (X/Y) on all book cards
- **Reading progress display** across uploads and detail modal

### Improvements
- **Performance**: Comprehensive optimization for low-end devices (30+ FPS)
- **Notifications overhaul**: Fixed hadith randomization, low-end throttling, dynamic SW dates, fix duplicate instance, add caching, dedup scheduling
- **Qibla**: Removed from dashboard, fixed dhikr sync, added Jummah logic, Ramadan widget conditional
- **Profile page**: Madhab labels (2 options), Islamic sleep reminder with toggle
- **Calendar feature improvements**: Wired daysUntilRamadan, tabular Islamic calendar fallback, dynamic Eid date lookup

### Fixes
- **Critical Haidh Tracker bugs**: Prayer pause, backup, gender filter, route consolidation
- **GlobalQuranPlayer**: Reverted preloading/wake-lock/connection monitor causing global lag
- **Service Worker caching bug** & Settings ReferenceError
- **Prayer progress reactivity** & PDF reader UX
- **Mushaf image loading** & storage optimization
- **Stream loading issues** & CSP updates
- **Animation jank** & splash screen timing
- **Fiqh prayer time update** + support for all 4 madhab schools
- **Qibla compass heading, layout overflow**, and F-Droid compliance with FOSS sensor implementation

---

## [1.2.0] - 2026-03-30

### Features
- **Live Quran Radio Widget**: Direct background audio playback and home screen controls.
- **Native Kotlin Widgets**: Next Adhan, Daily Ayah, and Daily Schedule rebuilt in Kotlin for Doze mode performance.
- **Android 14 notification center integration** with large icon display support.
- **Zakat Calculator (gold assets)** foundation.
- **Islamic Quiz with gamification** (XP, streaks).
- **Seerah and Qisas** foundational features.
- **PDF reader optimizations** for e-books.
- **Live Mecca stream** with retry logic and offline support.

### F-Droid Compliance
- Replaced non-free qibla library with custom FOSS sensor implementation.
- Replaced non-free compass-qibla with FOSS sensor implementation.
- Geolocation refactored to use Web API.
- Permission Manager consolidated and refactored.
- Fixed qibla compass heading, layout overflow.
- Converted widget layouts to use ImageView with contentDescription=@null.

### Fixes
- **Critical security and stability issues**: TypeScript strict mode enabled, XSS vulnerability patched, ErrorBoundary added, console.log stripped from production builds.
- **Android widget data flow**: Fixed JS-to-Kotlin SharedPreferences mismatch and prayer payload formatting.
- **Splash screen timing**: Adaptive timing based on device performance with toggle control.
- **Removed unused CDN code** from quran-service.
- **YouTube removed from Live**; premium IslamicStreamPlayer redesign with HLS-only Akamai CDN.
- **Self-update logic removed**; privacy audit complete.
- **Quiz streak logic** and Daily check-in errors during Menstrual Mode overrides corrected.
- **Premature Eid Mubarak popups** fixed.

---

## [1.1.0] - 2026-03-20

### Features
- Added gender selection for personalized experience.
- Menstrual mode for prayer notification management.
- Widget customization system.
- Enhanced dashboard with customizable widgets.

---

## [1.0.0] - 2026-03-01

### Features
- Quran reading with audio recitation.
- Prayer times with location detection.
- Qibla direction finder.
- Daily ayah and hadith.
- Tasbeeh counter.
- Islamic quiz with XP system.
- Duas and supplications collection.
- 99 Names of Allah.

---

*For detailed commit history, see `git log v1.2.0..HEAD --oneline`*
