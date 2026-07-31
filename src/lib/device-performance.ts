/**
 * Device Performance Detection Utility
 * Real FPS benchmarking + hardware detection for progressive enhancement
 * Targets 30+ FPS on 2016+ devices (1.5GB RAM, 4 cores, budget GPU)
 */

export interface DeviceCapabilities {
  cpuCores: number;
  deviceMemory: number | null;
  connectionType: string | null;
  effectiveConnectionType: string | null;
  saveDataMode: boolean;
  isMobile: boolean;
  gpuRenderer: string | null;
  webglSupport: 'webgl2' | 'webgl1' | 'none';
  maxTextureSize: number;
  screenRefreshRate: number;
  devicePixelRatio: number;
}

export interface LowEndDeviceThresholds {
  minCpuCores: number;
  minDeviceMemory: number;
  slowConnectionTypes: string[];
  slowEffectiveConnectionTypes: string[];
  maxTextureSize: number;
}

const DEFAULT_THRESHOLDS: LowEndDeviceThresholds = {
  minCpuCores: 4,
  minDeviceMemory: 2,
  slowConnectionTypes: ['slow-2g', '2g', '3g'],
  slowEffectiveConnectionTypes: ['slow-2g', '2g', '3g'],
  maxTextureSize: 4096,
};

export interface AnimationTier {
  tier: 'high' | 'medium' | 'low' | 'minimal';
  fps: number;
  shouldReduceAnimations: boolean;
  shouldDisableLayoutAnimations: boolean;
  shouldDisableStagger: boolean;
  /**
   * When true, `backdrop-filter: blur(...)` should be replaced with solid
   * backgrounds.  Multiple simultaneous backdrop-blurs on Mali-400/450 GPUs
   * (40% of 2016–2019 budget Android devices) consume 30+ ms per frame in
   * shader readback alone, which eats the ENTIRE 30 FPS (33.3ms) frame budget.
   */
  shouldDisableBackdropBlur: boolean;
  maxConcurrentAnimations: number;
  staggerLimit: number;
  particleCount: number;
  reasons: string[];
}

const TIER_DEFAULTS: Record<AnimationTier['tier'], Omit<AnimationTier, 'tier' | 'fps' | 'reasons'>> = {
  high: {
    shouldReduceAnimations: false,
    shouldDisableLayoutAnimations: false,
    shouldDisableStagger: false,
    shouldDisableBackdropBlur: false,
    maxConcurrentAnimations: 20,
    staggerLimit: 50,
    particleCount: 100,
  },
  medium: {
    shouldReduceAnimations: true,
    shouldDisableLayoutAnimations: true,
    shouldDisableStagger: false,
    shouldDisableBackdropBlur: false,
    maxConcurrentAnimations: 10,
    staggerLimit: 20,
    particleCount: 30,
  },
  low: {
    shouldReduceAnimations: true,
    shouldDisableLayoutAnimations: true,
    shouldDisableStagger: true,
    shouldDisableBackdropBlur: true,
    maxConcurrentAnimations: 5,
    staggerLimit: 10,
    particleCount: 10,
  },
  minimal: {
    shouldReduceAnimations: true,
    shouldDisableLayoutAnimations: true,
    shouldDisableStagger: true,
    shouldDisableBackdropBlur: true,
    maxConcurrentAnimations: 0,
    staggerLimit: 0,
    particleCount: 0,
  },
};

/**
 * Get device capabilities from browser APIs
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  const capabilities: DeviceCapabilities = {
    cpuCores: navigator.hardwareConcurrency || 4,
    deviceMemory: null,
    connectionType: null,
    effectiveConnectionType: null,
    saveDataMode: false,
    isMobile: /Mobi|Android/i.test(navigator.userAgent),
    gpuRenderer: null,
    webglSupport: 'none',
    maxTextureSize: 0,
    screenRefreshRate: 60,
    devicePixelRatio: window.devicePixelRatio || 1,
  };

  if ('deviceMemory' in navigator) {
    capabilities.deviceMemory = (navigator as any).deviceMemory;
  }

  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    capabilities.connectionType = connection.type || null;
    capabilities.effectiveConnectionType = connection.effectiveType || null;
    capabilities.saveDataMode = connection.saveData || false;
  }

  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      capabilities.webglSupport = gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl1';
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        capabilities.gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || null;
      }
      capabilities.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    }
  } catch {
    // WebGL not available
  }

  return capabilities;
}

/**
 * Run real FPS benchmark (CSS transforms + Canvas 2D + WebGL)
 * Returns average FPS across 3 tests weighted by importance
 */
