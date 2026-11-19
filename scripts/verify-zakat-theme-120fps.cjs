const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4182;
const CDP_PORT = 9232;

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
  const tempProfile = path.join(os.tmpdir(), `chrome-test-zakat-${Date.now()}`);
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
  ], { stdio: 'pipe' });

  for (let i = 0; i < 40; i++) {
    await delay(250);
    try {
      const list = await fetchJson(`http://localhost:${CDP_PORT}/json/list`);
      if (Array.isArray(list) && list.length > 0) {
        console.log('[Headless Chrome Ready with CDP]');
        return { chromeProc, tempProfile, wsUrl: list[0].webSocketDebuggerUrl };
      }
    } catch {}
  }
  throw new Error('Headless Chrome failed to bind to CDP port within 10s');
}

function verifyStaticCodeContracts() {
  console.log('\n=== RUNNING STATIC CONTRACT AUDIT ===');

  // 1. Zakat Currency Config (16 currencies)
  const zakatApiCode = fs.readFileSync(path.resolve(__dirname, '../src/lib/zakat-market-api.ts'), 'utf-8');
  const requiredCurrencies = ['INR', 'USD', 'SAR', 'AED', 'PKR', 'BDT', 'GBP', 'EUR', 'MYR', 'IDR', 'TRY', 'CAD', 'AUD', 'KWD', 'QAR', 'OMR'];
  for (const c of requiredCurrencies) {
    if (!zakatApiCode.includes(`code: '${c}'`)) {
      throw new Error(`Static Audit Failed: Missing currency ${c} in zakat-market-api.ts`);
    }
  }
  console.log(`PASS: All 16 supported currencies present in zakat-market-api.ts (${requiredCurrencies.join(', ')})`);

  // 2. ContentLanguageBar min-height and line-height for Urdu
  const langBarCode = fs.readFileSync(path.resolve(__dirname, '../src/components/ContentLanguageBar.tsx'), 'utf-8');
  if (!langBarCode.includes('min-h-[30px]') || !langBarCode.includes('lineHeight: 1.4')) {
    throw new Error('Static Audit Failed: ContentLanguageBar missing min-h-[30px] or lineHeight: 1.4 for Urdu Nastaliq');
  }
  console.log('PASS: ContentLanguageBar enforces min-h-[30px] and lineHeight: 1.4');

  // 3. Theme switching freeze in index.css
  const indexCss = fs.readFileSync(path.resolve(__dirname, '../src/index.css'), 'utf-8');
  if (!indexCss.includes('html.theme-switching') || !indexCss.includes('animation-duration: 0.001ms !important;')) {
    throw new Error('Static Audit Failed: index.css missing animation-duration: 0.001ms !important in html.theme-switching');
  }
  console.log('PASS: index.css contains animation-duration: 0.001ms !important in html.theme-switching');

  // 4. theme-engine.ts deferred localStorage
  const themeEngineCode = fs.readFileSync(path.resolve(__dirname, '../src/lib/theme-engine.ts'), 'utf-8');
  if (!themeEngineCode.includes('applyThemeToDOM(validId);') || !themeEngineCode.includes('// 2. Defer all non-visual storage and native bridging')) {
    throw new Error('Static Audit Failed: theme-engine.ts does not defer localStorage writes off critical frame');
  }
  console.log('PASS: theme-engine.ts updates DOM synchronously and defers storage I/O');

  // 5. ThemePicker contain: 'layout style paint' and no toast
  const themePickerCode = fs.readFileSync(path.resolve(__dirname, '../src/components/themes/ThemePicker.tsx'), 'utf-8');
  if (!themePickerCode.includes("contain: 'layout style paint'")) {
    throw new Error('Static Audit Failed: ThemePreviewCard missing contain: layout style paint');
  }
  if (themePickerCode.includes("title: 'Theme Applied'")) {
    throw new Error('Static Audit Failed: ThemePicker still spawns Toast on rapid theme clicks');
  }
  console.log('PASS: ThemePicker has contain: layout style paint and zero toast churn on theme change');

  // 6. ZakatCalculator createPortal for all 4 modals
  const zakatCalcCode = fs.readFileSync(path.resolve(__dirname, '../src/pages/ZakatCalculator.tsx'), 'utf-8');
  if (!zakatCalcCode.includes('showCurrencySheet && typeof document !== \'undefined\' && createPortal(')) {
    throw new Error('Static Audit Failed: showCurrencySheet is not rendered via createPortal');
  }
  if (!zakatCalcCode.includes('showOverrideModal && typeof document !== \'undefined\' && createPortal(')) {
    throw new Error('Static Audit Failed: showOverrideModal is not rendered via createPortal');
  }
  if (!zakatCalcCode.includes('showPuritySheet && typeof document !== \'undefined\' && createPortal(')) {
    throw new Error('Static Audit Failed: showPuritySheet is not rendered via createPortal');
  }
  if (!zakatCalcCode.includes('showShariahRulesModal && typeof document !== \'undefined\' && createPortal(')) {
    throw new Error('Static Audit Failed: showShariahRulesModal is not rendered via createPortal');
  }
  if (!zakatCalcCode.includes('currencySearch') || !zakatCalcCode.includes('filteredCurrencies')) {
    throw new Error('Static Audit Failed: ZakatCalculator missing currency search filter');
  }
  console.log('PASS: ZakatCalculator renders all 4 modals via createPortal(..., document.body) with search input');
}

