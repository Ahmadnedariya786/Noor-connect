![Untitled design](https://github.com/user-attachments/assets/2e0a2569-47a2-49b3-8ccc-25e37964bfb5)
# 🌙 Noor Connect - Your Ultimate Islamic Companion

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Status](https://img.shields.io/badge/status-stable-green.svg)](https://github.com/darkmaster0345/Noor-connect) [![F-Droid Compatible](https://img.shields.io/badge/F--Droid-Ready-blue.svg)](.fdroid.yml)

**Noor Connect** is a truly comprehensive, beautiful, and strict privacy-focused Islamic application designed to help you stay connected with your faith. Built to modern mobile standards using web technologies (React + Vite + Capacitor), it stands as a premium, tracker-free digital companion for spiritual growth.

---

## 🆕 What's New in v2.0.0

### 🌿 Islamic Remedies (Tibb-e-Nabawi) — Complete Redesign
- **Two-phase experience**: Mood grid (12 moods, responsive 2/3 col) → Full-screen remedy viewer with smooth Framer Motion animations
- **Rich visual design**: Warm gradient backgrounds, 3xl/4xl Arabic typography, type badges, Play/Copy/Next actions
- **Daily Remedy Card** with visible gradient background and interactive check animation
- **Gamified stats bar**: Streak, views, favorites, XP in clean single-line layout
- **Search + type filters** (pills above input), **Favorites page** linked from main view

### 📱 Widget System v2 — Native Kotlin Rebuild
- **5 widgets**: Next Prayer (live countdown + progress ring), Daily Ayah, Daily Hadith (grade-colored), Quran Progress (ring + streak + Ramadan goal), Tasbeeh Counter (tap-to-increment, haptic, dhikr cycle)
- **Unified refresh**: Single WorkManager (30min periodic + expedited + motion-based step detection)
- **Prayer alarms**: Exact alarms at each prayer time with graceful fallback
- **Boot/Time/Locale survival**: Centralized via WidgetBootReceiver → WidgetRefreshWorker
- **Capacitor bridge**: 4-method plugin (syncPrayerData, syncDailyContent, syncQuranProgress, pushTasbeehIncrement)
- **Strict validation**: Prayer payload requires exactly 6 prayers, valid nextPrayerIndex

### 🏠 Dashboard Integration
- **MoodSelector widget** revived: daily remedy, gamification stats, favorites toggle, next/copy/play actions
- Registered `remedy` widget in dashboard config (visible by default)

### 💾 Backup & Restore (Cross-Platform)
- localStorage-based (no native filesystem dependency)
- Auto-backup on first install, auto-restore on reinstall
- Background processing for performance

### ⚡ Low-End Device Optimizations
- Adaptive device detection (30+ FPS target on 2016+ devices)
- React Query tuned for constrained hardware
- Background processing for heavy ops
- Smart backup detection without CPU/RAM load

### 📚 Hadith Collection Overhaul — 87K Hadith
- **16 Collections, 87,018 Hadith**: Complete authenticated collections including Bukhari (7,563), Muslim (5,366), Tirmidhi (5,345), Abu Dawud (10,547), Nasai (7,084), Ibn Majah (8,685), plus 10 more (Ahmad, Mishkat, Riyad us-Saliheen, Muwatta Malik, Darimi, Bulugh, Adab, Shamail, Forty Hadith, Hisnul Muslim)
- **Bookmarks System**: Save/unsave hadith with localStorage persistence, dedicated bookmarks page at `/hadith/bookmarks` with clear-all and per-item remove
- **Premium Viewer**: Full-screen detail view with grade-colored badges, smooth navigation between hadith, Arabic text at optimal sizes
- **Daily Hadith** with Arabic + English + source, refreshable, in both dashboard widget and dedicated page
- **Performance**: All data loaded lazily via fetch (not bundled), cached after first load

### ⚡ Performance Optimization — RAF Loop Cleanup
- Removed `monitorFPS()` continuous RAF loop from App.tsx (was running forever, doing nothing but console.warn)
- Converted `useAnimationTier` FPS monitor from per-instance to module-level singleton (was starting 1 RAF loop per component — stopped at 4+ concurrent loops)
- Removed empty scroll RAF handler that fired on every scroll event doing no work

### 🐛 Critical Fixes
- JSON.parse safety (try-catch everywhere)
- TypeScript strictness (no `as any`, proper types)
- React hooks dependency arrays, functional state updates
- localStorage quota handling with cleanup
- Memory leak prevention (event listener cleanup)
- Widget: unknown hadith grades use neutral color, localized countdown strings, minute-precision countdown, fixed 1-hour boundary, Arabic RTL fix, countdown overlay, format-string preview defaults, Tasbeeh content descriptions
- Android: FOREGROUND_SERVICE_MEDIA_PLAYBACK permission, duplicate flatDir removed, ProGuard cleaned
- Thread safety: @Volatile on HadithBundle cache
- All payload parsing failures now logged with context

---

## ✨ The Complete Feature Set

### 📖 Enhanced Quran & Tafsir Explorer

- **Complete Holy Quran**: Clean, beautifully styled Uthmani and Indo-Pak reading interfaces.
- **Advanced Tafsir System**: 25+ global Quranic commentary editions instantly accessible via high-speed spaCy API integration, eliminating heavy database overhead.
- **Multilingual Support**: Read meanings and Tafsir in English, Arabic, Bengali, Urdu, and Russian.
- **Recitation Playback**: Immersive background audio from multiple reciters with progress tracking.

### 🕋 Premium Qibla Compass
- **High-Precision Native Sensors**: Completely overhauled native compass utilization tapping into device magnetometers for raw, smooth orientation.
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
- **Mushaf Image Optimization**: Local asset storage with Gradle-based image moving during Android build to eliminate duplication and reduce APK size (168MB → 84MB). F-Droid compatible.


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
<table>
  <tr>
    <td><img width="400" alt="ao2r6ooztsbzqzs0gyot" src="https://github.com/user-attachments/assets/9d5f585c-c981-4ec3-b76b-98db58e326ed" /></td>
    <td><img width="400" alt="kz29bm528tqdlrkdllka" src="https://github.com/user-attachments/assets/68ff891a-99b1-4906-8e5e-7ae040d501a9" /></td>
    <td><img width="400" alt="p2nplsqzwlfgltgpwcyv" src="https://github.com/user-attachments/assets/ba728807-a52c-4178-ad78-ad0350edbf88" /></td>
  </tr>
</table>