export async function runFPSBenchmark(): Promise<{
  css: { fps: number; jankScore: number };
  canvas: { fps: number; jankScore: number };
  webgl: { fps: number; jankScore: number };
  composite: { fps: number; tier: AnimationTier['tier'] };
}> {
  const results = { css: { fps: 60, jankScore: 0 }, canvas: { fps: 60, jankScore: 0 }, webgl: { fps: 60, jankScore: 0 } };

  await Promise.all([
    runCSSTest().then(r => { results.css = r; }),
    runCanvasTest().then(r => { results.canvas = r; }),
    runWebGLTest().then(r => { results.webgl = r; }),
  ]);

  const compositeFPS = Math.round(results.css.fps * 0.4 + results.canvas.fps * 0.3 + results.webgl.fps * 0.3);
  const tier = compositeFPS >= 55 ? 'high' : compositeFPS >= 40 ? 'medium' : compositeFPS >= 25 ? 'low' : 'minimal';

  return { ...results, composite: { fps: compositeFPS, tier } };
}

function runCSSTest(): Promise<{ fps: number; jankScore: number }> {
  return new Promise(resolve => {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:200px;height:200px;';
    const box = document.createElement('div');
    box.style.cssText = 'width:100%;height:100%;background:linear-gradient(45deg,red,blue);will-change:transform;';
    container.appendChild(box);
    document.body.appendChild(container);

    let frames = 0;
    let lastTime = performance.now();
    let jankFrames = 0;
    const startTime = performance.now();

    function tick(now: number) {
      frames++;
      const delta = now - lastTime;
      if (delta > 20) jankFrames++;
      lastTime = now;

      const elapsed = now - startTime;
      box.style.transform = `translate3d(${Math.sin(elapsed * 0.001) * 50}px, ${Math.cos(elapsed * 0.001) * 50}px, 0) scale(${1 + Math.sin(elapsed * 0.002) * 0.1})`;

      if (elapsed < 350) {
        requestAnimationFrame(tick);
      } else {
        document.body.removeChild(container);
        const fps = Math.round((frames / elapsed) * 1000);
        const jankScore = jankFrames / frames;
        resolve({ fps: Math.min(60, fps), jankScore });
      }
    }
    requestAnimationFrame(tick);
  });
}

function runCanvasTest(): Promise<{ fps: number; jankScore: number }> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;

    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * 300,
      y: Math.random() * 300,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      r: 2 + Math.random() * 3,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
    }));

    let frames = 0;
    let lastTime = performance.now();
    let jankFrames = 0;
    const startTime = performance.now();

    function tick(now: number) {
      frames++;
      const delta = now - lastTime;
      if (delta > 20) jankFrames++;
      lastTime = now;

      ctx.clearRect(0, 0, 300, 300);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 300) p.vx *= -1;
        if (p.y < 0 || p.y > 300) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      }

      if (now - startTime < 350) {
        requestAnimationFrame(tick);
      } else {
        document.body.removeChild(canvas);
        const fps = Math.round((frames / (now - startTime)) * 1000);
        const jankScore = jankFrames / frames;
        resolve({ fps: Math.min(60, fps), jankScore });
      }
    }
    requestAnimationFrame(tick);
  });
}

function runWebGLTest(): Promise<{ fps: number; jankScore: number }> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.cssText = 'position:fixed;top:-9999px;left:-9999px;';
    document.body.appendChild(canvas);
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    if (!gl) {
      document.body.removeChild(canvas);
      resolve({ fps: 60, jankScore: 0 });
      return;
    }

    const vsSource = `
      attribute vec2 a_position;
      uniform vec2 u_resolution;
      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
      }
    `;
    const fsSource = `
      precision mediump float;
      uniform float u_time;
      void main() {
        vec2 uv = gl_FragCoord.xy / 200.0;
        float color = sin(uv.x * 10.0 + u_time) * cos(uv.y * 10.0 + u_time) * 0.5 + 0.5;
        gl_FragColor = vec4(color, color * 0.5, 1.0 - color, 1.0);
      }
    `;

    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }

    const program = gl.createProgram()!;
    gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
    gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 200, 0, 0, 200, 200, 200]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(resolutionLocation, 200, 200);

    let frames = 0;
    let lastTime = performance.now();
    let jankFrames = 0;
    const startTime = performance.now();

    function tick(now: number) {
      frames++;
      const delta = now - lastTime;
      if (delta > 20) jankFrames++;
      lastTime = now;

      gl.uniform1f(timeLocation, now * 0.001);
      gl.viewport(0, 0, 200, 200);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

       if (now - startTime < 350) {
         requestAnimationFrame(tick);
       } else {
         document.body.removeChild(canvas);
         const fps = Math.round((frames / (now - startTime)) * 1000);
         const jankScore = jankFrames / frames;
resolve({ fps: Math.min(60, fps), jankScore });
        }
      }
    requestAnimationFrame(tick);
  });
}

/**
 * Determine animation tier from benchmark + hardware + user preference
 */
