const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4178;
const CDP_PORT = 9228;

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
        const cb = this.callbacks.get(msg.id);
        this.callbacks.delete(msg.id);
        if (msg.error) cb.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else cb.resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
        if (msg.method === 'Runtime.exceptionThrown') {
          this.exceptions.push(msg.params);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          const type = msg.params.type;
          const text = (msg.params.args || []).map((a) => a.value || a.description || '').join(' ');
          if (type === 'error') {
            this.consoleErrors.push(text);
          } else if (type === 'warning') {
            this.consoleWarns.push(text);
          }
        }
      }
    };
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(`Eval error: ${res.exceptionDetails.text || JSON.stringify(res.exceptionDetails)}`);
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
    }
  }
}

async function startVitePreview() {
  const child = spawn('cmd.exe', ['/c', 'npx', 'vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
  });

  child.stdout.on('data', (d) => process.stdout.write(`[preview stdout] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[preview stderr] ${d}`));

  for (let i = 0; i < 40; i++) {
    await delay(500);
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${PREVIEW_PORT}/`, (res) => {
          if (res.statusCode === 200) resolve(true);
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
      });
      console.log(`[Preview Server Ready on port ${PREVIEW_PORT}]`);
      return child;
    } catch {}
  }
  throw new Error('Vite preview server failed to start within 20s');
}

async function startHeadlessChrome() {
  const tempProfile = path.join(os.tmpdir(), `chrome-test-nav-${Date.now()}`);
  fs.mkdirSync(tempProfile, { recursive: true });

  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${tempProfile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--window-size=360,800',
    '--disable-gpu',
    'about:blank',
  ]);

  for (let i = 0; i < 30; i++) {
    await delay(300);
    try {
      const version = await fetchJson(`http://localhost:${CDP_PORT}/json/version`);
      if (version && version.webSocketDebuggerUrl) {
        console.log(`[Chrome CDP Ready on port ${CDP_PORT}]`);
        return { chromeProc, tempProfile };
      }
    } catch {}
  }
  throw new Error('Chrome CDP failed to start within 9s');
}

