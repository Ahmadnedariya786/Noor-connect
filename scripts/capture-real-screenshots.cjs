/**
 * Automated High-Resolution Screenshot Capture for Noor Connect v2.2.1
 * 
 * Uses Node.js built-in HTTP server (serving dist/), Chrome DevTools Protocol (CDP)
 * via native WebSocket, and captures 9 crisp mobile screenshots (412x915 @ 2.5x)
 * across all 5 royal themes.
 * Zero external npm dependencies required.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 4173;
const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'assets', 'screenshots');
const FASTLANE_DIR = path.resolve(__dirname, '..', 'fastlane', 'metadata', 'android', 'en-US', 'images', 'phoneScreenshots');
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const TEMP_USER_DATA = path.resolve(__dirname, '..', '.chrome-temp-profile');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.webp': 'image/webp',
};

// 1. Create lightweight SPA HTTP static server
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/') reqPath = '/index.html';

      let filePath = path.join(DIST_DIR, reqPath);
      // SPA fallback
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(DIST_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(500);
          res.end('Error loading file');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
      });
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[Server] Static SPA server running at http://127.0.0.1:${PORT}`);
      resolve(server);
    });

    server.on('error', reject);
  });
}

// 2. Launch Headless Chrome with remote debugging
function launchChrome() {
  if (fs.existsSync(TEMP_USER_DATA)) {
    try { fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true }); } catch (_) {}
  }
  fs.mkdirSync(TEMP_USER_DATA, { recursive: true });

  const args = [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_USER_DATA}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--metrics-recording-only',
    '--mute-audio',
    '--window-size=412,915',
    'about:blank'
  ];

  console.log('[Chrome] Launching Chrome CDP on port 9222...');
  const proc = spawn(CHROME_PATH, args, { stdio: 'ignore' });
  return proc;
}

async function waitForCdp(maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      if (res.ok) {
        const info = await res.json();
        console.log('[Chrome] CDP ready:', info.Browser);
        return;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error('Timeout waiting for Chrome CDP');
}

// 3. Connect to CDP page target
async function connectToPage() {
  const listRes = await fetch('http://127.0.0.1:9222/json/list');
  const pages = await listRes.json();
  const page = pages.find(p => p.type === 'page') || pages[0];
  if (!page || !page.webSocketDebuggerUrl) {
    throw new Error('No inspectable page found in Chrome');
  }

  console.log('[CDP] Connecting to page:', page.webSocketDebuggerUrl);
  const ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  let idCounter = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      const onMsg = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id === id) {
            ws.removeEventListener('message', onMsg);
            if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            else resolve(msg.result);
          }
        } catch (e) {
          reject(e);
        }
      };
      ws.addEventListener('message', onMsg);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  return { ws, send };
}

// 4. Screenshots configuration
const TARGETS = [
  {
    name: '1_home.png',
    path: '/',
    theme: 'oxford-gold',
    delay: 3500,
    title: 'Home Dashboard (Oxford Gold)',
  },
  {
    name: '2_quran_hub.png',
    path: '/quran',
    theme: 'kiswah-noir',
    delay: 3000,
    title: 'Quran Hub & Sunnah Surahs (Kaaba Kiswah Noir)',
  },
  {
    name: '3_mushaf_tajweed.png',
    path: '/quran/55',
    theme: 'kiswah-noir',
    delay: 4500,
    title: 'Surah Ar-Rahman Tajweed Mushaf (Kaaba Kiswah Noir)',
  },
  {
    name: '4_zakat_calculator.png',
    path: '/zakat',
    theme: 'burgundy-velvet',
    delay: 3500,
    title: 'Live Zakat & Nisab Calculator (Burgundy Velvet)',
  },
  {
    name: '5_tafsir_hadith.png',
    path: '/hadith',
    theme: 'desert-scroll',
    delay: 3000,
    title: 'Hadith Library & Sunnah (Desert Scroll)',
  },
  {
    name: '6_qibla_compass.png',
    path: '/qibla',
    theme: 'oxford-gold',
    delay: 3000,
    title: 'Qibla Compass with Live Bearing (Oxford Gold)',
  },
  {
    name: '7_live_makkah.png',
    path: '/live',
    theme: 'imperial-violet',
    delay: 3500,
    title: 'Makkah & Madinah 24/7 Live Stream (Imperial Violet)',
  },
  {
    name: '8_services_hub.png',
    path: '/services',
    theme: 'imperial-violet',
    delay: 3000,
    title: 'Islamic Tools & Services Hub (Imperial Violet)',
  },
  {
    name: '9_settings_themes.png',
    path: '/profile',
    theme: 'burgundy-velvet',
    delay: 3000,
    title: '5 Royal Themes & Settings (Burgundy Velvet)',
  },
];

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  fs.mkdirSync(FASTLANE_DIR, { recursive: true });

  const server = await startServer();
  const chromeProc = launchChrome();

  try {
    await waitForCdp();
    const { ws, send } = await connectToPage();

    // Enable domains
    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    // Emulate standard mobile device (Pixel 7 style: 412x915, 2.5x scale)
    await send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.5,
      mobile: true,
      fitWindow: false,
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true });

    // Ensure pre-seeded localStorage on every new document load
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        try {
          localStorage.setItem('splash_enabled', 'false');
          localStorage.setItem('splash_greeting_enabled', 'false');
          localStorage.setItem('greeting_enabled', 'false');
          localStorage.setItem('salam_greeting_enabled', 'false');
          localStorage.setItem('animations_enabled', 'true');
          localStorage.setItem('noor_onboarded', 'true');
          localStorage.setItem('onboarding_completed', 'true');
          localStorage.setItem('hasSeenOnboarding', 'true');
          localStorage.setItem('has_completed_onboarding', 'true');
          localStorage.setItem('hasSeenWelcome', 'true');
          localStorage.setItem('welcome_dismissed', 'true');
          localStorage.setItem('app-language', 'en');
          localStorage.setItem('user_location', 'Makkah');
          localStorage.setItem('noor_user_city', 'Makkah');
          localStorage.setItem('location-storage', JSON.stringify({
            latitude: 21.4225,
            longitude: 39.8262,
            locationName: 'Makkah, Saudi Arabia'
          }));
          localStorage.setItem('has_seen_quran_tutorial', 'true');
        } catch (e) {}
      `
    });

    console.log('[Capture] Starting screenshot sequence across 5 Royal Themes...');

    for (const target of TARGETS) {
      console.log(`\n📸 Capturing: ${target.name} - ${target.title}`);

      // Navigate to route
      await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${target.path}` });

      // Wait for network and DOM
      await new Promise(r => setTimeout(r, target.delay));

      // Inject theme and wait for fonts
      await send('Runtime.evaluate', {
        expression: `(async () => {
          try {
            localStorage.setItem('noor_theme', '${target.theme}');
            localStorage.setItem('noor-theme', '${target.theme}');
            localStorage.setItem('theme', '${target.theme}');
            document.documentElement.setAttribute('data-theme', '${target.theme}');
            window.dispatchEvent(new CustomEvent('noor-theme-changed', { detail: '${target.theme}' }));
            await document.fonts.ready;
          } catch(e) {}
        })()`,
        awaitPromise: true,
      });

      await new Promise(r => setTimeout(r, 800));

      // Diagnostic log
      const evalRes = await send('Runtime.evaluate', {
        expression: `(() => {
          const text = (document.body.innerText || '').slice(0, 80).replace(/\\s+/g, ' ');
          return {
            title: document.title,
            url: window.location.pathname,
            text
          };
        })()`,
        returnByValue: true
      });
      const val = evalRes && evalRes.result && evalRes.result.value ? evalRes.result.value : {};
      console.log(`   Preview: [${val.url || target.path}] "${val.text || ''}"`);

      // Capture screenshot
      const res = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });

      const buffer = Buffer.from(res.data, 'base64');
      const outAssets = path.join(SCREENSHOTS_DIR, target.name);
      const outFastlane = path.join(FASTLANE_DIR, target.name);

      fs.writeFileSync(outAssets, buffer);
      fs.writeFileSync(outFastlane, buffer);

      console.log(`   ✅ Saved (${(buffer.length / 1024).toFixed(1)} KB) -> ${target.name}`);
    }

    console.log('\n🎉 ALL 9 REAL HIGH-RES SCREENSHOTS CAPTURED SUCCESSFULLY!');
    ws.close();
  } catch (err) {
    console.error('❌ Error during screenshot capture:', err);
  } finally {
    try { chromeProc.kill(); } catch (_) {}
    server.close();
    try { fs.rmSync(TEMP_USER_DATA, { recursive: true, force: true }); } catch (_) {}
  }
}

main();
