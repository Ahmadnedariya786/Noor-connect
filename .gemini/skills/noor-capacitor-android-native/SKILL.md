---
name: noor-capacitor-android-native
description: Enforces Capacitor Android native WebView request interception, CORS-free streaming proxy, exact alarm scheduling, and APK update tag isolation in Noor Connect.
---

# Capacitor Android WebView, CORS Proxy & Native Alarm Guard

This domain skill governs native Android bridge stability, Capacitor plugins, HTTP request interception in `MainActivity.java`, and native APK update lifecycle.

## 1. Triggers
Activate this skill whenever any of the following files are inspected or modified:
- `android/**`
- `android/app/src/main/java/com/noorconnect/ummah/MainActivity.java`
- `src/lib/app-updater.ts`
- `src/lib/update-checker.ts`
- `src/lib/adhan-alarm-manager.ts`
- `src/components/GlobalPrayerAlarm.tsx`
- Capacitor plugin integrations and native manifest configurations

## 2. Enforced Rules & Invariants

### A. CORS-Free Native Stream Proxy (`/__gh_ebook__/`)
1. **The Android WebView CORS Barrier:**
   - Modern Android WebViews block direct `fetch()` or `XMLHttpRequest` calls from `https://localhost` to external domains if standard CORS headers (`Access-Control-Allow-Origin: *`) are omitted by upstream servers (e.g. GitHub Releases CDN redirects to AWS S3).
2. **Native Request Interceptor in `MainActivity.java`:**
   - Large external binary streams (such as PDF eBook volumes from `github.com/.../releases/download/ebooks-library-v1/*.pdf`) must be routed through the local virtual path `/__gh_ebook__/`.
   - In `MainActivity.java`, `WebViewClient.shouldInterceptRequest()` intercepts requests matching `/__gh_ebook__/`:
     * Resolves the target external URL.
     * Follows HTTP 301, 302, and 307 multi-hop redirects up to 5 hops.
     * Synthesizes a `WebResourceResponse` injecting `Access-Control-Allow-Origin: *`, `Accept-Ranges: bytes`, and accurate `Content-Length` headers.
     * Streams data directly into the WebView pipeline without loading the entire binary into native JVM heap (preventing memory exhaustion).

### B. APK Update Tag Isolation
1. **Asset Release vs App Release Isolation:**
   - GitHub releases for this repository may contain content payloads (such as `ebooks-library-v1` which hosts PDF assets only) alongside app binary releases (such as `nightly` which hosts `.apk` binaries).
2. **Strict APK Asset Filtering:**
   - In `update-checker.ts` and `app-updater.ts`, never assume the latest chronological GitHub release is an APK update.
   - Filter candidate releases strictly:
     ```ts
     const hasApkAsset = release.assets?.some((asset: any) => 
       asset.name?.toLowerCase().endsWith('.apk')
     );
     ```
   - Ignore content releases like `ebooks-library-v1` completely so users are never prompted to "update" their app using a book volume.

### C. Native Alarm & Doze Mode Guard
1. **Exact Alarms (`SCHEDULE_EXACT_ALARM`):**
   - Prayer Adhan notifications require exact timing. Ensure Android 12+ (API 31+) `canScheduleExactAlarms()` is checked before setting alarms via `AlarmManager.setExactAndAllowWhileIdle()`.
2. **Battery Optimization Bypass:**
   - Keep battery optimization onboarding and guidance intact so background prayer notifications are not killed by OEM aggressive power managers.

## 3. Pre-Commit Verification Checklist
- [ ] Native compilation check: Run `cd android && ./gradlew compileDebugJavaWithJavac` or `assembleDebug`.
- [ ] CORS interception test: Verify `/__gh_ebook__/` URLs properly stream PDF volumes without CORS errors in WebView.
- [ ] Release parsing audit: Verify update checks only recognize releases containing valid `.apk` assets.
- [ ] Zero user friction: Confirm update flows never prompt for owner passwords or administrative keys.