async function run() {
  console.log('=== NOOR CONNECT: NAVBAR OVERRIDE & THEME-ADAPTIVE VERIFICATION SUITE ===');
  let previewProc = null;
  let chromeObj = null;
  let client = null;

  try {
    previewProc = await startVitePreview();
    chromeObj = await startHeadlessChrome();

    const targets = await fetchJson(`http://localhost:${CDP_PORT}/json`);
    const pageTarget = targets.find((t) => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found in Chrome CDP');

    client = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();

    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 2,
      mobile: true,
      fitWindow: false,
    });

    console.log(`Navigating to http://localhost:${PREVIEW_PORT}/...`);
    await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/` });
    await delay(3000);

    // Ensure clean initial state (override disabled)
    await client.eval(`
      (() => {
        localStorage.removeItem('noor_navbar_override_enabled_v1');
        localStorage.removeItem('noor_navbar_override_style_v1');
      })()
    `);

    // --------------------------------------------------------------------------
    // PART 1: Verify all 8 themes in Auto mode (matches theme)
    // --------------------------------------------------------------------------
    const THEME_TESTS = [
      { themeId: 'oxford-gold', expectedVariant: 'spotlight-beam', name: 'Oxford Gold' },
      { themeId: 'kiswah-noir', expectedVariant: 'morph-capsule', name: 'Haramain Noir' },
      { themeId: 'imperial-violet', expectedVariant: 'elevated-orb', name: 'Imperial Violet' },
      { themeId: 'burgundy-velvet', expectedVariant: 'satin-well', name: 'Burgundy Velvet' },
      { themeId: 'desert-scroll', expectedVariant: 'split-islands', name: 'Desert Scroll' },
      { themeId: 'istanbul-sapphire', expectedVariant: 'laser-horizon', name: 'Royal Sapphire' },
      { themeId: 'madinah-emerald', expectedVariant: 'mihrab-arch', name: 'Madinah Emerald' },
      { themeId: 'persian-indigo', expectedVariant: 'celestial-orbit', name: 'Persian Indigo' },
    ];

    let passedThemes = 0;
    for (const test of THEME_TESTS) {
      console.log(`\n--- [Auto Mode] Testing Theme: ${test.name} (${test.themeId}) -> Variant: ${test.expectedVariant} ---`);

      await client.eval(`
        (() => {
          localStorage.setItem('noor_theme', '${test.themeId}');
          document.documentElement.setAttribute('data-theme', '${test.themeId}');
          window.dispatchEvent(new CustomEvent('noor-theme-changed', { detail: '${test.themeId}' }));
        })()
      `);

      await delay(300);

      const audit = await client.eval(`
        (() => {
          const nav = document.querySelector('nav[data-bottom-nav="true"]');
          if (!nav) return { error: 'nav not found' };
          return {
            variant: nav.getAttribute('data-navbar-variant'),
            scrollWidth: nav.scrollWidth,
            bodyWidth: document.body.scrollWidth,
          };
        })()
      `);

      if (audit.variant !== test.expectedVariant) {
        throw new Error(`Auto variant mismatch for ${test.themeId}: got ${audit.variant}, expected ${test.expectedVariant}`);
      }
      if (audit.scrollWidth > 360 || audit.bodyWidth > 360) {
        throw new Error(`Width budget exceeded on ${test.themeId}: nav=${audit.scrollWidth}, body=${audit.bodyWidth}`);
      }

      passedThemes++;
      console.log(`  -> [PASS] ${test.name} -> ${audit.variant} (width: ${audit.navScrollWidth || 360}px)`);
    }

    // --------------------------------------------------------------------------
    // PART 2: Test Manual Lock & Persistence Across Theme Changes
    // --------------------------------------------------------------------------
    console.log(`\n--- PART 2: Testing Manual Lock & Persistence Across Theme Changes ---`);

    // 1. Lock to 'split-islands' while on 'oxford-gold'
    await client.eval(`
      (() => {
        localStorage.setItem('noor_theme', 'oxford-gold');
        document.documentElement.setAttribute('data-theme', 'oxford-gold');
        window.dispatchEvent(new CustomEvent('noor-theme-changed', { detail: 'oxford-gold' }));

        localStorage.setItem('noor_navbar_override_enabled_v1', 'true');
        localStorage.setItem('noor_navbar_override_style_v1', 'split-islands');
        window.dispatchEvent(new CustomEvent('noor-navbar-style-change', {
          detail: { enabled: true, style: 'split-islands' }
        }));
      })()
    `);
    await delay(300);

    const lockedAudit1 = await client.eval(`
      (() => {
        const nav = document.querySelector('nav[data-bottom-nav="true"]');
        return nav ? nav.getAttribute('data-navbar-variant') : null;
      })()
    `);
    console.log(`  Locked on Oxford Gold: variant = ${lockedAudit1} (expected: split-islands)`);
    if (lockedAudit1 !== 'split-islands') {
      throw new Error(`Failed to lock navbar to split-islands, got: ${lockedAudit1}`);
    }

    // 2. Switch theme to 'madinah-emerald' -> navbar MUST stay locked to 'split-islands'!
    await client.eval(`
      (() => {
        localStorage.setItem('noor_theme', 'madinah-emerald');
        document.documentElement.setAttribute('data-theme', 'madinah-emerald');
        window.dispatchEvent(new CustomEvent('noor-theme-changed', { detail: 'madinah-emerald' }));
      })()
    `);
    await delay(300);

    const lockedAudit2 = await client.eval(`
      (() => {
        const nav = document.querySelector('nav[data-bottom-nav="true"]');
        return {
          theme: document.documentElement.getAttribute('data-theme'),
          variant: nav ? nav.getAttribute('data-navbar-variant') : null,
          scrollWidth: nav ? nav.scrollWidth : 0,
        };
      })()
    `);
    console.log(`  Theme switched to Madinah Emerald: theme = ${lockedAudit2.theme}, variant = ${lockedAudit2.variant}`);
    if (lockedAudit2.variant !== 'split-islands') {
      throw new Error(`Navbar lost manual lock on theme switch! Got: ${lockedAudit2.variant}, expected: split-islands`);
    }
    console.log(`  -> [PASS] Manual lock persists across theme change!`);

    // 3. Navigate to /settings/app-theme and test "Reset to Auto" banner
    console.log(`\n--- PART 3: Testing "Reset to Auto" banner on SettingsThemePage ---`);
    await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/settings/app-theme` });
    await delay(1500);

    const bannerCheck = await client.eval(`
      (() => {
        const bannerText = document.body.innerText;
        const hasLockNotice = bannerText.includes('Navbar locked to Split Islands');
        const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Reset to Auto'));
        return { hasLockNotice, hasResetBtn: !!resetBtn };
      })()
    `);
    console.log(`  Banner rendered on /settings/app-theme:`, bannerCheck);
    if (!bannerCheck.hasLockNotice || !bannerCheck.hasResetBtn) {
      throw new Error(`Status banner missing on /settings/app-theme: ${JSON.stringify(bannerCheck)}`);
    }

    // Click "Reset to Auto" button
    await client.eval(`
      (() => {
        const resetBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Reset to Auto'));
        if (resetBtn) resetBtn.click();
      })()
    `);
    await delay(400);

    const resetAudit = await client.eval(`
      (() => {
        const nav = document.querySelector('nav[data-bottom-nav="true"]');
        return {
          overrideEnabled: localStorage.getItem('noor_navbar_override_enabled_v1'),
          variant: nav ? nav.getAttribute('data-navbar-variant') : null,
        };
      })()
    `);
    console.log(`  After Reset to Auto: overrideEnabled = ${resetAudit.overrideEnabled}, variant = ${resetAudit.variant} (expected: mihrab-arch)`);
    if (resetAudit.variant !== 'mihrab-arch') {
      throw new Error(`Navbar did not snap back to theme default mihrab-arch after Reset to Auto: got ${resetAudit.variant}`);
    }
    console.log(`  -> [PASS] Reset to Auto immediately snapped navbar to Madinah Emerald mihrab-arch!`);

    // --------------------------------------------------------------------------
    // PART 4: Test Settings > Theme & Appearance row and 8-style picker
    // --------------------------------------------------------------------------
    console.log(`\n--- PART 4: Testing Settings > Theme & Appearance Page ---`);
    await client.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/settings/appearance` });
    await delay(1500);

    const appearanceRowCheck = await client.eval(`
      (() => {
        const text = document.body.innerText;
        const hasTitle = text.includes('Navbar Style Override');
        const hasAutoSubtitle = text.includes('Auto (Matches Theme)');
        const switchEl = document.querySelector('#navbar-override-switch');
        return {
          hasTitle,
          hasAutoSubtitle,
          hasSwitch: !!switchEl,
          switchChecked: switchEl ? switchEl.getAttribute('aria-checked') === 'true' : false,
        };
      })()
    `);
    console.log(`  Appearance Row Check (OFF state):`, appearanceRowCheck);
    if (!appearanceRowCheck.hasTitle || !appearanceRowCheck.hasAutoSubtitle || !appearanceRowCheck.hasSwitch) {
      throw new Error(`Appearance row elements missing: ${JSON.stringify(appearanceRowCheck)}`);
    }

    // Toggle Switch ON
    console.log(`  Toggling Navbar Style Override ON...`);
    await client.eval(`
      (() => {
        const switchEl = document.querySelector('#navbar-override-switch');
        if (switchEl) switchEl.click();
      })()
    `);
    await delay(400);

    const pickerCheck = await client.eval(`
      (() => {
        const text = document.body.innerText;
        const hasLockedSubtitle = text.includes('Locked across all themes');
        const switchEl = document.querySelector('#navbar-override-switch');
        const isChecked = switchEl ? switchEl.getAttribute('aria-checked') === 'true' : false;

        // Check cards in the 8-style grid
        const allLabels = [
          'Spotlight Beam', 'Morph Capsule', 'Elevated Orb', 'Satin Jewel Well',
          'Split Islands', 'Laser Horizon', 'Mihrab Arch', 'Celestial Orbit'
        ];
        const foundLabels = allLabels.filter(lbl => text.includes(lbl));

        return {
          hasLockedSubtitle,
          isChecked,
          cardCount: foundLabels.length,
          allFound: foundLabels.length === 8,
        };
      })()
    `);
    console.log(`  Picker Check (ON state):`, pickerCheck);
    if (!pickerCheck.hasLockedSubtitle || !pickerCheck.isChecked || !pickerCheck.allFound) {
      throw new Error(`8-style picker did not expand with all 8 cards: ${JSON.stringify(pickerCheck)}`);
    }

    // Test clicking style cards and checking live morphing
    const STYLES_TO_CLICK = [
      { name: 'Celestial Orbit', variant: 'celestial-orbit' },
      { name: 'Elevated Orb', variant: 'elevated-orb' },
      { name: 'Morph Capsule', variant: 'morph-capsule' },
      { name: 'Laser Horizon', variant: 'laser-horizon' },
    ];

    for (const st of STYLES_TO_CLICK) {
      const clickRes = await client.eval(`
        (() => {
          const cards = Array.from(document.querySelectorAll('div[role="button"]'));
          const targetCard = cards.find(c => c.innerText.includes('${st.name}'));
          if (!targetCard) return { error: 'Card not found for ${st.name}' };
          targetCard.click();
          return { clicked: true };
        })()
      `);
      if (clickRes.error) throw new Error(clickRes.error);
      await delay(300);

      const liveVariant = await client.eval(`
        (() => {
          const nav = document.querySelector('nav[data-bottom-nav="true"]');
          return nav ? nav.getAttribute('data-navbar-variant') : null;
        })()
      `);
      console.log(`    Clicked card ${st.name} -> Live nav variant: ${liveVariant} (expected: ${st.variant})`);
      if (liveVariant !== st.variant) {
        throw new Error(`Live morph failed for ${st.name}: got ${liveVariant}, expected ${st.variant}`);
      }
    }

    // Toggle switch back OFF
    console.log(`  Toggling Navbar Style Override back OFF...`);
    await client.eval(`
      (() => {
        const switchEl = document.querySelector('#navbar-override-switch');
        if (switchEl) switchEl.click();
      })()
    `);
    await delay(400);

    const offAudit = await client.eval(`
      (() => {
        const nav = document.querySelector('nav[data-bottom-nav="true"]');
        return {
          switchChecked: document.querySelector('#navbar-override-switch')?.getAttribute('aria-checked'),
          variant: nav ? nav.getAttribute('data-navbar-variant') : null,
        };
      })()
    `);
    console.log(`  After Toggling OFF: switch = ${offAudit.switchChecked}, variant = ${offAudit.variant}`);
    if (offAudit.variant !== 'mihrab-arch') {
      throw new Error(`Navbar did not revert to theme default mihrab-arch on toggle OFF: got ${offAudit.variant}`);
    }
    console.log(`  -> [PASS] Toggle OFF immediately restored theme-matching dock!`);

    // --------------------------------------------------------------------------
    // PART 5: GPU Filter Audit on Navbar & Override Section
    // --------------------------------------------------------------------------
    const filterAudit = await client.eval(`
      (() => {
        const nav = document.querySelector('nav[data-bottom-nav="true"]');
        const overrideSection = document.querySelector('#navbar-override-switch')?.closest('.space-y-3');
        const elementsToCheck = [
          ...(nav ? [nav, ...nav.querySelectorAll('*')] : []),
          ...(overrideSection ? [overrideSection, ...overrideSection.querySelectorAll('*')] : [])
        ];

        let hasBackdropFilter = false;
        let hasDropShadow = false;
        let forbidden = null;

        for (const el of elementsToCheck) {
          const cs = window.getComputedStyle(el);
          const bf = cs.backdropFilter || cs.webkitBackdropFilter || '';
          const f = cs.filter || '';
          if (bf && bf !== 'none') {
            hasBackdropFilter = true;
            forbidden = el.tagName + ' (backdrop-filter: ' + bf + ')';
            break;
          }
          if (f && f.includes('drop-shadow')) {
            hasDropShadow = true;
            forbidden = el.tagName + ' (filter: ' + f + ')';
            break;
          }
        }
        return { hasBackdropFilter, hasDropShadow, forbidden, count: elementsToCheck.length };
      })()
    `);
    console.log(`\n  GPU Filter Audit on Navbar & Override Section:`, filterAudit);
    if (filterAudit.hasBackdropFilter || filterAudit.hasDropShadow) {
      throw new Error(`Forbidden filter found in navbar/override: ${filterAudit.forbidden}`);
    }

    // Filter out harmless non-actionable console errors (e.g., mock audio or missing favicon)
    const criticalErrors = client.consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('AudioContext') && !err.includes('audio')
    );

    console.log(`\n=== VERIFICATION SUMMARY ===`);
    console.log(`Themes Tested: ${passedThemes}/${THEME_TESTS.length} PASSED`);
    console.log(`Critical Console Errors: ${criticalErrors.length}`);
    console.log(`Page Exceptions: ${client.exceptions.length}`);

    if (criticalErrors.length > 0) {
      console.error('Console errors:', criticalErrors);
      throw new Error(`Encountered ${criticalErrors.length} critical console error(s)`);
    }

    if (client.exceptions.length > 0) {
      console.error('Page exceptions:', client.exceptions);
      throw new Error(`Encountered ${client.exceptions.length} unhandled page exception(s)`);
    }

    console.log('\n>>> ALL NAVBAR OVERRIDE & THEME-ADAPTIVE ARCHITECTURES VERIFIED: 100% PASS <<<');
    process.exit(0);
  } finally {
    if (client) client.close();
    if (chromeObj) {
      chromeObj.chromeProc.kill('SIGKILL');
      try {
        fs.rmSync(chromeObj.tempProfile, { recursive: true, force: true });
      } catch {}
    }
    if (previewProc) {
      previewProc.kill('SIGKILL');
    }
  }
}

run().catch((err) => {
  console.error('\nVerification FAILED:', err);
  process.exit(1);
});
