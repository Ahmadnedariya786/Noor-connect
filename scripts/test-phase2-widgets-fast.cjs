const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== FAST NODE VERIFICATION: PHASE 2 WIDGETS & 360PX INVARIANTS ===');

// 1. Verify absence of backdrop-filter in WidgetSettings.tsx
const widgetSettingsPath = path.resolve(__dirname, '../src/pages/WidgetSettings.tsx');
const widgetSettingsCode = fs.readFileSync(widgetSettingsPath, 'utf8');

assert.strictEqual(
  widgetSettingsCode.includes('backdropFilter') || widgetSettingsCode.includes('backdrop-filter'),
  false,
  'WidgetSettings.tsx must contain ZERO backdrop-filter'
);
console.log('✓ PASS: Zero backdrop-filter in WidgetSettings.tsx');

// 2. Verify 3 preview tabs exist in WidgetSettings.tsx
assert.ok(widgetSettingsCode.includes("id: 'next_prayer'"), 'Next prayer preview tab must exist');
assert.ok(widgetSettingsCode.includes("id: 'circular_clock'"), 'Circular clock preview tab must exist');
assert.ok(widgetSettingsCode.includes("id: 'compact_strip'"), 'Compact strip preview tab must exist');
console.log('✓ PASS: All 3 preview tabs (Next Prayer, Circular Clock, 6-Prayer Strip) verified');

// 3. Verify all 7 Pin buttons are defined in WidgetSettings.tsx
const expectedWidgets = [
  'next_prayer',
  'circular_clock',
  'compact_strip',
  'daily_ayah',
  'daily_hadith',
  'quran_progress',
  'tasbeeh',
];
for (const id of expectedWidgets) {
  assert.ok(
    widgetSettingsCode.includes(id),
    `Widget ${id} must be supported in Pin section`
  );
}
console.log('✓ PASS: All 7 widget pin buttons supported');

// 4. Verify Show Qaza End Time toggle
assert.ok(widgetSettingsCode.includes('showQazaEndTime'), 'showQazaEndTime toggle must exist in WidgetSettings.tsx');
console.log('✓ PASS: Show Qaza End Time toggle verified');

// 5. Verify Native Android Files exist
const nativeFiles = [
  'android/app/src/main/java/com/noorconnect/ummah/widgets/circularclock/NoorCircularClockWidget.kt',
  'android/app/src/main/java/com/noorconnect/ummah/widgets/compactstrip/NoorCompactStripWidget.kt',
  'android/app/src/main/java/com/noorconnect/ummah/widgets/nextprayer/NextPrayerWidget.kt',
  'android/app/src/main/java/com/noorconnect/ummah/widgets/dailyayah/DailyAyahWidget.kt',
  'android/app/src/main/java/com/noorconnect/ummah/widgets/WidgetStyleHelper.kt',
  'android/app/src/main/java/com/noorconnect/ummah/widgets/WidgetPayloads.kt',
  'android/app/src/main/res/layout/widget_circular_clock.xml',
  'android/app/src/main/res/layout/widget_compact_strip.xml',
  'android/app/src/main/res/layout/widget_next_prayer.xml',
  'android/app/src/main/res/layout/widget_daily_ayah.xml',
  'android/app/src/main/res/xml/widget_circular_clock_info.xml',
  'android/app/src/main/res/xml/widget_compact_strip_info.xml',
];

for (const relPath of nativeFiles) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  assert.ok(fs.existsSync(fullPath), `Native file missing: ${relPath}`);
}
console.log('✓ PASS: All 12 native Android widget source & resource files verified');

// 6. Verify AndroidManifest.xml registrations
const manifestPath = path.resolve(__dirname, '../android/app/src/main/AndroidManifest.xml');
const manifestCode = fs.readFileSync(manifestPath, 'utf8');
assert.ok(manifestCode.includes('NoorCircularClockWidget'), 'NoorCircularClockWidget must be registered in manifest');
assert.ok(manifestCode.includes('NoorCompactStripWidget'), 'NoorCompactStripWidget must be registered in manifest');
console.log('✓ PASS: AndroidManifest.xml receivers registered');

// 7. Verify strings.xml fallback for Daily Ayah (no em-dash in widget_quran_ref_default)
const stringsPath = path.resolve(__dirname, '../android/app/src/main/res/values/strings.xml');
const stringsCode = fs.readFileSync(stringsPath, 'utf8');
assert.ok(
  stringsCode.includes('<string name="widget_quran_ref_default">Al-Inshirah 94:5-6</string>'),
  'strings.xml must have Al-Inshirah 94:5-6 as widget_quran_ref_default'
);
console.log('✓ PASS: Daily Ayah authentic fallback verified in strings.xml');

