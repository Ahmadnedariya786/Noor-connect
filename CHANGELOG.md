# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-07-10

### 🚀 Major Features

#### Islamic Remedies (Tibb-e-Nabawi) — Complete UI Overhaul
- **Two-phase experience**: Mood grid (12 moods, responsive 2-col mobile / 3-col desktop) → Full-screen remedy viewer with smooth Framer Motion entrance animations
- **Rich visual design**: Warm gradient backgrounds, 3xl/4xl Arabic typography, type badges, Play/Copy/Next actions
- **Daily Remedy Card** with visible gradient background and interactive check animation
- **Gamified stats bar**: Streak, views, favorites, XP in clean single-line layout
- **Search + type filter pills** (above input), **Favorites page** linked from main view
- **Dashboard widget revived**: Daily remedy, gamification stats, favorites toggle, next/copy/play actions

#### Widget System v2 — Native Kotlin Rebuild
- **5 beautiful widgets**: Next Prayer (live countdown + progress ring), Daily Ayah, Daily Hadith (grade-colored), Quran Progress (ring + streak + Ramadan goal), Tasbeeh Counter (tap-to-increment, haptic, dhikr cycle)
- **Unified refresh**: Single WorkManager (30min periodic + expedited + motion-based step detection)
- **Prayer alarms**: Exact alarms at each prayer time with graceful inexact fallback
- **Boot/Time/Locale survival**: Centralized via WidgetBootReceiver → WidgetRefreshWorker
- **Capacitor bridge (WidgetBridge)**: 4 methods — syncPrayerData, syncDailyContent, syncQuranProgress, pushTasbeehIncrement
- **Strict validation**: Prayer payload requires exactly 6 prayers, valid nextPrayerIndex

#### Backup & Restore (Cross-Platform)
- localStorage-based (no native filesystem dependency)
- Auto-backup on first install, auto-restore on reinstall
- Background processing with `requestIdleCallback` / `setTimeout` to avoid UI blocking
- Capacitor Preferences + localStorage + IndexedDB support

#### Low-End Device Optimizations (2016+ target, 30+ FPS)
- **Device detection**: CPU cores, deviceMemory, connection type, save-data mode
- **React Query tuning**: Reduced cache times, fewer retries on low-end
- **Background processing**: Heavy ops offloaded via `requestIdleCallback`
- **Smart backup detection**: No CPU/RAM load spike
- **Animation reduction**: Respects `prefers-reduced-motion`, auto-reduces on low-end
- **Performance hints API**: Components can query `getPerformanceHints()` for adaptive behavior

#### Quran Progress & Radio Enhancements
- **Reading progress display**: Page numbers (X/Y) on all book cards, uploads, and detail modal
- **PDF reader optimizations**: Local pdf.js worker, blob: CSP fix
- **Radio Statistics & Achievements**: Per-station stats, total listening time, streak tracking, unlockable achievements

#### Haidh Tracker (Noor Cycle) — Major Expansion
- **Ovulation day, cycle insights, nifas tools, education FAQ**
- **Analytics tab, fertile window, PDF report**
- **Critical bug fixes**: Prayer pause, backup, gender filter, route consolidation

#### Seerah & Qisas Features
- **Seerah chapters** with offline tafsir support
- **Qisas (Stories of Prophets)** reader with progress tracking

#### Zakat Calculator Enhancements
- **Silver asset calculation** alongside gold
- **Exchange rate fallback** and currency preferences

### 🐛 Critical Bug Fixes

#### Core Stability
- **JSON.parse safety**: try-catch on all fallback parsing (QuranReader, etc.)
- **TypeScript strictness**: Removed `as any` casts, proper types throughout
- **Async error handling**: Proper try-catch for all async operations
- **React hooks**: Fixed dependency arrays, functional updates for race conditions
- **localStorage quota**: Cleanup strategies with user-friendly errors
- **Memory leaks**: Event listener cleanup
- **Null checks**: Consistent patterns across codebase

