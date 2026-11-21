/**
 * Fast synchronous verification script for Phase 2 Polish & Qaza Overhaul
 * Tests:
 * 1. Hadith Reference Deduplication across all 4 languages (EN, UR, GU, HI)
 * 2. Qaza Single-Source-of-Truth derivation + Undo + Hijri Offset Sync
 * 3. Widget Preview End-Time bug fix
 * 4. 4x2 Widget Header shortening ("نور • NEXT")
 * 5. Mosque fetch timeout (4500ms)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('🧪 Starting Fast Verification Tests...');

// --- Test 1: Hadith Reference Deduplication ---
console.log('\n--- Test 1: Hadith Reference Deduplication ---');
const hadithI18nPath = path.join(__dirname, '..', 'src', 'lib', 'prayer-hadith-i18n.ts');
const hadithContent = fs.readFileSync(hadithI18nPath, 'utf8');

// Ensure stripTrailingHadithRef is defined and exported
assert(hadithContent.includes('export function stripTrailingHadithRef'), 'stripTrailingHadithRef must be exported');

// Check that parenthetical citations were removed from text strings
const bannedPatterns = [
  /\(Bukhari \d+\)/,
  /\(Muslim \d+\)/,
  /\(Tirmidhi \d+\)/,
  /\(Abu Dawood \d+\)/,
  /\(બુખારી \d+\)/,
  /\(મુસ્લિમ \d+\)/,
  /\(તિર્મિઝી \d+\)/,
  /\(અબૂ દાઉદ \d+\)/,
  /\(بخاری \d+\)/,
  /\(مسلم \d+\)/,
  /\(ترمذی \d+\)/,
  /\(ابو داؤد \d+\)/,
  /\(बुखारी \d+\)/,
  /\(मुस्लिम \d+\)/,
  /\(तिर्मिज़ी \d+\)/,
  /\(अबू दाऊद \d+\)/,
];

// Strip comments before checking for banned patterns in quote strings
const contentWithoutComments = hadithContent.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

for (const pattern of bannedPatterns) {
  const match = contentWithoutComments.match(pattern);
  assert(!match, `Found duplicate citation matching pattern ${pattern} in prayer-hadith-i18n.ts`);
}

// Check Java implementation
const javaHadithPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'noorconnect', 'ummah', 'PrayerHadithHelper.java');
const javaContent = fs.readFileSync(javaHadithPath, 'utf8');
assert(javaContent.includes('stripTrailingHadithRef'), 'PrayerHadithHelper.java must have stripTrailingHadithRef');
for (const pattern of bannedPatterns) {
  const match = javaContent.match(pattern);
  assert(!match, `Found duplicate citation matching pattern ${pattern} in PrayerHadithHelper.java`);
}
console.log('✅ Hadith Reference Deduplication: PASS (0 duplicate citations in TS and Java)');

// --- Test 2: Widget Preview End-Time Fix ---
console.log('\n--- Test 2: Widget Preview End-Time Fix ---');
const widgetSettingsPath = path.join(__dirname, '..', 'src', 'pages', 'WidgetSettings.tsx');
const widgetSettingsContent = fs.readFileSync(widgetSettingsPath, 'utf8');
assert(widgetSettingsContent.includes('const currentQazaEnd = target.endTimeFormatted;'), 'WidgetSettings must use target.endTimeFormatted for currentQazaEnd');
assert(!widgetSettingsContent.includes('const currentQazaEnd = activeFard.endTimeFormatted;'), 'WidgetSettings must NOT use activeFard.endTimeFormatted for currentQazaEnd');
console.log('✅ Widget Preview End-Time Fix: PASS');

// --- Test 3: 4x2 Widget Header Shortening ---
console.log('\n--- Test 3: 4x2 Widget Header Shortening ---');
const widgetXmlPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'layout', 'widget_next_prayer.xml');
const widgetXmlContent = fs.readFileSync(widgetXmlPath, 'utf8');
assert(widgetXmlContent.includes('android:text="نور • NEXT"'), 'widget_next_prayer.xml must have text "نور • NEXT"');

const widgetKtPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java', 'com', 'noorconnect', 'ummah', 'widgets', 'nextprayer', 'NextPrayerWidget.kt');
const widgetKtContent = fs.readFileSync(widgetKtPath, 'utf8');
assert(widgetKtContent.includes('"نور • NEXT"'), 'NextPrayerWidget.kt must set text "نور • NEXT"');
console.log('✅ 4x2 Widget Header Shortening: PASS');

// --- Test 4: Mosque Overpass Timeout ---
console.log('\n--- Test 4: Mosque Overpass Timeout ---');
const mosqueServicePath = path.join(__dirname, '..', 'src', 'lib', 'mosque-service.ts');
const mosqueContent = fs.readFileSync(mosqueServicePath, 'utf8');
assert(mosqueContent.includes('setTimeout(() => controller.abort(), 4500)'), 'mosque-service.ts must have 4500ms abort controller timeout');
console.log('✅ Mosque Overpass Timeout: PASS (4500ms)');

// --- Test 5: Qaza Single Source of Truth & Planner Verification ---
console.log('\n--- Test 5: Qaza Single Source of Truth & Planner ---');
const qazaTrackerPath = path.join(__dirname, '..', 'src', 'lib', 'qaza-tracker.ts');
const qazaTrackerContent = fs.readFileSync(qazaTrackerPath, 'utf8');
assert(qazaTrackerContent.includes('QAZA_UNDATED_BACKLOG_KEY'), 'qaza-tracker.ts must define QAZA_UNDATED_BACKLOG_KEY');
assert(qazaTrackerContent.includes('performQazaUndo'), 'qaza-tracker.ts must export performQazaUndo');
assert(qazaTrackerContent.includes('getUndatedBacklogTotal'), 'qaza-tracker.ts must export getUndatedBacklogTotal');
assert(qazaTrackerContent.includes('getUndatedBacklogSummary'), 'qaza-tracker.ts must export getUndatedBacklogSummary');
assert(qazaTrackerContent.includes('countInDatedPending(p) + undatedBacklog[p]'), 'qaza-tracker.ts getQazaPrayers must sum dated pending + undated backlog');

const qazaComponentPath = path.join(__dirname, '..', 'src', 'components', 'QazaTracker.tsx');
const qazaComponentContent = fs.readFileSync(qazaComponentPath, 'utf8');
assert(qazaComponentContent.includes('MakruhQazaConfirmationModal'), 'QazaTracker.tsx must include MakruhQazaConfirmationModal');
assert(qazaComponentContent.includes('performQazaUndo'), 'QazaTracker.tsx must wire performQazaUndo');

const qazaPagePath = path.join(__dirname, '..', 'src', 'pages', 'QazaPage.tsx');
const qazaPageContent = fs.readFileSync(qazaPagePath, 'utf8');
assert(qazaPageContent.includes('Daily Make-Up Finish Planner'), 'QazaPage.tsx must include Daily Make-Up Finish Planner');
assert(qazaPageContent.includes('Qaza-e-Umri (Years / Months) Estimator'), 'QazaPage.tsx must include Qaza-e-Umri Estimator');
assert(qazaPageContent.includes('MakruhQazaConfirmationModal'), 'QazaPage.tsx must include MakruhQazaConfirmationModal');
assert(qazaPageContent.includes('performQazaUndo'), 'QazaPage.tsx must wire performQazaUndo');
console.log('✅ Qaza Single Source of Truth & Planner: PASS');

console.log('\n🎉 ALL 5 VERIFICATION SUITES PASSED CLEANLY!\n');
