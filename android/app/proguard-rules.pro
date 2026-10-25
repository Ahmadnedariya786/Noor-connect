# ================================================================
# Noor Connect — ProGuard / R8 rules for release builds
# ================================================================

# ── Noor Connect App Classes ────────────────────────────────────
# BroadcastReceivers, Services, and Plugins referenced in Manifest
-keep class com.noorconnect.ummah.AdhanAlarmReceiver { *; }
-keep class com.noorconnect.ummah.AdhanPlaybackService { *; }
-keep class com.noorconnect.ummah.NativeAdhanScheduler { *; }
-keep class com.noorconnect.ummah.NativeAdhanScheduler$ScheduledAdhan { *; }
-keep class com.noorconnect.ummah.BootReceiver { *; }
-keep class com.noorconnect.ummah.MainActivity { *; }

# Widget providers (new unified widget suite)
-keep class com.noorconnect.ummah.widgets.** { *; }

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

# --- Noor Connect Custom Rules ---

# Keep new Kotlin widget classes
-keep class com.noorconnect.ummah.widgets.** { *; }

# Keep WorkManager (prevents minification issues with workers)
-keep class androidx.work.** { *; }
-keep interface androidx.work.** { *; }