#### Widget Fixes
- **WidgetBootReceiver**: Removed LOCKED_BOOT_COMPLETED handling (credential-protected storage), delegated to WidgetRefreshWorker
- **WidgetPayloads**: Added logging to all 4 fromJson methods (was silently failing)
- **WidgetRefreshWorker**: Replaced reflection with provider instances
- **DailyHadithWidget**: Unknown grades now use neutral color (not Sahih green)
- **NextPrayerWidget**: Countdown uses localized strings, minute precision only, 1-hour boundary fixed
- **Widget layouts**: Fixed Arabic RTL (textDirection + textAlignment), countdown overlay, format-string preview defaults, Tasbeeh content descriptions

#### Android Manifest & Build
- Added `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission for AdhanPlaybackService
- Removed duplicate flatDir entry in build.gradle
- Cleaned proguard-rules.pro (single wildcard keep for widgets)

#### Technical Improvements
- **Thread safety**: `@Volatile` on HadithBundle.cachedHadiths
- **Logging**: All payload parsing failures now logged with context
- **Kotlin**: Fixed nullable issues in LocationChangeService, StepDetectionService
- **Imports**: Cleaned unused, added missing

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

---

## [1.3.0] - Development (Pre-2.0.0)

### Features
- **Haidh Tracker (Noor Cycle)**: Ovulation day, cycle insights, nifas tools, education FAQ
- **Analytics tab, fertile window, PDF report** for Noor Cycle
- **Seerah and Qisas** features with offline tafsir support
- **Hadith collections & sensor libs** integration
- **HabitWidget, HadithDetail** components
- **Zakat calculator**: Silver asset calculation, exchange rate fallback, currency preferences
- **Quran Radio**: Listening statistics and tracking system with achievements
- **Zen Mode (Tasbeeh)** + Quiz categories/review + Duas expansion (search, DuaOfDay, audio, counter)
- **PDF reader optimizations**: Local pdf.js worker, blob: CSP fix, page progress (X/Y) on all book cards
- **Reading progress display** across uploads and detail modal

### Improvements
- **Performance**: Comprehensive optimization for low-end devices (30+ FPS)
- **Notifications overhaul**: Fixed hadith randomization, low-end throttling, dynamic SW dates, fix duplicate instance, add caching, dedup scheduling
- **Widget system**: Rebuilt from scratch (#22)
- **Islamic Remedies**: Mood grid redesign, full-screen viewer, gamification, Dashboard widget
- **Removed gamification progress bar** from IslamicRemedies (felt game-like, distracting from spiritual intent)
- **Qibla**: Removed from dashboard, fixed dhikr sync, added Jummah logic, Ramadan widget conditional
- **Profile page**: Madhab labels (2 options), Islamic sleep reminder with toggle
- **Calendar feature improvements**

### Fixes
- **Critical Haidh Tracker bugs**: Prayer pause, backup, gender filter, route consolidation
- **GlobalQuranPlayer**: Reverted preloading/wake-lock/connection monitor causing global lag
- **Service Worker caching bug** & Settings ReferenceError
- **Prayer progress reactivity** & PDF reader UX
- **Mushaf image loading** & storage optimization
- **Stream loading issues** & CSP updates
- **Animation jank** & splash screen timing
- **Fiqh prayer time update** + support for all 4 madhab schools

---

## [1.2.0] - Previous Release

### Features
- Initial widget system implementation
- Haidh Tracker (Noor Cycle) foundation
- Quran Radio with statistics
- Zakat calculator (gold assets)
- Islamic Quiz with gamification
- Seerah and Qisas features
- PDF reader optimizations
- Live Mecca stream with retry/offline support

### F-Droid Compliance
- Replaced non-free qibla library with custom FOSS sensor implementation
- Replaced non-free compass-qibla with FOSS sensor implementation
- Geolocation refactored to use web API
- Permission Manager refactored
- Fixed qibla compass heading, layout overflow
- Converted widget layouts to use ImageView with contentDescription=@null

### Fixes
- Critical security and stability issues
- Android widget data flow and design improvements
- Splash screen timing and toggle control
- Removed unused CDN code from quran-service
- YouTube removed from Live; premium IslamicStreamPlayer redesign
- Self-update logic removed; privacy audit complete

---

*For detailed commit history, see `git log v1.2.0..HEAD --oneline`*