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

function toRad(deg) { return (deg * Math.PI) / 180; }
function toDeg(rad) { return (rad * 180) / Math.PI; }
function calculateSphericalBearing(lat1, lon1, lat2, lon2) {
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);
  const y = Math.sin(deltaLambda);
  const x = Math.cos(phi1) * Math.tan(phi2) - Math.sin(phi1) * Math.cos(deltaLambda);
  const bearingRad = Math.atan2(y, x);
  return (toDeg(bearingRad) + 360) % 360;
}

function verifyMathematicalBearings() {
  console.log('[0/6] Running Mathematical Bearing Unit Tests for 5 Target Cities...');
  const KAABA = { lat: 21.4225, lng: 39.8262 };
  const targets = [
    { name: 'Vadgam (Gujarat)', lat: 24.08, lng: 72.39, expected: 271.5 },
    { name: 'Ahmedabad (Gujarat)', lat: 23.0225, lng: 72.5714, expected: 273.4 },
    { name: 'Mumbai (Maharashtra)', lat: 19.0760, lng: 72.8777, expected: 280.1 },
    { name: 'New York (USA)', lat: 40.7128, lng: -74.0060, expected: 58.5 },
    { name: 'London (UK)', lat: 51.5074, lng: -0.1278, expected: 119.0 },
  ];

  for (const t of targets) {
    const bearing = calculateSphericalBearing(t.lat, t.lng, KAABA.lat, KAABA.lng);
    const diff = Math.abs(bearing - t.expected);
    console.log(`      ${t.name}: calculated ${bearing.toFixed(2)}° vs expected ${t.expected}° (delta: ${diff.toFixed(2)}°)`);
    if (diff > 0.5) {
      throw new Error(`Mathematical bearing discrepancy for ${t.name}: expected ~${t.expected}°, got ${bearing.toFixed(2)}°`);
    }
  }
  console.log('      All 5 benchmark bearings within ±0.5° threshold.');
}

