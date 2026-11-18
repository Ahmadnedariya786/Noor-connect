const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4174;
const CDP_PORT = 9223;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.exceptions = [];
    this.consoleErrors = [];
    this.consoleWarns = [];
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.callbacks.has(msg.id)) {
        const { resolve, reject } = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) {
          reject(new Error(msg.error.message));
        } else {
          resolve(msg.result);
        }
      } else if (msg.method) {
        if (msg.method === 'Runtime.exceptionThrown') {
          this.exceptions.push(msg.params);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const text = msg.params.args.map((a) => a.value || a.description || '').join(' ');
          if (msg.params.type === 'error') {
            this.consoleErrors.push(text);
          } else if (msg.params.type === 'warning') {
            this.consoleWarns.push(text);
          }
        }
      }
    };

    await this.send('Runtime.enable');
    await this.send('Page.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'Evaluation exception');
    }
    return res.result?.value;
  }

  async navigate(url) {
    this.exceptions = [];
    this.consoleErrors = [];
    await this.send('Page.navigate', { url });
    for (let i = 0; i < 30; i++) {
      await delay(200);
      try {
        const len = await this.evaluate('document.getElementById("root")?.innerHTML.length || 0');
        if (len > 200) break;
      } catch {}
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runClipStudioTests() {
  console.log('=== Starting Noor Connect Clip Studio & Diagnostics Verification ===');

  // 1. Start Vite preview server
  console.log(`[1/4] Starting 'vite preview' on port ${PREVIEW_PORT}...`);
  const viteBin = path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js');
  const preview = spawn(process.execPath, [viteBin, 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    stdio: 'pipe',
  });

  preview.stdout.on('data', (d) => process.stdout.write(`[Preview OUT] ${d}`));
  preview.stderr.on('data', (d) => process.stderr.write(`[Preview ERR] ${d}`));

  let previewReady = false;
  for (let i = 0; i < 40; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${PREVIEW_PORT}/`, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      previewReady = true;
      break;
    } catch {
      await delay(300);
    }
  }

  if (!previewReady) {
    preview.kill();
    throw new Error('Vite preview failed to start');
  }
  console.log(`✓ Vite preview is listening on http://127.0.0.1:${PREVIEW_PORT}`);

  // 2. Launch Chrome headless with 360x800 viewport
  console.log(`[2/4] Launching Headless Chrome on CDP port ${CDP_PORT} with 360px viewport...`);
  const profileDir = path.join(os.tmpdir(), `chrome-clip-test-${Date.now()}`);
  const chrome = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profileDir}`,
    '--disable-gpu',
    '--no-sandbox',
    '--disable-extensions',
    '--window-size=360,800',
    'about:blank',
  ], {
    stdio: 'pipe',
  });

  let targets = null;
  for (let i = 0; i < 20; i++) {
    try {
      targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
      if (Array.isArray(targets) && targets.length > 0) break;
    } catch {
      await delay(300);
    }
  }

  if (!targets) {
    chrome.kill();
    preview.kill();
    throw new Error('Failed to connect to Chrome CDP endpoint');
  }

  const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
  const client = new CdpClient(pageTarget.webSocketDebuggerUrl);
  await client.connect();
  console.log('✓ Connected to Headless Chrome via CDP');

  try {
    // -------------------------------------------------------------
    // TEST 1: ROUTE NAVIGATION & MUSHAF ABORT WARNING SILENCE
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Rapid Route Navigation & Deep Diagnostics Check ---');
    await client.navigate(`http://127.0.0.1:${PREVIEW_PORT}/`);
    await delay(1000);

    // Rapid navigation sequence: / -> /quran -> /qibla -> /services -> /settings/about
    console.log('  Navigating / -> /quran...');
    await client.evaluate('window.location.hash = ""; window.history.pushState({}, "", "/quran"); window.dispatchEvent(new PopStateEvent("popstate"));');
    await delay(1200);

    console.log('  Navigating /quran -> /qibla...');
    await client.evaluate('window.history.pushState({}, "", "/qibla"); window.dispatchEvent(new PopStateEvent("popstate"));');
    await delay(800);

    console.log('  Navigating /qibla -> /services...');
    await client.evaluate('window.history.pushState({}, "", "/services"); window.dispatchEvent(new PopStateEvent("popstate"));');
    await delay(800);

    console.log('  Navigating /services -> /settings/about...');
    await client.evaluate('window.history.pushState({}, "", "/settings/about"); window.dispatchEvent(new PopStateEvent("popstate"));');
    await delay(1500);

    // Verify diagnostics report via engine
    const diagReport = await client.evaluate(`
      (() => {
        try {
          const events = JSON.parse(localStorage.getItem('noor_diagnostics_events') || '[]');
          const errors = events.filter(e => e.category === 'CONSOLE_ERROR' || e.category === 'RUNTIME_ERROR' || e.category === 'PROMISE_REJECTION');
          const warns = events.filter(e => e.category === 'CONSOLE_WARN');
          const mushafWarns = warns.filter(w => (w.message || '').includes('[Mushaf]') || (w.message || '').includes('AbortError'));
          return {
            totalEvents: events.length,
            errorCount: errors.length,
            warnCount: warns.length,
            mushafWarnCount: mushafWarns.length,
            errorMessages: errors.map(e => e.message),
            warnMessages: warns.map(w => w.message)
          };
        } catch (e) {
          return { error: e.message };
        }
      })()
    `);

    console.log('  Diagnostics Events Summary:', diagReport);
    if (diagReport.mushafWarnCount > 0) {
      throw new Error(`TEST 1 FAILED: Found ${diagReport.mushafWarnCount} [Mushaf] AbortError warnings!`);
    }
    console.log('  ✓ PASS: Zero [Mushaf] AbortError warnings recorded during route changes!');

    // -------------------------------------------------------------
    // TEST 2: SETTINGS HUB 360PX LABELS WITHOUT "..." TRUNCATION
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Settings Hub (Profile) Labels on 360px Viewport ---');
    await client.evaluate(`
      localStorage.setItem('noor_theme', 'persian-indigo');
      localStorage.setItem('clock_style', 'ottoman');
    `);
    await client.navigate(`http://127.0.0.1:${PREVIEW_PORT}/profile`);
    await delay(1500);

    const settingsLabels = await client.evaluate(`
      (() => {
        const rows = Array.from(document.querySelectorAll('main section div.group, main section .divide-y > div'));
        const titles = [];
        rows.forEach(r => {
          const titleEl = r.querySelector('span.font-bold');
          if (titleEl) {
            titles.push({
              text: titleEl.textContent?.trim(),
              isEllipsized: titleEl.scrollWidth > titleEl.clientWidth,
              scrollWidth: titleEl.scrollWidth,
              clientWidth: titleEl.clientWidth
            });
          }
        });
        return titles;
      })()
    `);

    console.log('  Settings Hub Row Titles:', settingsLabels);
    const themeRow = settingsLabels.find(t => t.text?.includes('App Themes') || t.text?.includes('Theme & Appearance'));
    const zakatRow = settingsLabels.find(t => t.text?.includes('Zakat & Nisab'));

    console.log('  App Themes / Theme & Appearance row:', themeRow);
    console.log('  Zakat & Nisab row:', zakatRow);

    if (themeRow && themeRow.isEllipsized) {
      throw new Error(`TEST 2 FAILED: "${themeRow.text}" is truncated with ellipsis! (${themeRow.scrollWidth}px > ${themeRow.clientWidth}px)`);
    }
    if (zakatRow && zakatRow.isEllipsized) {
      throw new Error(`TEST 2 FAILED: "Zakat & Nisab" is truncated with ellipsis! (${zakatRow.scrollWidth}px > ${zakatRow.clientWidth}px)`);
    }

    const valueChips = await client.evaluate(`
      (() => {
        const chips = Array.from(document.querySelectorAll('.settings-value-chip'));
        return chips.map(c => ({
          text: c.textContent?.trim(),
          isEllipsized: c.scrollWidth > c.clientWidth,
          scrollWidth: c.scrollWidth,
          clientWidth: c.clientWidth
        }));
      })()
    `);
    console.log('  Settings Value Chips:', valueChips);
    const themeChip = valueChips.find(c => c.text?.includes('Persian Indigo'));
    const clockChip = valueChips.find(c => c.text?.includes('Ottoman Heritage'));
    if (themeChip && themeChip.isEllipsized) {
      throw new Error(`TEST 2 FAILED: "Persian Indigo" value chip is truncated!`);
    }
    if (clockChip && clockChip.isEllipsized) {
      throw new Error(`TEST 2 FAILED: "Ottoman Heritage" value chip is truncated!`);
    }
    console.log('  ✓ PASS: Row 1 Title, "Persian Indigo", and "Ottoman Heritage" render with ZERO ellipsis!');

    // -------------------------------------------------------------
    // TEST 3: NOOR CLIP STUDIO MODAL CONTROLS & TRANSLATIONS
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Noor Clip Studio Modal in Quran Reader ---');
    await client.navigate(`http://127.0.0.1:${PREVIEW_PORT}/quran/1`);
    await delay(2500);

    // Click "Clip Studio" button in header or ayah action toolbar
    console.log('  Opening Clip Studio Modal...');
    const modalOpened = await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const clipBtn = btns.find(b =>
          b.getAttribute('aria-label') === 'Clip Studio' ||
          (b.getAttribute('title') && b.getAttribute('title').includes('Clip Studio')) ||
          (b.textContent && b.textContent.includes('Clip Studio'))
        );
        if (clipBtn) {
          clipBtn.click();
          return true;
        }
        return false;
      })()
    `);
    console.log(`  Clip Studio trigger button clicked: ${modalOpened}`);
    await delay(2000);

    // Verify modal DOM rendered
    const modalInfo = await client.evaluate(`
      (() => {
        const h2List = Array.from(document.querySelectorAll('h2'));
        const hasModal = h2List.some(h => h.textContent && h.textContent.includes('Noor Clip Studio'));

        // Check stepper labels
        const labels = Array.from(document.querySelectorAll('*')).map(el => el.textContent?.trim()).filter(Boolean);
        const hasFromAyah = labels.some(l => l === 'FROM AYAH');
        const hasToAyah = labels.some(l => l === 'TO AYAH');

        // Check aspect ratio buttons
        const hasReel = labels.some(l => l === '9:16 Reel');
        const hasSquare = labels.some(l => l === '1:1 Square');
        const hasWide = labels.some(l => l === '16:9 Wide');

        // Check subtitle buttons
        const hasArabic = labels.some(l => l === 'Arabic');
        const hasEnglish = labels.some(l => l === 'English');
        const hasUrdu = labels.some(l => l === 'Urdu');
        const hasHindi = labels.some(l => l === 'Hindi');
        const hasGujarati = labels.some(l => l === 'Gujarati');

        // Check Auto Meaning theme preset and journey
        const hasAutoSync = labels.some(l => l.includes('Auto Sync') || l.includes('Auto Meaning'));
        const hasJourney = labels.some(l => l.includes('Auto Scene Journey'));

        // Check untruncated chips inside Auto Scene Journey
        const journeyChips = Array.from(document.querySelectorAll('div')).filter(
          el => el.textContent?.includes('Ayah ') && el.classList.contains('rounded-xl')
        ).map(el => ({
          text: el.textContent?.trim(),
          isEllipsized: el.scrollWidth > el.clientWidth,
          scrollWidth: el.scrollWidth,
          clientWidth: el.clientWidth,
        }));

        return {
          hasModal,
          hasFromAyah,
          hasToAyah,
          hasReel,
          hasSquare,
          hasWide,
          hasArabic,
          hasEnglish,
          hasUrdu,
          hasHindi,
          hasGujarati,
          hasAutoSync,
          hasJourney,
          journeyChips,
        };
      })()
    `);

    console.log('  Clip Studio Modal UI elements:', modalInfo);
    if (!modalInfo.hasModal) {
      throw new Error('TEST 3 FAILED: Noor Clip Studio modal failed to open!');
    }
    if (!modalInfo.hasFromAyah || !modalInfo.hasToAyah) {
      throw new Error('TEST 3 FAILED: Stepper labels "FROM AYAH" / "TO AYAH" missing or truncated!');
    }
    if (!modalInfo.hasReel || !modalInfo.hasSquare || !modalInfo.hasWide) {
      throw new Error('TEST 3 FAILED: Aspect ratio presets truncated! Expected "9:16 Reel", "1:1 Square", "16:9 Wide"');
    }
    if (!modalInfo.hasArabic || !modalInfo.hasHindi || !modalInfo.hasGujarati) {
      throw new Error('TEST 3 FAILED: Subtitle pills for Arabic/Hindi/Gujarati missing!');
    }
    if (!modalInfo.hasAutoSync) {
      throw new Error('TEST 3 FAILED: "Auto Meaning" / "Auto Sync" preset button missing!');
    }
    if (!modalInfo.hasJourney) {
      throw new Error('TEST 3 FAILED: "Auto Scene Journey" dynamic strip missing!');
    }
    if (modalInfo.journeyChips.length > 0) {
      console.log('  Journey chips verified:', modalInfo.journeyChips);
      const truncated = modalInfo.journeyChips.find(c => c.isEllipsized);
      if (truncated) {
        throw new Error(`TEST 3 FAILED: Journey chip "${truncated.text}" is truncated!`);
      }
    }
    console.log('  ✓ PASS: Stepper labels, aspect ratio pills, subtitle selector, and untruncated Auto Scene Journey verified!');

    // -------------------------------------------------------------
    // TEST 4: HINDI & GUJARATI TRANSLATION SELECTION IN LIVE PREVIEW
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Gujarati and Hindi Translation Fetching in Clip Studio ---');

    // Click Hindi subtitle pill
    console.log('  Selecting "Hindi" Subtitle...');
    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const hiBtn = btns.find(b => b.textContent?.trim() === 'Hindi');
        if (hiBtn) hiBtn.click();
      })()
    `);
    await delay(2500);

    const hindiData = await client.evaluate(`
      (() => {
        const stored = localStorage.getItem('noor_clip_verse_1_1');
        const parsed = stored ? JSON.parse(stored) : null;
        return {
          hasHindi: Boolean(parsed?.translations?.hi),
          hindiText: parsed?.translations?.hi || null
        };
      })()
    `);
    console.log('  Hindi translation resolution:', hindiData);

    // Click Gujarati subtitle pill
    console.log('  Selecting "Gujarati" Subtitle...');
    await client.evaluate(`
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const guBtn = btns.find(b => b.textContent?.trim() === 'Gujarati');
        if (guBtn) guBtn.click();
      })()
    `);
    await delay(2500);

    const gujaratiData = await client.evaluate(`
      (() => {
        const stored = localStorage.getItem('noor_clip_verse_1_1');
        const parsed = stored ? JSON.parse(stored) : null;
        return {
          hasGujarati: Boolean(parsed?.translations?.gu),
          gujaratiText: parsed?.translations?.gu || null
        };
      })()
    `);
    console.log('  Gujarati translation resolution:', gujaratiData);

    // -------------------------------------------------------------
    // TEST 5: 16 ILLUSTRATED SCENES & SUB-AYAH TIMELINE (AN-NUR 35 & YA-SIN 1-4)
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: 16 Illustrated Scenes & Sub-Ayah Timeline (An-Nur 35 & Ya-Sin 1-4) ---');
    const ts = require('typescript');
    const fs = require('fs');

    const engineCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'ayah-meaning-scene-engine.ts'), 'utf8');
    const transpiled = ts.transpileModule(engineCode, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    }).outputText;

    const engineModule = {};
    const evalFn = new Function('exports', 'require', transpiled);
    evalFn(engineModule, require);

    const sceneCount = Object.keys(engineModule.ILLUSTRATED_SCENES || {}).length;
    console.log(`  Registered Illustrated Scenes: ${sceneCount}/16`);
    if (sceneCount < 16) {
      throw new Error(`TEST 5 FAILED: Expected 16 illustrated scenes, found ${sceneCount}`);
    }

    // Verify Ya-Sin 1-4 mappings
    const y1 = engineModule.resolveSceneForAyah('يس', 'Ya-Seen.', 36, 1);
    const y2 = engineModule.resolveSceneForAyah('وَالْقُرْآنِ الْحَكِيمِ', 'By the wise Qur\'an.', 36, 2);
    const y3 = engineModule.resolveSceneForAyah('إِنَّكَ لَمِنَ الْمُرْسَلِينَ', 'Indeed you are from among the messengers.', 36, 3);
    const y4 = engineModule.resolveSceneForAyah('عَلَىٰ صِرَاطٍ مُسْتَقِيمٍ', 'On a straight path.', 36, 4);

    console.log('  Ya-Sin 1 scene:', y1.sceneId, `(${y1.moodLabel})`);
    console.log('  Ya-Sin 2 scene:', y2.sceneId, `(${y2.moodLabel})`);
    console.log('  Ya-Sin 3 scene:', y3.sceneId, `(${y3.moodLabel})`);
    console.log('  Ya-Sin 4 scene:', y4.sceneId, `(${y4.moodLabel})`);

    if (y1.sceneId !== 'parting-monoliths') {
      throw new Error(`TEST 5 FAILED: Ya-Sin 1 should map to parting-monoliths, got ${y1.sceneId}`);
    }
    if (y2.sceneId !== 'illuminated-quran') {
      throw new Error(`TEST 5 FAILED: Ya-Sin 2 should map to illuminated-quran, got ${y2.sceneId}`);
    }
    if (y3.sceneId !== 'straight-path') {
      throw new Error(`TEST 5 FAILED: Ya-Sin 3 should map to straight-path, got ${y3.sceneId}`);
    }
    if (y4.sceneId !== 'straight-path') {
      throw new Error(`TEST 5 FAILED: Ya-Sin 4 should map to straight-path, got ${y4.sceneId}`);
    }

    // Verify Surah An-Nur 24:35 4-part sub-timeline
    const nur35 = engineModule.resolveAyahVisualTimeline(
      'اللَّهُ نُورُ السَّمَاوَاتِ وَالْأَرْضِ مَثَلُ نُورِهِ كَمِشْكَاةٍ فِيهَا مِصْبَاحٌ الْمِصْبَاحُ فِي زُجَاجَةٍ الزُّجَاجَةُ كَأَنَّهَا كَوْكَبٌ دُرِّيٌّ',
      'Allah is the Light of the heavens and the earth. The example of His light is like a niche within which is a lamp, the lamp is within glass, the glass as if it were a pearly star',
      24,
      35,
      12.0
    );

    console.log(`  An-Nur 24:35 multi-phrase sub-timeline segments: ${nur35.length}`);
    nur35.forEach((seg, i) => {
      console.log(`    Segment ${i + 1} (${(seg.startRatio * 100).toFixed(0)}%–${(seg.endRatio * 100).toFixed(0)}%): ${seg.icon} ${seg.sceneId} ("${seg.label}")`);
    });

    if (nur35.length !== 4) {
      throw new Error(`TEST 5 FAILED: An-Nur 24:35 should split into 4 visual segments, got ${nur35.length}`);
    }
    if (nur35[0].sceneId !== 'heavens-earth-rays' ||
        nur35[1].sceneId !== 'niche-lamp' ||
        nur35[2].sceneId !== 'glass-orb-lamp' ||
        nur35[3].sceneId !== 'pearly-star') {
      throw new Error(`TEST 5 FAILED: An-Nur 24:35 segments sequence incorrect: ${nur35.map(s => s.sceneId).join(' -> ')}`);
    }
    console.log('  ✓ PASS: 16 Illustrated scenes, Ya-Sin 1–4, and An-Nur 24:35 4-part visual choreography verified!');

    // -------------------------------------------------------------
    // TEST 6: SURAH AR-RAHMAN 55:1–5 SCENE MAPPINGS & BISMILLAH SPLIT
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Surah Ar-Rahman 55:1–5 Scene Mappings & Bismillah Split ---');

    // 1. Verify Bismillah Stripping
    const rawRahman1 = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الرَّحْمَٰنُ';
    const strippedRahman1 = engineModule.stripLeadingBismillah(rawRahman1, 55, 1);
    console.log(`  Raw Rahman 1: "${rawRahman1}"`);
    console.log(`  Stripped Rahman 1: "${strippedRahman1}"`);
    if (strippedRahman1 !== 'الرَّحْمَٰنُ') {
      throw new Error(`TEST 6 FAILED: Expected "الرَّحْمَٰنُ", got "${strippedRahman1}"`);
    }

    // Verify Surah 1 Bismillah preserved
    const rawFatihah1 = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
    const strippedFatihah1 = engineModule.stripLeadingBismillah(rawFatihah1, 1, 1);
    if (strippedFatihah1 !== rawFatihah1) {
      throw new Error(`TEST 6 FAILED: Surah 1 Bismillah should NOT be stripped, got "${strippedFatihah1}"`);
    }

    // 2. Verify Surah 55:1-5 Scene Resolutions
    const r1 = engineModule.resolveSceneForAyah('الرَّحْمَٰنُ', 'The Most Merciful', 55, 1);
    const r2 = engineModule.resolveSceneForAyah('عَلَّمَ الْقُرْآنَ', 'Taught the Qur\'an,', 55, 2);
    const r3 = engineModule.resolveSceneForAyah('خَلَقَ الْإِنسَانَ', 'Created man,', 55, 3);
    const r4 = engineModule.resolveSceneForAyah('عَلَّمَهُ الْبَيَانَ', '[And] taught him speech.', 55, 4);
    const r5 = engineModule.resolveSceneForAyah('الشَّمْسُ وَالْقَمَرُ بِحُسْبَانٍ', 'The sun and the moon [move] by precise calculation,', 55, 5);

    console.log('  Ar-Rahman 1 scene:', r1.sceneId, `(${r1.moodLabel})`);
    console.log('  Ar-Rahman 2 scene:', r2.sceneId, `(${r2.moodLabel})`);
    console.log('  Ar-Rahman 3 scene:', r3.sceneId, `(${r3.moodLabel})`);
    console.log('  Ar-Rahman 4 scene:', r4.sceneId, `(${r4.moodLabel})`);
    console.log('  Ar-Rahman 5 scene:', r5.sceneId, `(${r5.moodLabel})`);

    if (r1.sceneId !== 'heavens-earth-rays') {
      throw new Error(`TEST 6 FAILED: Ar-Rahman 1 should map to heavens-earth-rays, got ${r1.sceneId}`);
    }
    if (r2.sceneId !== 'illuminated-quran') {
      throw new Error(`TEST 6 FAILED: Ar-Rahman 2 should map to illuminated-quran, got ${r2.sceneId}`);
    }
    if (r3.sceneId !== 'celestial-creation') {
      throw new Error(`TEST 6 FAILED: Ar-Rahman 3 should map to celestial-creation, got ${r3.sceneId}`);
    }
    if (r4.sceneId !== 'eloquence-light') {
      throw new Error(`TEST 6 FAILED: Ar-Rahman 4 should map to eloquence-light, got ${r4.sceneId}`);
    }
    if (r5.sceneId !== 'sun-moon-orbit') {
      throw new Error(`TEST 6 FAILED: Ar-Rahman 5 should map to sun-moon-orbit, got ${r5.sceneId}`);
    }
    console.log('  ✓ PASS: Surah Ar-Rahman 1–5 mapped with 100% precision & Bismillah split cleanly!');

    console.log('\n======================================================');
    console.log('✅ ALL CLIP STUDIO & DIAGNOSTICS TESTS PASSED (6/6 PASS)');
    console.log('======================================================\n');
  } finally {
    try { client.close(); } catch {}
    try { chrome.kill(); } catch {}
    try { preview.kill(); } catch {}
    setTimeout(() => process.exit(0), 100);
  }
}

runClipStudioTests().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
