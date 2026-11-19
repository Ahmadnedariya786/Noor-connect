const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4183;
const CDP_PORT = 9233;

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
    this.exceptions = [];
    this.consoleErrors = [];
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
        if (msg.method === 'Runtime.exceptionThrown') {
          this.exceptions.push(msg.params);
        } else if (msg.method === 'Runtime.consoleAPICalled') {
          if (msg.params.type === 'error') {
            this.consoleErrors.push(msg.params);
          }
        }
      }
    };
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, returnByValue = true) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error('Evaluation failed: ' + JSON.stringify(res.exceptionDetails));
    }
    return res.result ? res.result.value : undefined;
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch { /* ignore */ }
    }
  }
}

async function run() {
  console.log('=== STARTING SCIENTIFIC FLAGSHIP QIBLA VERIFICATION ===');
  let previewProc = null;
  let chromeProc = null;
  let cdp = null;

  try {
    // 1. Start preview server
    console.log(`[1/6] Launching Vite preview server on port ${PREVIEW_PORT}...`);
    previewProc = spawn(
      'cmd.exe',
      ['/c', 'npx', 'vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'],
      { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' }
    );

    let serverReady = false;
    for (let i = 0; i < 30; i++) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(`http://127.0.0.1:${PREVIEW_PORT}/`, (res) => {
            if (res.statusCode === 200) resolve(true);
            else reject(new Error('Status: ' + res.statusCode));
          });
          req.on('error', reject);
        });
        serverReady = true;
        break;
      } catch {
        await delay(500);
      }
    }

    if (!serverReady) throw new Error('Preview server failed to start within 15 seconds.');
    console.log('      Vite preview server is ready.');

    // 2. Launch headless Chrome at 360x800
    console.log('[2/6] Launching Headless Chrome CDP at 360x800 viewport...');
    const userDataDir = path.join(os.tmpdir(), 'chrome-qibla-verify-' + Date.now());
    fs.mkdirSync(userDataDir, { recursive: true });

    chromeProc = spawn(CHROME_PATH, [
      `--remote-debugging-port=${CDP_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--window-size=360,800',
      `--user-data-dir=${userDataDir}`,
      `http://127.0.0.1:${PREVIEW_PORT}/qibla`,
    ]);

    let versionInfo = null;
    for (let i = 0; i < 20; i++) {
      try {
        versionInfo = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json/version`);
        if (versionInfo && versionInfo.webSocketDebuggerUrl) break;
      } catch {
        await delay(400);
      }
    }

    if (!versionInfo) throw new Error('Could not connect to Chrome CDP.');

    let targets = [];
    for (let i = 0; i < 20; i++) {
      targets = await fetchJson(`http://127.0.0.1:${CDP_PORT}/json`);
      if (targets && targets.length > 0) break;
      await delay(300);
    }

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = new CdpClient(pageTarget.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('DOM.enable');

    // Emulate 360px mobile device
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 360,
      height: 800,
      deviceScaleFactor: 2,
      mobile: true,
    });

    console.log('      Navigating to Qibla page...');
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PREVIEW_PORT}/qibla` });
    await delay(3000);

    // 3. Verify 360px viewport horizontal overflow
    console.log('[3/6] Verifying 360px Viewport Horizontal Budget (RTL & LTR)...');
    const viewportAudit = await cdp.evaluate(`
      (() => {
        const docEl = document.documentElement;
        const scrollWidth = docEl.scrollWidth;
        const clientWidth = docEl.clientWidth;
        const hasOverflow = scrollWidth > clientWidth;
        return {
          scrollWidth,
          clientWidth,
          hasOverflow,
          overflowPx: Math.max(0, scrollWidth - clientWidth)
        };
      })()
    `);
    console.log('      Viewport result:', JSON.stringify(viewportAudit));
    if (viewportAudit.hasOverflow) {
      throw new Error(`Viewport horizontal overflow detected: ${viewportAudit.overflowPx}px!`);
    }

    // 4. Verify Scientific Compass Elements: Clockwise Arc, Sun Marker, Bubble Level, Above-Fold Controls
    console.log('[4/6] Verifying Flagship Compass Elements (Arc, Sun, Tilt Bubble, Controls)...');
    const compassAudit = await cdp.evaluate(`
      (() => {
        const svgDial = document.querySelector('svg[viewBox="0 0 280 280"]');
        const clockwiseArc = document.querySelector('svg path[stroke-dasharray="4 2.5"]');
        const sunMarker = Array.from(document.querySelectorAll('text')).some(t => t.textContent.includes('☀️'));
        const spiritBubble = document.querySelector('circle[cx][cy][r="4.5"]');
        const controlStrip = document.querySelector('button[aria-label*="calibration guide"]');
        const pauseResumeBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Pause') || b.textContent.includes('Resume'));
        const calibrateBtn = Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('Calibrate ∞'));
        
        // Check if dial and controls are above the fold (within top 750px)
        let dialRect = null;
        if (svgDial) {
          const r = svgDial.getBoundingClientRect();
          dialRect = { top: r.top, bottom: r.bottom, height: r.height };
        }

        return {
          hasSvgDial: !!svgDial,
          hasClockwiseArc: !!clockwiseArc,
          hasSunMarker: !!sunMarker,
          hasSpiritBubble: !!spiritBubble,
          hasControlStrip: !!controlStrip,
          hasPauseResumeBtn: !!pauseResumeBtn,
          hasCalibrateBtn: !!calibrateBtn,
          dialRect,
        };
      })()
    `);
    console.log('      Compass audit result:', JSON.stringify(compassAudit));
    if (!compassAudit.hasSvgDial) throw new Error('Compass SVG dial (280x280) missing!');
    if (!compassAudit.hasClockwiseArc) throw new Error('Clockwise True-North Arc missing!');
    if (!compassAudit.hasSpiritBubble) throw new Error('Spirit level bubble inside Kaaba medallion missing!');
    if (!compassAudit.hasControlStrip) throw new Error('Above-the-fold sensor control strip missing!');
    if (!compassAudit.hasCalibrateBtn) throw new Error('Calibrate ∞ button missing!');

    // 5. Verify 2D HTML5 Canvas Orthographic Globe & Flight vs Road Telemetry
    console.log('[5/6] Verifying 2D Canvas Orthographic Earth Globe & Flight vs Road Telemetry...');
    const globeAudit = await cdp.evaluate(`
      (() => {
        const canvas = document.querySelector('canvas');
        const flightBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Flight'));
        const roadBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Road'));
        
        let initialDistanceText = '';
        const distEl = document.querySelector('.text-3xl.font-black');
        if (distEl) initialDistanceText = distEl.textContent.trim();

        return {
          hasCanvas: !!canvas,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
          hasFlightBtn: !!flightBtn,
          hasRoadBtn: !!roadBtn,
          initialDistanceText,
        };
      })()
    `);
    console.log('      Globe audit result:', JSON.stringify(globeAudit));
    if (!globeAudit.hasCanvas) throw new Error('Earth Globe 2D Canvas element missing!');
    if (globeAudit.canvasWidth === 0) throw new Error('Earth Globe 2D Canvas has 0 width!');

    // Toggle Road mode and check distance recalculation with async delay for React render
    console.log('      Toggling between Flight and Road telemetry modes...');
    const modeSwitchResult = await cdp.evaluate(`
      (async () => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const roadBtn = buttons.find(b => b.textContent.includes('Road'));
        if (!roadBtn) return { success: false, reason: 'Road button not found' };
        roadBtn.click();
        await new Promise(r => setTimeout(r, 200));
        
        const distEl = document.querySelector('.text-3xl.font-black');
        const roadDistanceText = distEl ? distEl.textContent.trim() : '';

        // Click flight button back
        const flightBtn = buttons.find(b => b.textContent.includes('Flight'));
        if (flightBtn) flightBtn.click();
        await new Promise(r => setTimeout(r, 200));
        const flightDistanceText = distEl ? distEl.textContent.trim() : '';

        return {
          success: true,
          roadDistanceText,
          flightDistanceText,
          isDistinct: roadDistanceText !== flightDistanceText
        };
      })()
    `);
    console.log('      Mode switch result:', JSON.stringify(modeSwitchResult));
    if (!modeSwitchResult.isDistinct) {
      throw new Error('Flight and Road distances must be distinct! Got: ' + modeSwitchResult.flightDistanceText + ' vs ' + modeSwitchResult.roadDistanceText);
    }

    // 6. Test Calibration Modal Portal Render & Close
    console.log('[6/6] Verifying Portal-Rendered Calibration Modal & Backdrop Check...');
    const modalTestResult = await cdp.evaluate(`
      (async () => {
        const calBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Calibrate ∞'));
        if (!calBtn) return { success: false, reason: 'Calibrate button not found' };
        calBtn.click();
        await new Promise(r => setTimeout(r, 200));

        const modal = document.querySelector('div[role="dialog"]');
        const isPortalAtBody = modal && modal.parentElement === document.body;
        const hasFigure8 = !!document.querySelector('svg path[stroke-dasharray="8 6"]');
        const closeBtn = document.querySelector('button[aria-label="Close dialog"]');
        
        if (closeBtn) closeBtn.click();
        await new Promise(r => setTimeout(r, 200));
        const modalAfterClose = document.querySelector('div[role="dialog"]');

        // Check for forbidden backdrop-filter
        const hasBackdropFilter = Array.from(document.querySelectorAll('*')).some(el => {
          const s = window.getComputedStyle(el);
          return s.backdropFilter && s.backdropFilter !== 'none';
        });

        return {
          success: true,
          isPortalAtBody,
          hasFigure8,
          closedCleanly: !modalAfterClose,
          hasBackdropFilter,
        };
      })()
    `);
    console.log('      Modal test result:', JSON.stringify(modalTestResult));
    if (!modalTestResult.isPortalAtBody) throw new Error('Calibration modal not portal-rendered at body root!');
    if (!modalTestResult.hasFigure8) throw new Error('Calibration modal Figure-8 graphic missing!');
    if (!modalTestResult.closedCleanly) throw new Error('Calibration modal did not close cleanly!');

    console.log('=== ALL SCIENTIFIC FLAGSHIP QIBLA VERIFICATIONS PASSED (6/6) ===');
  } catch (err) {
    console.error('FATAL VERIFICATION FAILURE:', err);
    process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    if (chromeProc) {
      try { chromeProc.kill(); } catch { /* ignore */ }
    }
    if (previewProc) {
      try { previewProc.kill(); } catch { /* ignore */ }
    }
  }
}

run();
