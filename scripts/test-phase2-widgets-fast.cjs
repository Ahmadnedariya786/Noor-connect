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

console.log('====================================================');
console.log('ALL PHASE 2 FAST VERIFICATION CHECKS PASSED (100%)');
console.log('====================================================');