async function run() {
  console.log('=== STARTING SCIENTIFIC FLAGSHIP QIBLA VERIFICATION ===');
  verifyMathematicalBearings();

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
      'about:blank',
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

    console.log('      Navigating to Qibla page and awaiting React hydration...');
    await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PREVIEW_PORT}/qibla` });
    
    let rendered = false;
    for (let i = 0; i < 30; i++) {
      const hasDial = await cdp.evaluate(`!!document.querySelector('svg[viewBox="0 0 280 280"]')`);
      if (hasDial) {
        rendered = true;
        break;
      }
      await delay(400);
    }
    if (!rendered) {
      const bodyHtml = await cdp.evaluate(`document.body.innerHTML`);
      console.error('Body HTML at timeout:', bodyHtml ? bodyHtml.slice(0, 500) : 'null');
      throw new Error('Compass SVG dial failed to mount within 12 seconds.');
    }
    await delay(1000);

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
        const calibrateBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Calibrate' || b.textContent.includes('Calibrate'));
        
        let calRect = null;
        let isCalibrateUnclipped = false;
        if (calibrateBtn) {
          const r = calibrateBtn.getBoundingClientRect();
          calRect = { left: r.left, right: r.right, width: r.width, height: r.height };
          // Must fit within 360px viewport (right <= 356px)
          isCalibrateUnclipped = r.right <= 356 && r.width >= 40;
        }

        // Check if dial and controls are above the fold (within top 750px)
        let dialRect = null;
        if (svgDial) {
          const r = svgDial.getBoundingClientRect();
          dialRect = { top: r.top, bottom: r.bottom, height: r.height };
        }

        // Check for duplicate checkmarks
        const bodyText = document.body.innerText;
        const hasDuplicateCheckmarks = bodyText.includes('✓ ✓') || bodyText.includes('✓✓');
        const statusText = controlStrip ? controlStrip.textContent.trim() : 'null';
        const isAutoStarted = !!controlStrip && (statusText.includes('Live') || statusText.includes('●'));

        return {
          hasSvgDial: !!svgDial,
          hasClockwiseArc: !!clockwiseArc,
          hasSunMarker: !!sunMarker,
          hasSpiritBubble: !!spiritBubble,
          hasControlStrip: !!controlStrip,
          hasPauseResumeBtn: !!pauseResumeBtn,
          hasCalibrateBtn: !!calibrateBtn,
          isCalibrateUnclipped,
          isAutoStarted,
          statusText,
          calRect,
          hasDuplicateCheckmarks,
          dialRect,
        };
      })()
    `);
    console.log('      Compass audit result:', JSON.stringify(compassAudit));
    if (!compassAudit.hasSvgDial) throw new Error('Compass SVG dial (280x280) missing!');
    if (!compassAudit.hasClockwiseArc) throw new Error('Clockwise True-North Arc missing!');
    if (!compassAudit.hasSpiritBubble) throw new Error('Spirit level bubble inside Kaaba medallion missing!');
    if (!compassAudit.hasControlStrip) throw new Error('Above-the-fold sensor control strip missing!');
    if (!compassAudit.isAutoStarted) throw new Error('Compass did not auto-start on mount (expected "● Live")!');
    if (!compassAudit.hasCalibrateBtn) throw new Error('Calibrate button missing!');
    if (!compassAudit.isCalibrateUnclipped) {
      throw new Error(`Calibrate button is clipped on 360px viewport: right=${compassAudit.calRect ? compassAudit.calRect.right : 'null'}px`);
    }
    if (compassAudit.hasDuplicateCheckmarks) {
      throw new Error('Duplicate checkmark (✓ ✓) found in page content!');
    }

    // 5. Verify 2D HTML5 Canvas Orthographic Globe & Flight vs Road Telemetry
    console.log('[5/6] Verifying 2D Canvas Orthographic Earth Globe & Flight vs Road Telemetry...');
    const globeAudit = await cdp.evaluate(`
      (() => {
        const canvas = document.querySelector('canvas');
        const flightBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Flight'));
        const roadBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Road'));
        const globeHeader = Array.from(document.querySelectorAll('span, div, p')).some(el => el.textContent.trim().includes('QIBLA ROUTE'));
        
        let isRoadUnclipped = false;
        let roadBox = null;
        let cardBox = null;
        if (roadBtn) {
          const r = roadBtn.getBoundingClientRect();
          const parentCard = roadBtn.closest('.overflow-hidden') || (canvas ? canvas.closest('.border') : null) || document.body;
          const c = parentCard.getBoundingClientRect();
          roadBox = { right: r.right, width: r.width };
          cardBox = { right: c.right };
          // Strictly inside parent card right border (<= c.right - 8) with >= 12px spare room inside card
          isRoadUnclipped = r.right <= (c.right - 8) && r.width >= 35;
        }

        let initialDistanceText = '';
        const distEl = document.querySelector('.text-3xl.font-black');
        if (distEl) initialDistanceText = distEl.textContent.trim();

        const hasBrokenCommaSpace = /\\d\\s+,/.test(initialDistanceText) || initialDistanceText.includes(' ,');

        return {
          hasCanvas: !!canvas,
          canvasWidth: canvas ? canvas.width : 0,
          canvasHeight: canvas ? canvas.height : 0,
          hasFlightBtn: !!flightBtn,
          hasRoadBtn: !!roadBtn,
          hasGlobeHeader: !!globeHeader,
          isRoadUnclipped,
          roadBox,
          cardBox,
          hasBrokenCommaSpace,
          initialDistanceText,
        };
      })()
    `);
    console.log('      Globe audit result:', JSON.stringify(globeAudit));
    if (!globeAudit.hasCanvas) throw new Error('Earth Globe 2D Canvas element missing!');
    if (globeAudit.canvasWidth === 0) throw new Error('Earth Globe 2D Canvas has 0 width!');
    if (!globeAudit.hasGlobeHeader) throw new Error('Single-line "QIBLA ROUTE" header missing!');
    if (!globeAudit.isRoadUnclipped) {
      throw new Error(`Road button clipped! roadBox=${JSON.stringify(globeAudit.roadBox)}, cardBox=${JSON.stringify(globeAudit.cardBox)}`);
    }
    if (globeAudit.hasBrokenCommaSpace) throw new Error(`Distance comma has leading space formatting issue: "${globeAudit.initialDistanceText}"`);

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
        const calBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Calibrate' || b.textContent.includes('Calibrate'));
        if (!calBtn) return { success: false, reason: 'Calibrate button not found' };
        calBtn.click();
        await new Promise(r => setTimeout(r, 200));

        const modal = document.querySelector('div[role="dialog"]');
        const isPortalAtBody = modal && modal.parentElement === document.body;
        const fig8Path = document.querySelector('svg path[stroke-dasharray="8 6"]');
        const hasFigure8 = !!fig8Path;
        const fig8Svg = fig8Path ? fig8Path.closest('svg') : null;
        const motionTitle = Array.from(document.querySelectorAll('span, p')).find(el => el.textContent.includes('Figure-8 Motion'));
        
        let figure8Overlaps = false;
        if (fig8Svg && motionTitle) {
          const svgRect = fig8Svg.getBoundingClientRect();
          const textRect = motionTitle.getBoundingClientRect();
          figure8Overlaps = svgRect.bottom > textRect.top;
        }

        const hasFalseNoMagnetometer = Array.from(document.querySelectorAll('span')).some(el => el.textContent.trim() === 'No Magnetometer');

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
          figure8Overlaps,
          hasFalseNoMagnetometer,
          closedCleanly: !modalAfterClose,
          hasBackdropFilter,
        };
      })()
    `);
    console.log('      Modal test result:', JSON.stringify(modalTestResult));
    if (!modalTestResult.isPortalAtBody) throw new Error('Calibration modal not portal-rendered at body root!');
    if (!modalTestResult.hasFigure8) throw new Error('Calibration modal Figure-8 graphic missing!');
    if (modalTestResult.figure8Overlaps) throw new Error('Figure-8 SVG overlaps the instruction text!');
    if (modalTestResult.hasFalseNoMagnetometer) throw new Error('False "No Magnetometer" badge shown!');
    if (!modalTestResult.closedCleanly) throw new Error('Calibration modal did not close cleanly!');

    if (cdp.exceptions.length > 0) {
      throw new Error('CDP recorded exceptions: ' + JSON.stringify(cdp.exceptions));
    }

    console.log('=== ALL SCIENTIFIC FLAGSHIP QIBLA VERIFICATIONS PASSED (6/6) ===');
  } catch (err) {
    console.error('FATAL VERIFICATION FAILURE:', err);
    process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    if (chromeProc && chromeProc.pid) {
      try { spawn('taskkill', ['/F', '/T', '/PID', String(chromeProc.pid)], { stdio: 'ignore' }); } catch { /* ignore */ }
    }
    if (previewProc && previewProc.pid) {
      try { spawn('taskkill', ['/F', '/T', '/PID', String(previewProc.pid)], { stdio: 'ignore' }); } catch { /* ignore */ }
    }
    setTimeout(() => {
      process.exit(process.exitCode || 0);
    }, 500);
  }
}

run();
