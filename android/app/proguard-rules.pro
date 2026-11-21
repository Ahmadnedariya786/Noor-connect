# ================================================================
# Siraj — ProGuard / R8 rules for release builds
# ================================================================

# ── Siraj App Classes ────────────────────────────────────
# BroadcastReceivers, Services, and Plugins referenced in Manifest
-keep class com.siraj.app.AdhanAlarmReceiver { *; }
-keep class com.siraj.app.AdhanPlaybackService { *; }
-keep class com.siraj.app.NativeAdhanScheduler { *; }
-keep class com.siraj.app.NativeAdhanScheduler$ScheduledAdhan { *; }
-keep class com.siraj.app.BootReceiver { *; }
-keep class com.siraj.app.MainActivity { *; }

# Widget providers (new unified widget suite)
-keep class com.siraj.app.widgets.** { *; }

# ── Capacitor Framework ──────────────────────────────────────────
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.annotation.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @com.getcapacitor.annotation.CapacitorPlugin public *;
}

# Keep all Capacitor plugin classes
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }

# ── AndroidX / Google Play Services ──────────────────────────────
-keep class androidx.core.app.NotificationCompat** { *; }

# ── General ──────────────────────────────────────────────────────
# Keep source file names and line numbers for crash reports
-keepattributes SourceFile,LineNumberTable

# Keep annotations
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes InnerClasses

# --- Siraj Custom Rules ---

# Keep new Kotlin widget classes
-keep class com.siraj.app.widgets.** { *; }

# Keep WorkManager (prevents minification issues with workers)
-keep class androidx.work.** { *; }
-keep interface androidx.work.** { *; }