export function determineAnimationTier(
  benchmark: { composite: { fps: number; tier: AnimationTier['tier'] } } | null,
  capabilities: DeviceCapabilities,
  prefersReducedMotion: boolean
): AnimationTier {
  if (prefersReducedMotion) {
    return { ...TIER_DEFAULTS.minimal, tier: 'minimal', fps: 60, reasons: ['User prefers reduced motion'] };
  }

  const reasons: string[] = [];
  let score = 0;

  if (benchmark) {
    if (benchmark.composite.fps < 25) {
      score += 3;
      reasons.push(`Benchmark FPS: ${benchmark.composite.fps}`);
    } else if (benchmark.composite.fps < 40) {
      score += 2;
      reasons.push(`Benchmark FPS: ${benchmark.composite.fps}`);
    } else if (benchmark.composite.fps < 55) {
      score += 1;
      reasons.push(`Benchmark FPS: ${benchmark.composite.fps}`);
    }
  }

  if (capabilities.cpuCores < DEFAULT_THRESHOLDS.minCpuCores) {
    score += 1;
    reasons.push(`CPU cores: ${capabilities.cpuCores}`);
  }

  if (capabilities.deviceMemory !== null && capabilities.deviceMemory < DEFAULT_THRESHOLDS.minDeviceMemory) {
    score += 1;
    reasons.push(`Device memory: ${capabilities.deviceMemory}GB`);
  }

  if (capabilities.effectiveConnectionType && DEFAULT_THRESHOLDS.slowEffectiveConnectionTypes.includes(capabilities.effectiveConnectionType)) {
    score += 1;
    reasons.push(`Connection: ${capabilities.effectiveConnectionType}`);
  }

  if (capabilities.maxTextureSize > 0 && capabilities.maxTextureSize < DEFAULT_THRESHOLDS.maxTextureSize) {
    score += 1;
    reasons.push(`Max texture: ${capabilities.maxTextureSize}`);
  }

  let tier: AnimationTier['tier'];
  if (score >= 4) tier = 'minimal';
  else if (score >= 3) tier = 'low';
  else if (score >= 2) tier = 'medium';
  else tier = 'high';

  const base = TIER_DEFAULTS[tier];
  return { ...base, tier, fps: benchmark?.composite.fps ?? 60, reasons };
}

/**
 * Hook for components to get current animation tier.
 *
 * Storage: localStorage with a 7-day TTL (instead of sessionStorage).
 * Previously every cold boot re-ran the 4.5s FPS benchmark and stole frames
 * during the splash animation; now the cached tier is reused for a week.
 */
const TIER_STORAGE_KEY = 'animation-tier';
const TIER_STORAGE_META_KEY = 'animation-tier-meta';
const TIER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function getAnimationTier(): AnimationTier {
  if (typeof window === 'undefined') {
    return { ...TIER_DEFAULTS.high, tier: 'high', fps: 60, reasons: ['SSR'] };
  }

  const capabilities = getDeviceCapabilities();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Check localStorage cache with TTL — avoids re-running the 4.5s FPS
  // benchmark on every cold boot.
  try {
    const cached = localStorage.getItem(TIER_STORAGE_KEY);
    const cachedMeta = localStorage.getItem(TIER_STORAGE_META_KEY);
    if (cached && cachedMeta) {
      const meta = JSON.parse(cachedMeta) as { savedAt: number };
      if (Date.now() - meta.savedAt < TIER_TTL_MS) {
        const parsed = JSON.parse(cached) as AnimationTier;
        // If user changed system-wide reduced-motion preference since we
        // cached, honor it immediately rather than waiting 7 days.
        if (prefersReducedMotion === parsed.shouldReduceAnimations) {
          applyTieredVisualOverrides(parsed);
          return parsed;
        }
      }
    }
  } catch {
    /* storage disabled / corrupt — fall through to benchmark */
  }

  // Run benchmark async, return high tier immediately for first paint.
  Promise.resolve()
    .then(() => runFPSBenchmark())
    .then((benchmark) => {
      const tier = determineAnimationTier(benchmark, capabilities, prefersReducedMotion);
      try {
        localStorage.setItem(TIER_STORAGE_KEY, JSON.stringify(tier));
        localStorage.setItem(
          TIER_STORAGE_META_KEY,
          JSON.stringify({ savedAt: Date.now() }),
        );
      } catch {
        /* quota exceeded or private mode — don't crash */
      }
      applyTieredVisualOverrides(tier);
      window.dispatchEvent(new CustomEvent('animation-tier-changed', { detail: tier }));
    });

  const initial: AnimationTier = {
    ...TIER_DEFAULTS.high,
    tier: 'high',
    fps: 60,
    reasons: ['Initial (benchmark pending)'],
  };
  applyTieredVisualOverrides(initial);
  return initial;
}

/**
 * Applies global CSS classes to `document.documentElement` based on the tier.
 * Stylesheet rules in index.css can then target:
 *   html.reduce-blur .backdrop-blur-sm,
 *   html.reduce-blur [class*="backdrop-blur"] { ... }
 * — this zeroes out backdrop-filter for low/minimal tiers WITHOUT touching
 * every component (avoids a 20-file sweep and keeps diffs minimal).
 */
export function applyTieredVisualOverrides(tier: Pick<AnimationTier, 'shouldDisableBackdropBlur' | 'tier'>): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('reduce-blur', !!tier.shouldDisableBackdropBlur);
  root.dataset.animationTier = tier.tier;
}

