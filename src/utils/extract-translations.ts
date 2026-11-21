/**
 * Script to extract translations from translations.ts and create JSON files
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Extract the English translations from the current translations.ts
const englishTranslations = {
  "appTitle": "Siraj",
  "home": "Home",
  "quran": "Quran",
  "qibla": "Qibla",
  "settings": "Settings",
  "profile": "Profile",
  "loading": "Loading",
  "services": "Services",
  "nextPrayer": "Next Prayer",
  "todaysPrayers": "Today's Prayers",
  "viewAll": "View All",
  "dailyAyah": "Daily Ayah",
  "dailyHadith": "Daily Hadith",
  "readMore": "Read More",
  "share": "Share",
  "qazaTracker": "Qaza Tracker",
  "ramadanMode": "Ramadan Mode",
  "menstrualMode": "Menstrual Mode",
  "zakatCalculator": "Zakat Calculator",
  "islamicQuiz": "Islamic Quiz",
  "namesOfAllah": "99 Names",
  "tasbih": "Dhikr",
  "tracker": "Tracker",
  "calc": "Calculator",
  "mode": "Mode",
  "islamic": "Islamic",
  "ofAllah": "of Allah",
  "direction": "Direction",
  "fajr": "Fajr",
  "sunrise": "Sunrise",
  "dhuhr": "Dhuhr",
  "asr": "Asr",
  "maghrib": "Maghrib",
  "isha": "Isha",
  "imsak": "Imsak",
  "ishraq": "Ishraq",
  "duha": "Duha",
  "tahajjud": "Tahajjud",
  "midnight": "Midnight",
  "manual": "Manual",
  "joinDiscord": "Join our Discord",
  "contactDeveloper": "Contact Developer",
  "makeDua": "Make Dua for Me",
  "upcoming": "Upcoming",
  "end": "end",
  "searchSurah": "Search Surah...",
  "ayahs": "Ayahs",
  "juz": "Juz",
  "surahs": "Surahs",
  "locationDetected": "Location detected",
  "locationDetectionFailed": "Location detection failed",
  "pleaseEnableLocationPermissions": "Please enable location permissions",
  "menstrualModeEnded": "Menstrual Mode ended",
  "menstrualModeEnabled": "Menstrual Mode enabled",
  "prayerReminderSchedulingResumed": "Prayer reminder scheduling has resumed.",
  "prayerRemindersPaused": "Prayer reminders and auto Qaza sync are paused while this mode is active.",
  "failedToClearPrayerNotifications": "Failed to clear prayer notifications:",
  "salamGreetingEnabled": "Salam greeting enabled",
  "salamGreetingDisabled": "Salam greeting disabled",
  "notificationPermissionDenied": "Notification permission denied",
  "pleaseEnableNotificationsInBrowser": "Please enable notifications in your browser settings",
  "notificationsEnabled": "✅ Notifications enabled!",
  "youllReceivePrayerReminders": "You'll now receive prayer times and Islamic event reminders.",
  "permissionDenied": "Permission denied",
  "goToAndroidSettings": "Go to Android Settings → Apps → Siraj → Notifications and turn them on.",
  "clickLockIconAllowNotifications": "Click the lock icon in your browser address bar and allow Notifications.",
  "testNotificationSent": "Test notification sent",
  "failedToSendNotification": "Failed to send notification",
  "pleaseCheckDeviceNotificationSettings": "Please check your device notification settings.",
  "prayerNotificationsEnabled": "Prayer Notifications Enabled",
  "prayerNotificationsDisabled": "Prayer Notifications Disabled",
  "prayerRemindersScheduled": "Prayer reminders will be scheduled automatically",
  "prayerRemindersCancelled": "Prayer reminders have been cancelled",
  "failedToUpdatePrayerNotificationSettings": "Failed to update prayer notification settings:",
  "couldNotUpdatePrayerNotificationSettings": "Could not update prayer notification settings.",
  "prayerNotificationsCleared": "Prayer Notifications Cleared",
  "allScheduledPrayerRemindersCancelled": "All scheduled prayer reminders have been cancelled",
  "madhabShafi": "Madhab: Shafi'i",
  "madhabHanafi": "Madhab: Hanafi",
  "calculationMethodUpdated": "Calculation method updated",
  "quranFontChanged": "Quran font changed",
  "nowUsingFont": "Now using",
  "creatingBackup": "Creating Backup...",
  "pleaseWaitBackup": "Please wait while we prepare your backup file.",
  "backupComplete": "✅ Backup Complete",
  "backupDownloadedSuccessfully": "Your backup has been downloaded successfully.",
  "backupFailed": "❌ Backup Failed",
  "backupCreationFailed": "Failed to create backup. Please try again.",
  "restoringBackup": "Restoring Backup...",
  "pleaseWaitRestore": "Please wait while we restore your data.",
  "restoreFailed": "❌ Restore Failed",
  "restoreComplete": "✅ Restore Complete",
  "dataRestoredSuccessfully": "Your data has been restored successfully. App will refresh in 2 seconds.",
  "restoreFileCheckFailed": "Failed to restore backup. Please check file and try again.",
  "cacheCleared": "Cache cleared",
  "deleteAllDownloadedBooks": "Delete all downloaded e-books?",
  "genderUpdated": "Gender updated",
  "menstrualModeAvailable": "Menstrual mode features are now available.",
  "preferencesUpdated": "Your preferences have been updated.",
  "notificationPreferences": "Notification Preferences",
  "prayerNotifications": "Prayer Notifications",
  "ramadanCountdown": "Ramadan Countdown",
  "eidGreetings": "Eid Greetings",
  "fridayKahfReminder": "Friday Kahf Reminder",
  "morningReminders": "Morning Reminders",
  "eveningReminders": "Evening Reminders",
  "testNotification": "Send Test Notification",
  "enableNotifications": "Enable Notifications",
  "notificationHistory": "Notification History",
  "compassIdle": "Compass idle",
  "sensorNotActiveYet": "Sensor is not active yet.",
  "startingCompass": "Starting compass",
  "holdPhoneSteady": "Hold your phone steady while sensor data is initializing.",
  "liveCompassActive": "Live compass active",
  "liveHeadingDetected": "Live heading is detected and updating.",
  "permissionRequired": "Permission required",
  "tapEnableCompass": "Tap Enable Compass to request motion sensor permission.",
  "compassPermissionDenied": "Permission denied",
  "allowMotionAccess": "Allow motion/orientation access in browser or app settings.",
  "sensorUnsupported": "Sensor unsupported",
  "deviceNoCompassSensor": "This device does not expose a compass sensor in this environment.",
  "noSensorData": "No sensor data",
  "noOrientationEvents": "No orientation events were received. Use manual mode below.",
  "detectingLocationQibla": "Detecting location and Qibla direction...",
  "unableToStartQibla": "Unable to start Qibla",
  "pleaseTryAgain": "Please try again.",
  "retry": "Retry",
  "usePhysicalCompass": "Use a physical compass and face the manual Qibla bearing.",
  "alignedWithQibla": "Aligned with Qibla",
  "turnRight": "Turn right",
  "turnLeft": "Turn left",
  "deg": "deg",
  "enableCompass": "Enable Compass",
  "recalibrate": "Recalibrate",
  "manualMode": "Manual Mode",
  "facingQibla": "Facing Qibla",
  "kaabaDistance": "Kaaba distance",
  "currentBearing": "Current bearing",
  "qiblaDirection": "Qibla direction",
  "weeklyProgress": "Weekly Progress",
  "prayersThisWeek": "prayers this week",
  "noPrayerDataYet": "No prayer data yet",
  "checkInPrayersToSeeProgress": "Check in prayers to see your progress",
  "failedToLoadPrayerTimes": "Failed to load prayer times",
  "tryAgain": "Try again",
  "useMecca": "Use Mecca",
  "gps": "GPS",
  "defaultLocation": "Default",
  "manualLocation": "Manual",
  "ishraqDuhaTahajjud": "Ishraq, Duha, Tahajjud...",
  "todaysSalah": "Today's Salah",
  "dayStreak": "Day Streak",
  "allPrayersCompletedToday": "✨ MashaAllah! All prayers completed today!",
  "digitalTasbeeh": "Digital Tasbeeh",
  "selectDhikr": "Select Dhikr",
  "total": "Total",
  "count": "Count",
  "tapToDhikr": "Tap to Dhikr",
  "resetCount": "Reset Count",
  "nextGoal": "Next Goal",
  "resetCurrentCounter": "Reset current counter to 0?",
  "alQuranAlKareem": "Al-Qur'an Al-Kareem",
  "theNobleQuran": "The Noble Qur'an",
  "readListenContemplate": "Read, listen, and contemplate the words of Allah.",
  "continueReading": "Continue Reading",
  "searchBySurahNameOrNumber": "Search by Surah name or number...",
  "noSurahsFound": "No surahs found matching your search.",
  "quranReader": "Quran Reader",
  "surahNotFound": "Surah not found",
  "quranSettingsButton": "Settings",
  "progress": "Progress",
  "quranSettings": "Quran Settings",
  "font": "Font",
  "translation": "Translation",
  "fontSize": "Font Size",
  "closeSettings": "Close Settings",
  "lastRead": "Last Read"
};

// Create empty templates for other languages
const createEmptyTemplate = () => {
  const template: Record<string, string> = {};
  Object.keys(englishTranslations).forEach(key => {
    template[key] = "";
  });
  return template;
};

// Write files
const localesDir = join(__dirname, '../locales');

try {
  mkdirSync(localesDir, { recursive: true });
  
  // Write English translations
  writeFileSync(
    join(localesDir, 'en.json'),
    JSON.stringify(englishTranslations, null, 2),
    'utf8'
  );
  
  // Write empty templates for other languages
  ['ur', 'tr', 'id'].forEach(lang => {
    writeFileSync(
      join(localesDir, `${lang}.json`),
      JSON.stringify(createEmptyTemplate(), null, 2),
      'utf8'
    );
  });
  
  console.log('✅ Locale files created successfully!');
} catch (error) {
  console.error('❌ Error creating locale files:', error);
}
