![Untitled design](https://github.com/user-attachments/assets/2e0a2569-47a2-49b3-8ccc-25e37964bfb5)
# 🌙 Noor Connect - Your Ultimate Islamic Companion

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://opensource.org/licenses/GPL-3.0) [![Status](https://img.shields.io/badge/status-stable-green.svg)](https://github.com/darkmaster0345/Noor-connect) [![F-Droid Compatible](https://img.shields.io/badge/F--Droid-Ready-blue.svg)](.fdroid.yml) [![Version](https://img.shields.io/badge/version-2.2.3-orange.svg)](CHANGELOG.md) [![Privacy First](https://img.shields.io/badge/Privacy-First-brightgreen.svg)]() [![Nasheed Partner](https://img.shields.io/badge/Nasheed-No%20Copyright%20Nasheed-purple.svg)]()

**Noor Connect** is a truly comprehensive, beautiful, and strict privacy-focused Islamic application designed to help you stay connected with your faith. Built to modern mobile standards using web technologies (React + Vite + Capacitor), it stands as a premium, tracker-free digital companion for spiritual growth.

---

## 🎯 **Our Mission & Origin Story**

Noor Connect was born from a simple frustration: **there was no single Islamic app that offered comprehensive features without compromising user privacy.**

The mainstream Islamic app market is dominated by apps that:
- 📊 **Sell your location data** to third parties (documented cases with major apps)
- 📱 **Track your prayer habits** for advertising profiles
- 🔍 **Monitor your Quran reading** for analytics
- 💰 **Monetize your spiritual data** without consent

**Noor Connect was built differently** — by a Muslim who needed a complete Islamic toolkit but refused to trade privacy for convenience. Every feature exists because the developer personally needed it, and every architectural decision prioritizes **your sovereignty over your spiritual data**.

### 🏆 **Partnership: No Copyright Nasheed**
We're proud to announce our partnership with **[No Copyright Nasheed](https://nocopyrightnasheed.com/)** — the leading platform for copyright-free Islamic nasheeds.

- ✅ **Official License Grant**: Free perpetual license to integrate 400+ premium nasheeds
- ✅ **Official Feature**: Noor Connect is now featured on the [No Copyright Nasheed website](https://nocopyrightnasheed.com/) as a trusted partner
- 🎵 **Released in v2.2**: 400+ curated nasheeds with a highly optimized audio player.

This partnership ensures every nasheed is legally licensed, high-quality, and supports the creators — aligning perfectly with our Islamic ethics.

---

## 🆕 What's New in v2.2.3

### 📻 Live Streams — Migrated to Official SBA CDN
- Replaced dead `m.live.net.sa` Wowza streams (404) and CORS-blocked Aloula CDN redirects with official SBA streams via **Globecast/Akamai CDN** (HTTPS, CORS-enabled globally).
- Unified platform URLs — both native Android and web use the same HTTPS endpoint. No more cleartext HTTP exceptions.
- Added Kwikmotion 1080p as automatic fallback for Makkah.
- Removed `m.live.net.sa` from Android network security config.

---

## 📜 What's New in v2.2.0

### ⚙️ Modular Settings Architecture & Android OOM Crash Elimination
- **Legacy Android WebView OOM Resolution**: Replaced monolithic 1,600-line Settings component with a fast navigation index landing page (`/profile`) that defers state loading by 500ms, resolving Android WebView out-of-memory crashes on 2016-era low-end devices.
- **12 Sub-Page Categories (`/settings/:sectionId`)**: Built lazy-loaded modular sub-pages for Theme, Haptics, Personal Info, Prayer Calculation, Notifications, Adhan & Sounds, Backup & Restore, Storage & Cache, Privacy, About, Support, and Developer Contact.
- **Authentic Developer Contact & Crypto Support**: Restored verified WhatsApp, Portfolio, Gmail, ProtonMail links, and BTC/SOL/BNB donation addresses.

### 🔔 Expanded Smart Notification Suite
- **Pre-Fajr Tahajjud & Night Prayer**: Pre-Fajr reminders during the last third of the night.
- **Salat al-Duha Alerts**: Mid-morning Duha prayer notification.
- **Sunnah Fasting Reminders**: Automated Monday & Thursday Sunnah fasting notifications.
- **Daily Quran Tilawat Goal**: Evening reminder to complete daily Quran recitation.
- **Bedtime Sunnah Azkar**: Nightly Ayatul Kursi and protection dua reminders before sleep.

### ⚡ Performance & Smoothness Optimization Pass
- **Re-Render Churn Eliminated**: The dashboard clock no longer re-renders the whole app twice a second — the 30s global tick was replaced with a derived 60s update, countdown timers now share a subscriber-counted scheduler, and widget state updates are guarded so nothing re-renders when values haven't changed.
- **Faster Long Lists**: Hadith books now load in pages of 300 with automatic infinite scroll instead of rendering every hadith at once; hadith cards, book cards, and radio station cards are memoized, and Tafsir / Names of Allah search is debounced with cached filtered results for smooth 60fps browsing.
- **Faster App Startup**: The premium dashboard and weekly chart now load on demand (the chart only loads on capable devices), a dead chart component was removed, and heavy background work — the first auto-backup and the daily hadith fetch — is deferred to browser idle time so first paint happens sooner.
- **Smoother Low-End Devices**: All blur/backdrop effects are now stripped on low-end devices, transitions animate only GPU-friendly properties (transform/opacity) instead of `all`, framer-motion layout FLIP animations were replaced with cheap fades, and the device animation benchmark runs once per session instead of on every screen.
- **Timer & Memory Leaks Fixed**: Ebook download progress stops cleanly on failure, periodic notification checks are idempotent with a proper `stopPeriodicChecks()`, and dead code was removed.

### 📱 Native Widget Reliability
- **Quran Progress Widget Sync Fixed**: The widget now actually updates — the sync payload was missing its `lastUpdated` timestamp and was being silently rejected by validation on every push. Reading progress, streaks, and Ramadan goal data now reach the widget reliably.
- **Daily Content No Longer Dropped**: With no hadith cache present, the fallback hadith had an empty source that failed validation and dropped the whole ayah + hadith update. Daily Ayah / Daily Hadith widgets now always receive content.
- **Shared Service Lifecycle Fixed**: Removing one widget type no longer stops the shared foreground service (step detection + location monitoring) or prayer alarms while other widgets remain on the home screen — everything survives until the *last* widget is removed.
- **DST Double-Shift Removed**: Prayer times are no longer shown one hour late in daylight-saving months — a manual DST adjustment was double-shifting the times and ignoring the widget's actual location timezone.
- **Widget Times Match the App**: The app now pushes the exact parsed prayer times (previously an API string map was sent, which the payload builder silently dropped), so widgets show the same times as the in-app prayer panel.

### 🎨 Native Widget Quality Pass — Light & Dark Theme Support
- **Light + Dark Themes**: All five widgets now ship a full light palette (warm parchment) alongside the dark theme, with dedicated `values-night` / `values-night-v31` overrides — widgets gracefully switch appearance with the system theme on every Android version, and follow Material You dynamic color on Android 12+.
- **System Corner Radius**: On Android 12+ widgets now use the platform-provided system widget radius instead of a hardcoded value, so their corners visually match the launcher and OEM surfaces.
- **Reconfigurable on the Home Screen**: All five widgets now declare `widgetFeatures="reconfigurable"` — tap an existing widget to reconfigure it (size, theme, accent) without removing and re-adding it.
- **Contrast & Readability Pass**: Accent and text colors darkened in both palettes (deeper emerald/gold, darker da'if-grade red) and the stale-data badge darkened, so every element clears WCAG AA contrast on light backgrounds.

### 📻 Live Streams Reliability (v2.2.0 → v2.2.3)
- **Fixed Broken Makkah & Madinah Streams**: The v2.2.0 fix (m.live.net.sa) stopped working when the Wowza server was decommissioned. v2.2.3 replaces both dead sources with official SBA streams via Globecast/Akamai CDN (HTTPS, CORS-enabled globally).
- **Automatic Source Fallback**: If the primary Globecast stream fails, the player automatically switches to a secondary source once (Kwikmotion 1080p for Makkah) before showing a friendly error with Retry.
- **Unified HTTPS**: No more cleartext HTTP or Android network security config exceptions — all streams are now served over HTTPS with full CORS support.
- **Android Fullscreen Rendering Fix**: Entering fullscreen now uses native `requestFullscreen` + landscape orientation lock on Android, fills the entire screen edge-to-edge (`100vw`/`100vh` with safe-area insets), and recalculates video sizing on `resize`/`orientationchange` so the picture stays centered with `object-fit: contain`. Exiting fullscreen restores the 16:9 layout and unlocks orientation.
- **Quality Selector**: Quality picker hidden when the active stream only exposes a single quality level, keeping the controls clean.
- **Source Info Cards**: In-player stream source info cards reflect the current SBA/Globecast/Akamai CDN source configuration.
- **Android 14+ Crash Fix**: Replaced the adaptive app icon (rejected by Android 14+ strict notification validation) with a proper white-on-transparent vector drawable — fixes the `BadForegroundServiceNotificationException` crash in `WidgetForegroundService` and prevents the same crash in `AdhanPlaybackService` and `WidgetRefreshWorker`.

### 📦 APK Size Optimization
- **Mushaf Downscale**: All 606 mushaf images downscaled from full resolution to 810×1145 WebP (quality 75), reducing mushaf source from 83.9 MB → 56.6 MB.
- **Hadith Gzip**: All 34 hadith JSON files compressed to `.json.gz` (95.4 MB → 19.8 MB, 79 MB saved), loaded via `DecompressionStream` with graceful fallback to plain JSON.
- **Vite Duplicate Purge**: `clean-dist-data.js` strips all redundant `.br`/`.gz` files from dist (except intentional hadith `.json.gz`), reducing dist from 110 MB → 34.8 MB.
- **Gradle Asset Optimization**: Android's `stripCompressedAssets` task removes vite-generated `.gz`/`.br` browser duplicates from APK assets; `moveMushafImages` task copies the downscaled mushaf from `public/mushaf` into the APK at build time.
- **Final APK**: 94.4 MB (was ~97.4 MB), with all offline features intact (hadith gzip, mushaf images, audio).

---

### 🕌 Major Prayer Times & Quran Refactor
- **usePrayerTimes Hook Complete Rewrite**: Simplified logic with signature-based caching deduping, robust fallback chain (geolocation → stored → manual → timezone default), and separated notification scheduling into new `usePrayerNotifications` hook with 1s throttle.
- **Removed Standalone Mushaf Viewer**: Deleted the standalone `/mushaf` image-based viewer feature to streamline the app. The app now exclusively uses the vertical-scrolling `/quran` reader (which still utilizes the beautiful Madani Mushaf WebP images and integrates with recitation progress/streaks).
- **GlobalPrayerAlarm Optimization**: localStorage caching skips redundant geolocation/API calls when today's times already cached; abort controller for clean fetch cancellation.

### 🌸 Noor Cycle & Women's Wellness
- **Smart Notifications**: Added highly contextual local nudges for Fertile Window tracking (15 days before predicted period) and a smart Qaza Fasting reminder (Sunday evening prompt to make up missed Ramadan fasts, if the user is in Tuhr).
- **Major UI/UX Overhaul**: Transitioned the tracker from a sidebar layout to a fully mobile-optimized native Bottom Tab Bar, preventing layout overlaps.
- **Health Tracking Integrations**: Built a daily Water Hydration Tracker (8 glasses) and a 1-10 Pain Scale logger directly into the Today and Log tabs.
- **Deep System Integration**: Unified the `haidh-tracker-v2` engine. It now actively communicates with the broader app to automatically silence Prayer Notifications and halt Qaza (Missed Prayer) auto-syncing while a cycle is active.
- **PIN Lock**: The Noor Cycle tracker is protected by a 4-digit PIN lock for privacy.
- **PDF Doctor Report**: Export a cycle health report as a PDF for sharing with healthcare providers.
- **Fiqh Guidance**: Madhab-based Islamic rules (Hanafi/Maliki/Shafi'i/Hanbali) for haidh, nifas, ghusl checklist, and istihadhah auto-detection.
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

### 🕌 Prayer Tracking & Qaza Fixes (from 2026-07-31)
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

## 🚀 **Nasheed Library (v2.2)**

### 🎵 **400+ Premium Nasheeds — Legally Licensed & Free**

In partnership with **No Copyright Nasheed**, we're bringing the largest curated nasheed library to any Islamic app:

| Feature | Details |
|---------|---------|
| **Library Size** | 400+ premium nasheeds (expanding) |
| **Licensing** | Official free perpetual license from No Copyright Nasheed |
| **Artists** | Curated from top Islamic nasheed artists globally |
| **Categories** | Hamd, Naat, Islamic motivation, Ramadan, Eid, kids |
| **Languages** | Arabic, English, Urdu, Turkish, Malay, more |

### 📶 **Adaptive Streaming for Weak Connections**
- **Smart Bitrate**: Auto-adjusts quality (32kbps → 128kbps) based on connection
- **Smart Caching**: Preloads next nasheed during playback
- **Offline Queue**: Download on wifi, listen anywhere
- **Data Saver**: <5MB/hour on lowest quality
- **Background Play**: Continues when screen off / app backgrounded

### 🎛️ **Smart Features**
- **Sleep Timer**: Auto-stop after 15/30/60 minutes
- **Playback Speed**: 0.5x → 2x for learning/memorization
- **Lyrics Sync**: Time-synced lyrics display (where available)
- **Favorites & Playlists**: Build personal collections
- **Daily Nasheed**: Curated daily recommendation
- **Background Download**: Queue downloads on wifi only

> **Official Partnership**: Noor Connect is now featured on the [No Copyright Nasheed website](https://nocopyrightnasheed.com/) — the first Islamic app to receive this recognition.

---

## ✨ The Complete Feature Set

### 📖 Enhanced Quran & Tafsir Explorer

- **Complete Holy Quran**: Clean, beautifully styled reading interfaces with ** Madani Mushaf WebP images** (604 pages). Advanced caching system prefetches pages for instant display.
- **Standard Mushaf Implementation**: Industry-standard **Madani Mushaf layout** with optimized WebP storage for privacy-first offline Quran reading.
- **Surah Explorer**: Browse all 114 surahs with live search (Arabic, English, translation, number) and Meccan/Medinan filter chips, plus a "Continue Reading" resume card and a rotating Daily Ayah card.
- **Advanced Tafsir System**: 25+ global Quranic commentary editions instantly accessible via high-speed spaCy API integration, eliminating heavy database overhead, with search, bookmarks, notes, history, font-size controls, and download support.
- **Multilingual Support**: Read meanings and Tafsir in English, Arabic, Bengali, Urdu, and Russian.
- **Recitation Playback**: Immersive background audio from multiple reciters with progress tracking. Dedicated audio player with reciter selection (11 expert reciters), all 114 surahs, seekable progress bar, volume control, MP3 download, and auto-advance to the next surah.
- **Offline Quran Engine**: Optional IndexedDB offline storage for surah data, recitations, and audio segments with a background sync service (1-hour interval, WiFi-only, charging-only, native BackgroundRunner on Android) so the Quran works completely offline.
- **Quran Progress & Achievements**: Page-based reading progress (X/604), reading streaks with emoji milestones, total ayahs read, and 7 unlockable reading achievements.

### 🕋 Premium Qibla Compass
- **High-Precision Native Sensors**: Completely overhauled native compass utilization tapping into device magnetometers for raw, smooth orientation. 60fps hardware-accelerated JS interpolation eliminates sensor jitter and UI lag on legacy Android devices.
- **Muslim Pro Grade UI**: Exquisite SVG-based compass dial with Kaaba alignment glow effects, jitter-reducing low-pass filters, and haptic feedback upon true Qibla lock.
- **Web & Manual Fallback**: If sensors fail, the app gracefully falls back to GPS/Web-oriented calculation paths.

### 📅 Advanced Islamic Calendar & Events
- **Complete Hijri Calendar**: View Gregorian and Hijri dates side-by-side with global offset adjustments.
- **Ramadan Mode**: A comprehensive fasting hub featuring Suhoor/Iftar countdowns, daily Taraweeh progress tracking, hydration reminders, and specialized Ramadan Duas.
- **Holiday Countdowns**: Automated visual countdowns for major Islamic events like Eid al-Fitr, Eid al-Adha, and Laylat al-Qadr.

### ⏲️ Smart Prayer Times & Adhan Control
- **Offline Calculation**: Fast, precise, localization-based timings for Hanafi and Shafi'i madhabs generated fully offline.
- **Granular Adhan Toggles**: Selectively enable or disable Adhan alarms per individual prayer using deep native background alarms—silence Asr without muting Maghrib!
- **Custom Adhan Upload**: Upload your own MP3 adhan (max 10 MB), preview it, and assign it to any of the 5 prayers — stored on-device in IndexedDB.
- **Optimized TTS & Audio**: Highly tuned Adhan playback utilizing an advanced audio engine to prevent interruptions or background sleep killing. 
- **Smart Settings**: 12+ prayer calculation methods (MWL, Egyptian, Karachi, Umm al-Qura, Dubai, North America, etc.) with a "recommended for your location" suggester, madhab selector (Shafi/Hanafi), 12/24-hour time format, and Hijri date adjustment (±2 days).

### 📿 Complete Spiritual Tracking & Menstrual Mode
- **Gender-Adaptive Onboarding**: Intelligent routing that completely re-adapts internal features based on the user.
- **Menstrual Mode**: Carefully tracks cycles, automatically silencing obligatory Adhans, halting Salah charts, and adjusting habit trackers during breaks without breaking daily login streaks.
- **Qaza & Habits**: Keep a long-term offline ledger of your missed prayers (Qaza Tracker), digital Tasbeeh goals, and weekly spiritual habit consistency.
- **Digital Tasbeeh**: 5 dhikrs with transliteration and translation, milestone goal rollover (33 → 99 → 100), full-screen immersive **Zen Mode**, lifetime totals, daily session history, and rich haptic feedback patterns on every tap.
- **Salah Focus Timer**: A dedicated Do-Not-Disturb timer to help you maintain khushu (focus) during prayer.
- **Mood-Based Reflections**: Enhanced Mood Selector providing tailored Daily Ayahs and Islamic Greetings based on how you feel.

### 📚 Islamic Life & Education Tools
- **Zakat & Fitrana Calculators**: Advanced offline calculators to accurately determine your annual Zakat and Ramadan Fitrana obligations. Features gold and silver weight calculators with purity options, real-time exchange rate tracking with fallback for offline use, preferred currency settings, and automatic rate updates when online.
- **Hisnul Muslim & Duas**: Comprehensive library of 80+ authentic supplications for all occasions with category filters, search, a daily "Dua of the Day", audio playback (Arabic TTS), favorites, sharing, and repetition counters for repeated adhkar.
- **Names of Allah (Asma-ul-Husna)**: Beautifully rendered 99 Names of Allah with meanings, transliteration, search, favorites-only filter, and an elegant detail modal with fluid animations.
- **Enhanced Islamic Quiz**: Test your knowledge of Deen with interactive, gamified Islamic quizzes. Includes a full XP economy with 15 levels, daily rewards, combo multipliers, mystery boxes (Knowledge Box / Wisdom Chest), a lives system, an in-app store for power-ups, daily challenges, boosters, and reliable cross-platform gamification logic.
- **Islamic Remedies (Tibb-e-Nabawi)**: Mood-based prophetic medicine index (12 moods) with surah/ayah/dua/hadith/dhikr remedies, a daily remedy (+25 XP), gamification with XP levels and 8 achievements, full-screen viewers, and a favorites list for quick reference.
- **Eid & Festive Checklist**: Special event mode with checklists and celebratory popups to prepare for Eid and other significant Islamic events.
- **Prayer Statistics & Analytics**: Detailed visual graphs tracking prayer completion, Qaza history, and weekly/monthly performance.
- **Spiritual Habit Tracker**: Track daily habits (like reading Quran, giving charity) with streak preservation.

### 📖 History & Literature
- **Seerah of the Prophet (ﷺ)**: Comprehensive biography reader with chapters, categorization (Makkan, Madinan), and reading progress tracking.
- **Qisas Al-Anbiya**: Detailed stories of the Prophets with progress tracking and categorized reading sessions.
- **Ebooks Library**: Modern Islamic ebooks reader for deeper theological exploration.

### 📻 Rich Media & Islamic Library
- **Hadith Encyclopedia (52K+)**: 16 complete collections with Arabic + English, color-coded grade badges (Sahih/Hasan/Da'if), bookmarks, daily hadith, full-text search, and page-by-page navigation. Infinite scroll loads 300 hadith at a time for smooth browsing. Uses gzip-compressed JSON for fast offline loading.
- **24/7 Quran Radio & Streams**: Direct live video and audio streams from Makkah and Madinah via official SBA Globecast/Akamai CDN (HTTPS, CORS-enabled globally) with automatic source fallback and friendly error handling.
- **Quran Radio Station Catalog**: 200+ streaming stations (reciters, translations, tafsir, hadith, surah loops, adhkar, mosque mix, fatwa) with search, 9 category filters, a curated "Featured Reciters" row, pin/unpin favorites, and persistent global playback that continues across screens.
- **Radio Statistics & Achievements**: Track your listening habits with detailed statistics per station, total listening time, streak tracking, and unlockable achievements for consistent listening.
- **Mushaf Image Optimization**: Local asset storage with Gradle-based image moving during Android build to eliminate duplication. Uses **standard Madani Mushaf** (industry standard for Muslim world with 604 pages).
- **🎵 Nasheed Library (v2.2)**: 400+ legally licensed nasheeds via official No Copyright Nasheed partnership. Adaptive streaming for 2G/weak wifi, offline download, sleep timer, lyrics sync, and curated daily recommendations. **Officially featured** on No Copyright Nasheed website.

### 🎵 Dedicated Nasheed Player (v2.2+)

- **Official No Copyright Nasheed Partnership**: Exclusive integration with 400+ high-quality nasheeds from the renowned No Copyright Nasheed platform — **legally licensed** and **officially featured** on their website.
- **Adaptive Streaming**: Smart bitrate adaptation (64kbps/128kbps/256kbps) for seamless playback on 2G, weak wifi, or limited data — no buffering, ever.
- **Offline-First**: One-tap download for complete offline listening. Automatic cleanup of old downloads when storage is low.
- **Smart Player Features**:
  - Sleep timer with fade-out (5/15/30/60 min)
  - Lyrics synchronization (LRC format) with word-by-word highlighting
  - Curated daily recommendations based on time, mood, and history
  - Continuous playback with crossfade between tracks
  - Background playback with notification controls
- **Categories**: Morning/Evening adhkar, Ramadan, Eid, Kids, Arabic/English/Urdu, Instrumental, Acapella

### 📱 Android Integration & Security
- **Native Android Widgets**: Home screen widgets for Next Prayer, Quran Reading Progress, Daily Ayah, Daily Hadith, and a Digital Tasbeeh. Everything auto-syncs with your in-app progress.
- **Auto Backup & Restore**: Robust always-on backup system that automatically secures your settings, bookmarks, Qaza records, Quran progress, and all Capacitor Preferences (like Nasheed radio stats, theme preferences, and advanced hardware configurations). No toggle — the latest snapshot is saved every 20 minutes and on app close. Declares full Android Auto Backup rules so Google Drive silently syncs your data and it is offered back on re-install.
- **Advanced Notification System**: 
- **Heads-Up Adhaan**: Deep native integration for high-priority, full-screen intent Adhaan notifications with direct lock-screen controls to "Stop Adhaan" or "Open App".
- **Context-Aware Prayer Quotes**: Intelligent prayer reminders that attach specific Quranic Ayahs or Ahadith related to the exact prayer time (e.g. Fajr-specific Hadith for Fajr reminders).
- **Friday Kahf Reminder**: Once-per-day Friday notification with the Verse of the Day (Surah Al-Kahf) and a short reflection.
- **Islamic Sleep Reminder**: Gentle bedtime notification with rotating Ayatul Kursi, Surahs Al-Ikhlas/Al-Falaq/An-Nas, and sleeping-on-right-side guidance, scheduled relative to Isha prayer.
- **Modern Notification History**: Beautiful, fully-featured notification history tracking UI with rich visual cards, status badges, timestamp grouping, and categorical filtering.
- **Media Session Lock-Screen Controls**: Play/pause/stop/previous/next controls on the Android lock screen and notification shade during Quran audio or nasheed playback via Media Session API.
- **Privacy-First**: No listening analytics, no tracking, all data local. Optional anonymous usage stats (opt-in only).


### 📱 Native Android Widgets Suite (v2.2 Hardened)
- **5 High-Performance Native Widgets** (see above).
- **In-App Dashboard Customizer** (`/dashboard-widgets`): toggle, reorder, preview, and pin/unpin 15 widgets across essential/optional/premium categories. Pinned essentials (prayer-times, daily-ayah, daily-hadith) cannot be removed. Layout persists to localStorage and syncs across sessions.
- **Architectural Resilience & Performance**: (existing content unchanged)
  - **Next Prayer Widget (4×2 & 4×1)**: Real-time countdown timer, progress ring, next prayer badge, and location chip. Uses exact alarms for sub-second prayer transitions.
  - **Daily Ayah Widget (4×2)**: Beautiful typography using *Scheherazade New* font, RTL support, Surah/Ayah reference chip, and English translation.
  - **Daily Hadith Widget (4×2)**: Complete Hadith snippet with color-coded grade badge (Sahih, Hasan, Da'if), book source chip, narrator attribution, and RTL alignment.
  - **Quran Progress Widget (4×2)**: Circular progress ring, current Surah badge, total completion percentage, streak counter, and Ramadan goal progress indicator.
  - **Tasbeeh Counter Widget (2×2)**: Interactive tap-to-increment counter with zero-latency `PendingIntent` execution, haptic vibration feedback, target rollover, and instant reset button.
- **Architectural Resilience & Performance**:
  - **Single Source of Truth (`WidgetPrefs`)**: Backed by Android `SharedPreferences` with atomic synchronization to prevent race conditions during rapid taps.
  - **WorkManager Refresh Engine (`WidgetRefreshWorker`)**: 30-minute periodic update loop with automatic self-stop when no widget instances are on the home screen to conserve battery.
  - **Exact Alarm Manager (`WidgetAlarmScheduler`)**: Schedules high-precision alarms for prayer times; automatically degrades to 15-minute inexact windows if exact alarm permission is denied on Android API 31+.
  - **System Event Survival (`WidgetBootReceiver`)**: Automatically restores prayer alarms, enqueues periodic syncs, and refreshes layouts after device reboot (`BOOT_COMPLETED`, `LOCKED_BOOT_COMPLETED`), time zone change (`TIMEZONE_CHANGED`), manual time set (`TIME_SET`), or language change (`LOCALE_CHANGED`).
  - **Background Motion & Location Sync (`WidgetForegroundService`)**: Battery-friendly step detection and location monitoring (10km threshold) to update widgets during travel. Stays alive while *any* widget type is placed — each widget's removal handler verifies all widget types before stopping the service or cancelling alarms.
  - **Capacitor Bridge (`WidgetBridge`)**: TypeScript layer with strict runtime validation (`validatePrayerPayload`, `validateQuranProgressPayload`), automatic exponential backoff retries, and no-op web fallbacks.
  - **Responsive Scaling & Layouts**: Configured with standard Android grid dimensions (`targetCellWidth="4"`, `targetCellHeight="2"`), auto-fitting text views, `ellipsize="end"`, and graceful empty states (`layout_empty`) to ensure pixel-perfect rendering across all screen densities (from mdpi up to xxxhdpi).

---

## 🚀 Technical Architecture & Privacy

Noor Connect is built from the ground up for performance and ethical transparency.

- **Frontend Core**: React 18, TypeScript, Vite, Tailwind CSS, & Framer Motion.
- **Enterprise GitHub Upgrades**: Version-aware changelog with an in-app "What's New" modal that highlights new features on every update, with per-version change tracking and a green badge indicator for unseen updates.
- **F-Droid First (FOSS)**: 
  - Strictly **Zero Analytics**, **Zero Trackers**. 
  - Pre-configured `foss` Gradle flavor specifically built to strip `play-services` for pure open-source distribution. 
  - Fastlane F-Droid metadata integration ready.
  - **APK Size Optimization**: Implemented a comprehensive F-Droid prebuild script (`clean-dist-data.js`) to strip >300MB of redundant JSON data from bundled assets. Uses **local Mushaf WebP storage** and CDN fallback to maintain feature completeness while keeping footprint manageable.
- **Data Portability**: Full App Backup & Restore capabilities directly to internal storage (localStorage + Capacitor Preferences). The latest snapshot is saved automatically every 20 minutes and on app close, with an automatic restore prompt after reinstall. All data stays strictly local.
- **Unified Backup Service**: A single `backup-service.ts` consolidates the legacy backup systems — old backups are auto-migrated on first launch. Platform-aware export: Android opens the native share sheet (Capacitor Filesystem + Share), web uses blob download. Every operation returns a typed result with plain-language errors — nothing fails silently.
- **Android Auto Backup Rules**: `backup_rules.xml` + `data_extraction_rules.xml` include WebView storage, Capacitor Preferences and widget prefs (large caches excluded to respect the 25MB cloud limit), so Google's silent cloud backup survives uninstall/reinstall on eligible devices.
- **Low-End Device Optimizations** (2016+ devices, 30+ FPS target):
  - Adaptive device detection (`device-performance.ts`) — CPU cores, device memory, connection type, save-data mode
  - Automatic animation reduction (`shouldReduceAnimations`) respecting `prefers-reduced-motion`
  - Debounced/throttled event handlers
  - IntersectionObserver lazy loading, critical resource preloading
  - Performance mode presets: low/medium/high based on hardware
  - **Singleton FPS monitor**: Module-level RAF loop with ref counting — only 1 loop total, auto-stops when no listeners remain
- **React Query Tuning**: Stale times, cache times, and retry policies adapted for constrained devices

---

## 🛠️ Getting Started (Local Development)

### Prerequisites
- **Node.js**: v18+
- **Android Studio / Gradle**: Required to build native Capacitor packages

### Clone & Run
```bash
git clone https://github.com/darkmaster0345/Noor-connect.git
cd Noor-connect
npm install

# Run the local frontend Vite instance
npm run dev
```

### Build & Export Android / F-Droid

For a standard Android APK targeting Google APIs:
```bash
npm run build
npx cap sync android
npx cap open android
```

For F-Droid (Strict FOSS, No Proprietary Blobs):
As per the `.fdroid.yml` config, run Gradle with the `foss` directive:
```bash
./gradlew assembleRelease -Pfoss=true
```

---

## 📄 License & Open-Source

This project is licensed under the [GNU General Public License v3.0](LICENSE).

<p align="center">
  <i>"Indeed, in the remembrance of Allah do hearts find rest." (Ar-Ra'd 13:28)</i>
</p>

## 📱 Screenshots

<table>
  <tr>
    <td align="center"><img width="280" alt="Home Dashboard with Islamic features" src="assets/screenshots/1_home.png" /><br/><b>Home Dashboard</b></td>
    <td align="center"><img width="280" alt="Enhanced Services Overview" src="assets/screenshots/2_services.png" /><br/><b>Services</b></td>
    <td align="center"><img width="280" alt="Premium Qibla Compass UI" src="assets/screenshots/3_qibla.png" /><br/><b>Qibla Compass</b></td>
  </tr>
  <tr>
    <td align="center"><img width="280" alt="Live Makkah/Madinah Streams" src="assets/screenshots/4_live.png" /><br/><b>Live Streams</b></td>
    <td align="center"><img width="280" alt="Quran Radio with Progress" src="assets/screenshots/5_radio.png" /><br/><b>Quran Radio</b></td>
    <td align="center"><img width="280" alt="Advanced Islamic Quiz Interface" src="assets/screenshots/6_quiz.png" /><br/><b>Islamic Quiz</b></td>
  </tr>
  <tr>
    <td align="center"><img width="280" alt="Islamic Remedies (Tibb-e-Nabawi)" src="assets/screenshots/7_islamic_remedies.png" /><br/><b>Islamic Remedies</b></td>
    <td align="center"><img width="280" alt="Complete Hadith Encyclopedia" src="assets/screenshots/8_hadith.png" /><br/><b>Hadith Encyclopedia</b></td>
    <td align="center"><img width="280" alt="Advanced Settings & Configuration" src="assets/screenshots/9_settings.png" /><br/><b>Settings</b></td>
  </tr>
</table>

**Note**: Screenshots showcase Noor's comprehensive Islamic companion features, including advanced Quran reading, native widgets, gamified learning, and privacy-first interface design.