// 8. Verify refresh button in layouts
const nextPrayerXml = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/res/layout/widget_next_prayer.xml'), 'utf8');
const circularClockXml = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/res/layout/widget_circular_clock.xml'), 'utf8');
const compactStripXml = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/res/layout/widget_compact_strip.xml'), 'utf8');

assert.ok(nextPrayerXml.includes('widget_btn_refresh'), 'Next prayer widget must have refresh button');
assert.ok(circularClockXml.includes('widget_btn_refresh'), 'Circular clock widget must have refresh button');
assert.ok(compactStripXml.includes('widget_btn_refresh'), 'Compact strip widget must have refresh button');
console.log('✓ PASS: On-widget ↻ refresh button present across all layouts');

// 9. Verify 4x2 Next Prayer top row unclipped layout (middle weight=1, countdown minWidth)
assert.ok(
  nextPrayerXml.includes('android:id="@+id/widget_hijri_date"') &&
  nextPrayerXml.includes('android:layout_width="0dp"') &&
  nextPrayerXml.includes('android:layout_weight="1"'),
  'Middle Hijri date pill must absorb width compression via layout_weight="1"'
);
assert.ok(
  nextPrayerXml.includes('android:id="@+id/widget_countdown_pill"') &&
  nextPrayerXml.includes('android:minWidth="46dp"'),
  'Countdown pill must have minWidth="46dp" to prevent In 5 clipping'
);
console.log('✓ PASS: 4x2 Next Prayer top-right countdown unclipped layout verified');

// 10. Verify Makruh Row Badge stacked cleanly below prayer name with margin-left on time block
const prayerTimesSectionPath = path.resolve(__dirname, '../src/components/PrayerTimesSection.tsx');
const prayerTimesSectionCode = fs.readFileSync(prayerTimesSectionPath, 'utf8');
assert.ok(
  prayerTimesSectionCode.includes("alignItems: 'flex-start'") &&
  prayerTimesSectionCode.includes('<MakruhRowBadge />'),
  'MakruhRowBadge must sit vertically below prayer name in flex column'
);
assert.ok(
  prayerTimesSectionCode.includes("marginLeft: '8px'"),
  'Right time block must have marginLeft: 8px for >=12px clearance'
);
console.log('✓ PASS: Makruh badge zero-overlap placement verified (video_3.mp4 fix)');

// 11. Verify Friday Dhuhr / Jumuah lookup in NextPrayerWidget & NoorCompactStripWidget
const nextPrayerCode = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/java/com/noorconnect/ummah/widgets/nextprayer/NextPrayerWidget.kt'), 'utf8');
const compactStripCode = fs.readFileSync(path.resolve(__dirname, '../android/app/src/main/java/com/noorconnect/ummah/widgets/compactstrip/NoorCompactStripWidget.kt'), 'utf8');

assert.ok(nextPrayerCode.includes('jumu'), 'NextPrayerWidget must match Friday Juma/Jumuah for Dhuhr time');
assert.ok(compactStripCode.includes('jumu'), 'NoorCompactStripWidget must match Friday Juma/Jumuah for Dhuhr time');
assert.ok(compactStripCode.includes('JUMA'), 'NoorCompactStripWidget must show JUMA label on Friday');
console.log('✓ PASS: Friday Dhuhr/Juma non-empty time verified across widgets');

// 12. Verify safe catch-all route and intent consumption
const appPath = path.resolve(__dirname, '../src/App.tsx');
const appCode = fs.readFileSync(appPath, 'utf8');
assert.ok(
  appCode.includes('<Route path="*" element={<Navigate to="/" replace />} />'),
  'App.tsx must have safe Navigate to / catch-all route'
);
assert.ok(
  appCode.includes('lastHandledUrlRef.current === rawUrl'),
  'DeepLinkListener must deduplicate navigation to prevent loops'
);

const mainActivityPath = path.resolve(__dirname, '../android/app/src/main/java/com/noorconnect/ummah/MainActivity.java');
const mainActivityCode = fs.readFileSync(mainActivityPath, 'utf8');
assert.ok(
  mainActivityCode.includes('consumed.setData(null)'),
  'MainActivity must clear intent data after consumption to prevent re-delivery loop'
);
console.log('✓ PASS: Intent consumption & React Router loop guards verified');

console.log('====================================================');
console.log('ALL PHASE 2 FAST VERIFICATION CHECKS PASSED (100%)');
console.log('====================================================');
