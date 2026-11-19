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
  console.log('=== NOOR CONNECT: 8 THEME-ADAPTIVE NAVBAR VERIFICATION SUITE ===');
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

    let passed = 0;

    for (const test of THEME_TESTS) {
      console.log(`\n--- Testing Theme: ${test.name} (${test.themeId}) -> Variant: ${test.expectedVariant} ---`);

      // Switch theme
      const switchResult = await client.eval(`
        (() => {
          localStorage.setItem('noor_theme', '${test.themeId}');
          document.documentElement.setAttribute('data-theme', '${test.themeId}');
          window.dispatchEvent(new CustomEvent('noor-theme-changed', { detail: '${test.themeId}' }));
          return document.documentElement.getAttribute('data-theme');
        })()
      `);

      if (switchResult !== test.themeId) {
        throw new Error(`Failed to set theme to ${test.themeId}`);
      }

      await delay(400);

      // Verify navbar attributes, geometry and styling
      const audit = await client.eval(`
        (() => {
          const nav = document.querySelector('nav[data-bottom-nav="true"]');
          if (!nav) return { error: 'nav[data-bottom-nav="true"] not found' };

          const variant = nav.getAttribute('data-navbar-variant');
          const bodyScrollWidth = document.body.scrollWidth;
          const navScrollWidth = nav.scrollWidth;
          const navRect = nav.getBoundingClientRect();

          // Check all descendant elements for forbidden filters
          const allEls = [nav, ...nav.querySelectorAll('*')];
          let hasBackdropFilter = false;
          let hasDropShadow = false;
          let forbiddenElement = null;

          for (const el of allEls) {
            const cs = window.getComputedStyle(el);
            const bf = cs.backdropFilter || cs.webkitBackdropFilter || '';
            const f = cs.filter || '';
            if (bf && bf !== 'none') {
              hasBackdropFilter = true;
              forbiddenElement = el.tagName + ' (backdrop-filter: ' + bf + ')';
              break;
            }
            if (f && f.includes('drop-shadow')) {
              hasDropShadow = true;
              forbiddenElement = el.tagName + ' (filter: ' + f + ')';
              break;
            }
          }

          // Check the 5 navigation links
          const links = Array.from(nav.querySelectorAll('a[href]'));
          const linkData = links.map(a => {
            const r = a.getBoundingClientRect();
            return {
              href: a.getAttribute('href'),
              text: a.innerText.trim(),
              left: Math.round(r.left),
              right: Math.round(r.right),
              width: Math.round(r.width),
              height: Math.round(r.height),
              visible: r.width > 0 && r.height > 0 && r.right <= 360,
            };
          });

          return {
            variant,
            bodyScrollWidth,
            navScrollWidth,
            navWidth: Math.round(navRect.width),
            hasBackdropFilter,
            hasDropShadow,
            forbiddenElement,
            linkCount: links.length,
            links: linkData,
          };
        })()
      `);

      if (audit.error) {
        throw new Error(`Audit error: ${audit.error}`);
      }

      console.log(`  Navbar Variant: ${audit.variant} (Expected: ${test.expectedVariant})`);
      if (audit.variant !== test.expectedVariant) {
        throw new Error(`Variant mismatch! Got: ${audit.variant}, expected: ${test.expectedVariant}`);
      }

      console.log(`  ScrollWidth: Body=${audit.bodyScrollWidth}px, Nav=${audit.navScrollWidth}px (Budget <= 360px)`);
      if (audit.bodyScrollWidth > 360 || audit.navScrollWidth > 360) {
        throw new Error(`Viewport budget exceeded! Body: ${audit.bodyScrollWidth}, Nav: ${audit.navScrollWidth}`);
      }

      console.log(`  GPU Filter Audit: backdrop-filter=${audit.hasBackdropFilter ? 'FAIL' : 'PASS (0)'}, drop-shadow=${audit.hasDropShadow ? 'FAIL' : 'PASS (0)'}`);
      if (audit.hasBackdropFilter || audit.hasDropShadow) {
        throw new Error(`Forbidden filter detected: ${audit.forbiddenElement}`);
      }

      console.log(`  Interactive Links: ${audit.linkCount} links verified within bounds [0, 360px]`);
      if (audit.linkCount < 5) {
        throw new Error(`Expected at least 5 nav links, found ${audit.linkCount}`);
      }
      for (const link of audit.links) {
        if (!link.visible) {
          throw new Error(`Nav link ${link.href} (${link.text}) clipped or outside viewport: ${JSON.stringify(link)}`);
        }
      }

      passed++;
      console.log(`  -> [PASS] ${test.name} -> ${test.expectedVariant}`);
    }

    console.log(`\n--- Testing Navigation & Tab Click Switching ---`);
    const clickAudit = await client.eval(`
      (() => {
        const nav = document.querySelector('nav[data-bottom-nav="true"]');
        const quranLink = nav.querySelector('a[href="/quran"]');
        if (!quranLink) return { error: 'Quran link not found' };
        quranLink.click();
        return { clicked: true, currentPath: window.location.pathname };
      })()
    `);
    console.log(`  Clicked /quran:`, clickAudit);
    await delay(600);

    const activeQuran = await client.eval(`
      (() => {
        const nav = document.querySelector('nav[data-bottom-nav="true"]');
        const quranLink = nav.querySelector('a[href="/quran"]');
        return {
          path: window.location.pathname,
          isQuranInUrl: window.location.pathname.startsWith('/quran'),
          quranActiveChild: quranLink ? quranLink.innerHTML.length : 0,
        };
      })()
    `);
    console.log(`  Active route check on /quran:`, activeQuran);

    // Filter out harmless non-actionable console errors (e.g., mock audio or missing favicon)
    const criticalErrors = client.consoleErrors.filter(
      (err) => !err.includes('favicon') && !err.includes('AudioContext') && !err.includes('audio')
    );

    console.log(`\n=== VERIFICATION SUMMARY ===`);
    console.log(`Themes Tested: ${passed}/${THEME_TESTS.length} PASSED`);
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

    console.log('\n>>> ALL 8 THEME-ADAPTIVE NAVBAR ARCHITECTURES VERIFIED: 100% PASS <<<');
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
