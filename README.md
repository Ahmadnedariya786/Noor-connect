![Untitled design](https://github.com/user-attachments/assets/2e0a2569-47a2-49b3-8ccc-25e37964bfb5)
# 🌙 Noor Connect - Your Ultimate Islamic Companion

[![License: GPL-3.0-or-later](https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg)](https://opensource.org/licenses/GPL-3.0) [![Status](https://img.shields.io/badge/status-stable-green.svg)](https://github.com/darkmaster0345/Noor-connect) [![F-Droid Compatible](https://img.shields.io/badge/F--Droid-Ready-blue.svg)](.fdroid.yml) [![Version](https://img.shields.io/badge/version-2.0.1-orange.svg)](CHANGELOG.md)

**Noor Connect** is a truly comprehensive, beautiful, and strict privacy-focused Islamic application designed to help you stay connected with your faith. Built to modern mobile standards using web technologies (React + Vite + Capacitor), it stands as a premium, tracker-free digital companion for spiritual growth.

---

## 🆕 What's New in v2.0.1

### 📖 Quran Progress Tracking Fixes — Complete Overhaul

**Fixed critical issues with Quran reading progress tracking and display to provide accurate reading statistics:**

| Issue | Fix |
|-------|-----|
| **Incorrect surah count** | Progress now only counts fully completed surahs (when all ayahs are read), not partially read ones |
| **Misleading UI text** | Updated "Surahs Completed" to "Surahs fully Completed" for clarity |
| **Wrong progress calculation** | Changed from ayah-based estimation to accurate page-based tracking (604 total pages) |
| **Position tracking bug** | Fixed progress to track current page position instead of maximum page ever visited |
| **Widget sync mismatch** | Added widget-compatible localStorage key sync for native Android widgets |

**Technical Changes:**
- Updated `QuranProgressWidget` to display pages read (X/604) instead of ayahs
- Modified `quran-features` service to track pages read and calculate percentage based on pages
- Fixed `QuranReader` to use current page instead of maxPageViewed for progress
- Added widget progress synchronization with proper payload formatting
- Added `WIDGET_PROGRESS_KEY` to match widget sync expectations
- Created `syncWidgetProgress()` method for widget data synchronization
- Updated `saveRecitationProgress()` to automatically sync widget data
- Added `getReadingStreakSync()` for synchronous streak data access

**User Impact:**
- Progress now accurately reflects your actual reading position
- Surah completion count only shows fully read surahs
- Page-based tracking provides more precise progress percentage
- Native Android widgets now sync correctly with reading progress
- No more misleading progress statistics when navigating between pages

---

## ✨ The Complete Feature Set

### 📖 Enhanced Quran & Tafsir Explorer

- **Complete Holy Quran**: Beautifully styled Uthmani and Indo-Pak reading interfaces with **local Madani Mushaf WebP images** (604 pages). Advanced caching system prefetches pages for instant display.
- **Adaptive Quran View**: Smart interface that switches between **Reading Mushaf** (Arabic-only) and **Translated Mushaf** (Arabic + translations) modes with seamless switching.
- **Word-by-Word Tajweed Support**: Select from multiple Mushaf styles including **Madani, Naskh (Indo-Pak), Classic Madani, Warsh, and Qaloon scripts** with color-coded Tajweed rules.
- **Advanced Tafsir System**: 25+ global Quranic commentary editions instantly accessible via high-speed spaCy API integration, eliminating heavy database overhead.
- **Multilingual Support**: Read meanings and Tafsir in English, Arabic, Bengali, Urdu, and Russian with word-by-word translations.
- **Recitation Playback**: Immersive background audio from multiple reciters with progress tracking, synchronized with Mushaf page turns and highlighted verses.

### 🕋 Premium Qibla Compass
- **High-Precision Native Sensors**: Completely overhauled native compass utilization tapping into device magnetometers for raw, smooth orientation. 60fps hardware-accelerated JS interpolation eliminates sensor jitter and UI lag on legacy Android devices.
- **Muslim Pro Grade UI**: Exquisite SVG-based compass dial with Kaaba alignment glow effects, jitter-reducing low-pass filters, and haptic feedback upon true Qibla lock.
- **Web & Manual Fallback**: If sensors fail, the app gracefully falls back to GPS/Web-oriented calculation paths.

### ⏲️ Smart Prayer Times & Adhan Control
- **Offline Calculation**: Fast, precise, localization-based timings for Hanafi and Shafi'i madhabs generated fully offline.
- **Granular Adhan Toggles**: Selectively enable or disable Adhan alarms per individual prayer using deep native background alarms—silence Asr without muting Maghrib!
- **Optimized TTS & Audio**: Highly tuned Adhan playback utilizing an advanced audio engine to prevent interruptions or background sleep killing. 

### 📿 Complete Spiritual Tracking & Menstrual Mode
- **Gender-Adaptive Onboarding**: Intelligent routing that completely re-adapts internal features based on the user.
- **Menstrual Mode**: Carefully tracks cycles, automatically silencing obligatory Adhans, halting Salah charts, and adjusting habit trackers during breaks without breaking daily login streaks.
- **Qaza & Habits**: Keep a long-term offline ledger of your missed prayers (Qaza Tracker), digital Tasbeeh goals, and weekly spiritual habit consistency.
- **Salah Focus Timer**: A dedicated Do-Not-Disturb timer to help you maintain khushu (focus) during prayer.
- **Mood-Based Reflections**: Enhanced Mood Selector providing tailored Daily Ayahs and Islamic Greetings based on how you feel.

### 📚 Islamic Life & Education Tools
- **Zakat & Fitrana Calculators**: Advanced offline calculators to accurately determine your annual Zakat and Ramadan Fitrana obligations. Features gold and silver weight calculators with purity options, real-time exchange rate tracking with fallback for offline use, preferred currency settings, and automatic rate updates when online.
- **Hisnul Muslim & Duas**: Comprehensive library of authentic supplications for all occasions.
- **Names of Allah (Asma-ul-Husna)**: Beautifully rendered 99 Names of Allah with meanings and fluid animations.
- **Enhanced Islamic Quiz**: Test your knowledge of Deen with interactive, gamified Islamic quizzes. Includes daily rewards, combo multipliers, mystery boxes, and reliable cross-platform gamification logic.
- **Islamic Remedies (Tibb-e-Nabawi)**: Prophetic medicine index with a favorites list for quick reference.
- **Eid & Festive Checklist**: Special event mode with checklists and celebratory popups to prepare for Eid and other significant Islamic events.

### 📻 Rich Media & Islamic Library
- **Hadith Encyclopedia (87K)**: 16 complete collections with Arabic + English, grade badges, bookmarks, daily hadith widget, and full-text navigation.
- **24/7 Quran Radio & Streams**: Direct live video and audio streams from Makkah and Madinah via Akamai CDN (hls_roku) for reliable HLS streaming. CSP-compliant HTTP support included.
- **Radio Statistics & Achievements**: Track your listening habits with detailed statistics per station, total listening time, streak tracking, and unlockable achievements for consistent listening.
- **Mushaf Image Optimization**: Local asset storage with Gradle-based image moving during Android build to eliminate duplication. Uses **standard Madani Mushaf** (industry standard for Muslim world with 604 pages).


### 📱 Enhanced Widget System & Dashboard
- **Native Android Widgets Suite v2**: 5 beautiful, lightning-fast native Kotlin widgets — Next Prayer (live countdown + progress ring), Daily Ayah, Daily Hadith (grade-colored), Quran Progress (ring + streak + Ramadan goal), Tasbeeh Counter (tap-to-increment, haptic, dhikr cycle)
- **Unified Background Refresh**: Single WorkManager (30min periodic + expedited one-shot + motion-based step detection)
- **Exact Prayer Alarms**: Native alarms at each prayer time with graceful inexact fallback
- **System Event Survival**: Boot/Time/Locale changes handled via WidgetBootReceiver → WidgetRefreshWorker
- **Capacitor Bridge (WidgetBridge)**: 4-method plugin (syncPrayerData, syncDailyContent, syncQuranProgress, pushTasbeehIncrement)
- **Strict Payload Validation**: Prayer payload requires exactly 6 prayers, valid nextPrayerIndex
- **Live Interactive Previews**: Complete visual grid customizer in the web dashboard allows you to instantly preview the color schemes and layouts of widgets before enabling them
- **Robust Platform Abstraction**: All Android native widget background updates wrapped with robust Capacitor checks (`capacitor-utils.ts`) to completely eliminate cross-platform console errors when running in the browser
- **Dual Update Modes**: Support for both basic (next-prayer only) and full (prayer schedule, Quran data, Hijri date) widget updates straight to the Android home-screen
- **Automatic Background Sync**: Configurable auto-update timer (every 30 minutes) perfectly syncs the app to your home screen using native Android widgets and services

---

## 🚀 Technical Architecture & Privacy

Noor Connect is built from the ground up for performance and ethical transparency.

- **Frontend Core**: React 18, TypeScript, Vite, Tailwind CSS, & Framer Motion.
- **Enterprise GitHub Upgrades**: Built-in auto-updater component that checks the GitHub repository directly. You can update your APK entirely detached from major app stores.
- **F-Droid First (FOSS)**: 
  - Strictly **Zero Analytics**, **Zero Trackers**. 
  - Pre-configured `foss` Gradle flavor specifically built to strip `play-services` for pure open-source distribution. 
  - Fastlane F-Droid metadata integration ready.
  - **APK Size Optimization**: Implemented a comprehensive F-Droid prebuild script (`clean-dist-data.js`) to strip >300MB of redundant JSON data from bundled assets. Uses **local Mushaf WebP storage** and CDN fallback to maintain feature completeness while keeping footprint manageable.
- **Data Portability**: Full App Backup & Restore capabilities directly to internal storage (localStorage + Capacitor Preferences). Auto-backup on first install, auto-restore on reinstall. All data stays strictly local.
- **Cross-Platform Backup**: `backup-restore-service.ts` uses localStorage (no native filesystem dependency) with background processing via `requestIdleCallback`/`setTimeout` to avoid UI blocking.
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
    <td align="center"><img width="280" alt="Home Dashboard" src="assets/screenshots/1_home.png" /><br/><b>Home Dashboard</b></td>
    <td align="center"><img width="280" alt="Services" src="assets/screenshots/2_services.png" /><br/><b>Services</b></td>
    <td align="center"><img width="280" alt="Qibla Compass" src="assets/screenshots/3_qibla.png" /><br/><b>Qibla Compass</b></td>
  </tr>
  <tr>
    <td align="center"><img width="280" alt="Live Streams" src="assets/screenshots/4_live.png" /><br/><b>Live Streams</b></td>
    <td align="center"><img width="280" alt="Quran Radio" src="assets/screenshots/5_radio.png" /><br/><b>Quran Radio</b></td>
    <td align="center"><img width="280" alt="Islamic Quiz" src="assets/screenshots/6_quiz.png" /><br/><b>Islamic Quiz</b></td>
  </tr>
  <tr>
    <td align="center"><img width="280" alt="Islamic Remedies" src="assets/screenshots/7_islamic_remedies.png" /><br/><b>Islamic Remedies</b></td>
    <td align="center"><img width="280" alt="Hadith Encyclopedia" src="assets/screenshots/8_hadith.png" /><br/><b>Hadith Encyclopedia</b></td>
    <td align="center"><img width="280" alt="Settings" src="assets/screenshots/9_settings.png" /><br/><b>Settings</b></td>
  </tr>
</table>