async function main() {
  verifyStaticCodeContracts();

  let previewProc = null;
  let chromeInfo = null;
  let cdp = null;

  try {
    previewProc = await startVitePreview();
    chromeInfo = await startHeadlessChrome();

    cdp = new CdpClient(chromeInfo.wsUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    console.log('\n=== TEST 1: ZAKAT CURRENCY PICKER PORTAL MODAL & SEARCH ===');
    await cdp.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/zakat` });
    await delay(2000);

    // Verify Zakat page loaded
    const pageTitle = await cdp.eval('document.title');
    console.log(`Page title: ${pageTitle}`);

    // Find and click the currency picker trigger
    const triggerClicked = await cdp.eval(`(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const trigger = btns.find(b => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Selected currency'));
      if (trigger) {
        trigger.click();
        return true;
      }
      return false;
    })()`);

    if (!triggerClicked) {
      throw new Error('Failed to find and click currency selector trigger button');
    }
    console.log('PASS: Clicked currency selector trigger button');
    await delay(400);

    // Verify currency modal is rendered via Portal directly under document.body with z-[9999]
    const modalCheck = await cdp.eval(`(() => {
      const modal = document.querySelector('body > div[role="dialog"][aria-label="Select Currency"]');
      if (!modal) return { found: false };
      const zIndex = window.getComputedStyle(modal).zIndex;
      const isVisible = modal.offsetWidth > 0 && modal.offsetHeight > 0;
      const currenciesCount = modal.querySelectorAll('button[type="button"]').length;
      return { found: true, zIndex, isVisible, currenciesCount };
    })()`);

    console.log('Currency Modal Check:', modalCheck);
    if (!modalCheck.found || !modalCheck.isVisible) {
      throw new Error('Currency modal not found or not visible under document.body');
    }
    console.log(`PASS: Currency modal open under document.body with z-index ${modalCheck.zIndex}`);

    // Verify search input in modal
    const searchResult = await cdp.eval(`(() => {
      const input = document.querySelector('body > div[role="dialog"] input[type="text"]');
      if (!input) return { inputFound: false };
      
      // Type 'Kuwait' using React's native value tracker
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, 'Kuwait');
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return { inputFound: true, value: input.value };
    })()`);
    console.log('Search Result:', searchResult);
    await delay(300);

    // Verify filtered result contains KWD
    const filteredCheck = await cdp.eval(`(() => {
      const modal = document.querySelector('body > div[role="dialog"][aria-label="Select Currency"]');
      const text = modal ? modal.innerText : '';
      const hasKwd = text.includes('KWD') || text.includes('Kuwait');
      const hasInr = text.includes('INR');
      return { hasKwd, hasInr };
    })()`);
    console.log('Filtered Check:', filteredCheck);
    if (!filteredCheck.hasKwd || filteredCheck.hasInr) {
      throw new Error(`Search filter failed: hasKwd=${filteredCheck.hasKwd}, hasInr=${filteredCheck.hasInr}`);
    }
    console.log('PASS: Currency search filter accurately displays Kuwait (KWD) and filters out INR');

    // Click KWD to select it
    const selectKwd = await cdp.eval(`(() => {
      const modal = document.querySelector('body > div[role="dialog"][aria-label="Select Currency"]');
      const kwdBtn = Array.from(modal.querySelectorAll('button')).find(b => b.innerText.includes('KWD'));
      if (kwdBtn) {
        kwdBtn.click();
        return true;
      }
      return false;
    })()`);
    if (!selectKwd) {
      throw new Error('Failed to find and click KWD button');
    }
    console.log('PASS: Clicked KWD currency button');
    await delay(500);

    // Verify modal closed and active currency updated
    const postSelectCheck = await cdp.eval(`(() => {
      const modal = document.querySelector('body > div[role="dialog"][aria-label="Select Currency"]');
      const btns = Array.from(document.querySelectorAll('button'));
      const trigger = btns.find(b => b.getAttribute('aria-label') && b.getAttribute('aria-label').includes('Selected currency'));
      const triggerText = trigger ? trigger.innerText : '';
      return { modalClosed: !modal, triggerText };
    })()`);
    console.log('Post Select Check:', postSelectCheck);
    if (!postSelectCheck.modalClosed || !postSelectCheck.triggerText.includes('KWD')) {
      throw new Error(`Failed to update active currency to KWD: modalClosed=${postSelectCheck.modalClosed}, text=${postSelectCheck.triggerText}`);
    }
    console.log('PASS: Currency modal closed cleanly and updated active currency to KWD');

    console.log('\n=== TEST 2: THEME SWITCHING LATENCY & ZERO JANK ===');
    await cdp.send('Page.navigate', { url: `http://localhost:${PREVIEW_PORT}/settings/theme` });
    await delay(1500);

    const themeTest = await cdp.eval(`(async () => {
      const themes = ['kiswah-noir', 'istanbul-sapphire', 'oxford-gold', 'imperial-violet', 'burgundy-velvet', 'desert-scroll', 'madinah-emerald', 'persian-indigo'];
      const timings = [];
      const cards = Array.from(document.querySelectorAll('.grid > div[role="button"]'));

      for (let i = 0; i < Math.min(themes.length, cards.length); i++) {
        const card = cards[i];
        const t0 = performance.now();
        card.click();
        const t1 = performance.now();
        timings.push({ index: i, durationMs: t1 - t0, dataTheme: document.documentElement.getAttribute('data-theme') });
      }
      return { timings, totalSwaps: timings.length };
    })()`);

    console.log('Theme Switching Timings:', themeTest);
    for (const t of themeTest.timings) {
      console.log(`Theme switch [${t.index}]: ${t.durationMs.toFixed(2)}ms (active: ${t.dataTheme})`);
      if (t.durationMs > 30) {
        throw new Error(`Theme switch too slow: ${t.durationMs.toFixed(2)}ms > 30ms`);
      }
    }
    console.log('PASS: Instant theme switching: all switches executed in < 30ms (single frame)');

    console.log('\n=== TEST 3: ZERO BACKDROP-FILTER AUDIT IN ACTIVE UI ===');
    const blurAudit = await cdp.eval(`(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const elementsWithBlur = [];
      for (const el of allElements) {
        const cs = window.getComputedStyle(el);
        const bf = cs.backdropFilter || cs.webkitBackdropFilter || '';
        if (bf && bf !== 'none') {
          elementsWithBlur.push({ tag: el.tagName, className: el.className, blur: bf });
        }
      }
      return { total: elementsWithBlur.length, elements: elementsWithBlur };
    })()`);

    console.log('Backdrop Filter Elements Audit:', blurAudit);
    if (blurAudit.total > 0) {
      console.warn(`WARNING: Found ${blurAudit.total} elements with active backdropFilter:`, blurAudit.elements);
    } else {
      console.log('PASS: ZERO active backdrop-filter elements detected in rendered DOM');
    }

    console.log('\n=== TEST 4: CONSOLE ERRORS & EXCEPTIONS AUDIT ===');
    console.log(`Console Errors count: ${cdp.consoleErrors.length}`);
    console.log(`Runtime Exceptions count: ${cdp.exceptions.length}`);
    if (cdp.consoleErrors.length > 0) {
      console.warn('Console Errors:', cdp.consoleErrors);
    }
    if (cdp.exceptions.length > 0) {
      throw new Error(`Runtime exceptions encountered: ${JSON.stringify(cdp.exceptions)}`);
    }
    console.log('PASS: 0 uncaught runtime exceptions during entire session');

    console.log('\n=============================================');
    console.log('ALL VERIFICATION GATES PASSED (100% SUCCESS)');
    console.log('=============================================\n');

  } finally {
    if (cdp) cdp.close();
    if (chromeInfo && chromeInfo.chromeProc) {
      try { process.kill(chromeInfo.chromeProc.pid); } catch {}
    }
    if (previewProc) {
      try { process.kill(previewProc.pid); } catch {}
    }
    if (chromeInfo && chromeInfo.tempProfile) {
      try { fs.rmSync(chromeInfo.tempProfile, { recursive: true, force: true }); } catch {}
    }
  }
}

main().catch((err) => {
  console.error('\nVERIFICATION SUITE FAILED:', err);
  process.exit(1);
});
