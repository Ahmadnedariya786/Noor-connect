import { useState, useEffect, useCallback } from 'react';

export interface AnimationTier {
  tier: 'high' | 'medium' | 'low' | 'minimal';
  fps: number;
  reasons: string[];
  shouldAnimate: boolean;
  shouldReduceAnimations: boolean;
  maxConcurrentAnimations: number;
  staggerLimit: number;
}

const TIER_DEFAULTS: Record<AnimationTier['tier'], Omit<AnimationTier, 'tier' | 'fps' | 'reasons'>> = {
  high: {
    shouldAnimate: true,
    shouldReduceAnimations: false,
    maxConcurrentAnimations: 50,
    staggerLimit: 100,
  },
  medium: {
    shouldAnimate: true,
    shouldReduceAnimations: true,
    maxConcurrentAnimations: 20,
    staggerLimit: 50,
  },
  low: {
    shouldAnimate: true,
    shouldReduceAnimations: true,
    maxConcurrentAnimations: 10,
    staggerLimit: 20,
  },
  minimal: {
    shouldAnimate: false,
    shouldReduceAnimations: true,
    maxConcurrentAnimations: 0,
    staggerLimit: 0,
  },
};

interface BenchmarkResult {
  css: { fps: number; jankScore: number };
  canvas: { fps: number; jankScore: number };
  webgl: { fps: number; jankScore: number };
  composite: { fps: number; tier: AnimationTier['tier'] };
}

function runCSSBenchmark(): Promise<{ fps: number; jankScore: number }> {
  return new Promise(resolve => {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:-100px;width:100px;height:100px;will-change:transform;';
    document.body.appendChild(el);
    
    const frames: number[] = [];
    let last = performance.now();
    let cancelled = false;
    
    const tick = (now: number) => {
      if (cancelled) return;
      frames.push(now - last);
      last = now;
      el.style.transform = `translateX(${Math.sin(now / 100) * 50}px)`;
      
      if (frames.length < 60) {
        requestAnimationFrame(tick);
      } else {
        document.body.removeChild(el);
        const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
        const fps = 1000 / avgFrameTime;
        const jankFrames = frames.filter(f => f > 16.67).length;
        resolve({ fps, jankScore: jankFrames / frames.length });
      }
    };
    requestAnimationFrame(tick);
  });
}

function runCanvasBenchmark(): Promise<{ fps: number; jankScore: number }> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.cssText = 'position:fixed;top:-200px;';
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext('2d')!;
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * 200,
      y: Math.random() * 200,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 3 + 1,
    }));
    
    const frames: number[] = [];
    let last = performance.now();
    let cancelled = false;
    
    const tick = (now: number) => {
      if (cancelled) return;
      frames.push(now - last);
      last = now;
      
      ctx.clearRect(0, 0, 200, 200);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > 200) p.vx *= -1;
        if (p.y < 0 || p.y > 200) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${now / 10}, 70%, 60%)`;
        ctx.fill();
      });
      
      if (frames.length < 60) {
        requestAnimationFrame(tick);
      } else {
        document.body.removeChild(canvas);
        const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
        const fps = 1000 / avgFrameTime;
        const jankFrames = frames.filter(f => f > 16.67).length;
        resolve({ fps, jankScore: jankFrames / frames.length });
      }
    };
    requestAnimationFrame(tick);
  });
}

function runWebGLBenchmark(): Promise<{ fps: number; jankScore: number }> {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    canvas.style.cssText = 'position:fixed;top:-200px;';
    document.body.appendChild(canvas);
    
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      document.body.removeChild(canvas);
      resolve({ fps: 0, jankScore: 1 });
      return;
    }
    
    const vsSource = `
      attribute vec2 a_position;
      uniform float u_time;
      void main() {
        vec2 pos = a_position + vec2(sin(u_time + a_position.x * 10.0), cos(u_time + a_position.y * 10.0)) * 0.05;
        gl_Position = vec4(pos, 0.0, 1.0);
        gl_PointSize = 3.0;
      }
    `;
    
    const fsSource = `
      precision mediump float;
      uniform float u_time;
      void main() {
        gl_FragColor = vec4(sin(u_time), cos(u_time), sin(u_time + 3.14), 1.0);
      }
    `;
    
    function createShader(gl: WebGLRenderingContext, type: number, source: string) {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    }
    
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS) || !gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      document.body.removeChild(canvas);
      resolve({ fps: 0, jankScore: 1 });
      return;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      document.body.removeChild(canvas);
      resolve({ fps: 0, jankScore: 1 });
      return;
    }
    gl.useProgram(program);
    
    const positions = new Float32Array(1000 * 2);
    for (let i = 0; i < 1000; i++) {
      positions[i * 2] = Math.random() * 2 - 1;
      positions[i * 2 + 1] = Math.random() * 2 - 1;
    }
    
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    
    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
    
    const timeLoc = gl.getUniformLocation(program, 'u_time');
    
    const frames: number[] = [];
    let last = performance.now();
    let cancelled = false;
    
    const tick = (now: number) => {
      if (cancelled) return;
      frames.push(now - last);
      last = now;
      
      gl.uniform1f(timeLoc, now / 1000);
      gl.drawArrays(gl.POINTS, 0, 1000);
      
      if (frames.length < 60) {
        requestAnimationFrame(tick);
      } else {
        document.body.removeChild(canvas);
        const avgFrameTime = frames.reduce((a, b) => a + b, 0) / frames.length;
        const fps = 1000 / avgFrameTime;
        const jankFrames = frames.filter(f => f > 16.67).length;
        resolve({ fps, jankScore: jankFrames / frames.length });
      }
    };
    requestAnimationFrame(tick);
  });
}

async function runFullBenchmark(): Promise<BenchmarkResult> {
  const [css, canvas, webgl] = await Promise.all([
    runCSSBenchmark(),
    runCanvasBenchmark(),
    runWebGLBenchmark(),
  ]);
  
  const weights = { css: 0.4, canvas: 0.3, webgl: 0.3 };
  const compositeFPS = css.fps * weights.css + canvas.fps * weights.canvas + webgl.fps * weights.webgl;
  
  let tier: AnimationTier['tier'] = 'high';
  if (compositeFPS < 20) tier = 'minimal';
  else if (compositeFPS < 35) tier = 'low';
  else if (compositeFPS < 50) tier = 'medium';
  
  return { css, canvas, webgl, composite: { fps: compositeFPS, tier } };
}

function determineTier(benchmark: BenchmarkResult): AnimationTier['tier'] {
  return benchmark.composite.tier;
}

function getInitialTier(): AnimationTier['tier'] {
  if (typeof window === 'undefined') return 'high';
  
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return 'minimal';
  
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as any).deviceMemory || 4;
  
  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

let currentTier: AnimationTier['tier'] = getInitialTier();
const listeners = new Set<(tier: AnimationTier) => void>();

let monitorRafId: number | null = null;
let monitorFrameCount = 0;
let monitorLastTime = performance.now();
let monitorRefCount = 0;
const fpsCallbacks = new Set<(fps: number) => void>();

function startMonitor() {
  if (monitorRafId !== null) return;

  const tick = () => {
    monitorFrameCount++;
    const now = performance.now();
    if (now - monitorLastTime >= 1000) {
      const fps = monitorFrameCount;
      monitorFrameCount = 0;
      monitorLastTime = now;

      fpsCallbacks.forEach(fn => fn(fps));

      if (fps < 20 && currentTier !== 'minimal') {
        currentTier = 'minimal';
        const tierObj = createTierObject('minimal', fps, [`Runtime FPS dropped to ${fps}`]);
        notifyListeners(tierObj);
      } else if (fps < 35 && currentTier === 'high') {
        currentTier = 'low';
        const tierObj = createTierObject('low', fps, [`Runtime FPS dropped to ${fps}`]);
        notifyListeners(tierObj);
      } else if (fps < 50 && currentTier === 'high') {
        currentTier = 'medium';
        const tierObj = createTierObject('medium', fps, [`Runtime FPS dropped to ${fps}`]);
        notifyListeners(tierObj);
      }
    }
    monitorRafId = requestAnimationFrame(tick);
  };

  monitorRafId = requestAnimationFrame(tick);
}

function stopMonitor() {
  if (monitorRafId !== null) {
    cancelAnimationFrame(monitorRafId);
    monitorRafId = null;
  }
}

function notifyListeners(tier: AnimationTier) {
  listeners.forEach(fn => fn(tier));
}

function createTierObject(tier: AnimationTier['tier'], fps: number, reasons: string[]): AnimationTier {
  return {
    ...TIER_DEFAULTS[tier],
    tier,
    fps,
    reasons,
  };
}

export function useAnimationTier(): AnimationTier {
  const [tier, setTier] = useState<AnimationTier>(() => createTierObject(currentTier, 60, ['Initial']));
  const [benchmarkDone, setBenchmarkDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const handleTierChange = (newTier: AnimationTier) => {
      if (!cancelled) setTier(newTier);
    };

    listeners.add(handleTierChange);
    
    if (currentTier !== 'high' || !benchmarkDone) {
      setTier(createTierObject(currentTier, 60, ['Initial heuristic']));
    }

    const runBenchmark = async () => {
      try {
        if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
          await (window as any).scheduler.postTask(async () => {
            const benchmark = await runFullBenchmark();
            const newTier = determineTier(benchmark);
            currentTier = newTier;
            const tierObj = createTierObject(newTier, benchmark.composite.fps, [
              `CSS: ${benchmark.css.fps.toFixed(1)}fps (jank: ${(benchmark.css.jankScore * 100).toFixed(0)}%)`,
              `Canvas: ${benchmark.canvas.fps.toFixed(1)}fps (jank: ${(benchmark.canvas.jankScore * 100).toFixed(0)}%)`,
              `WebGL: ${benchmark.webgl.fps.toFixed(1)}fps (jank: ${(benchmark.webgl.jankScore * 100).toFixed(0)}%)`,
            ]);
            if (!cancelled) {
              setTier(tierObj);
              setBenchmarkDone(true);
              notifyListeners(tierObj);
            }
          });
        } else {
          await new Promise(r => requestIdleCallback(r, { timeout: 3000 }));
          if (cancelled) return;
          const benchmark = await runFullBenchmark();
          const newTier = determineTier(benchmark);
          currentTier = newTier;
          const tierObj = createTierObject(newTier, benchmark.composite.fps, [
            `CSS: ${benchmark.css.fps.toFixed(1)}fps (jank: ${(benchmark.css.jankScore * 100).toFixed(0)}%)`,
            `Canvas: ${benchmark.canvas.fps.toFixed(1)}fps (jank: ${(benchmark.canvas.jankScore * 100).toFixed(0)}%)`,
            `WebGL: ${benchmark.webgl.fps.toFixed(1)}fps (jank: ${(benchmark.webgl.jankScore * 100).toFixed(0)}%)`,
          ]);
          if (!cancelled) {
            setTier(tierObj);
            setBenchmarkDone(true);
            notifyListeners(tierObj);
          }
        }
      } catch (e) {
        console.warn('Animation benchmark failed:', e);
        if (!cancelled) {
          setBenchmarkDone(true);
        }
      }
    };

    runBenchmark();

    monitorRefCount++;
    if (monitorRefCount === 1) {
      startMonitor();
    }

    return () => {
      cancelled = true;
      listeners.delete(handleTierChange);
      monitorRefCount--;
      if (monitorRefCount === 0) {
        stopMonitor();
      }
    };
  }, [benchmarkDone]);

  // Allow components to subscribe to FPS changes
  const onFPSChange = useCallback((callback: (fps: number) => void) => {
    fpsCallbacks.add(callback);
    return () => { fpsCallbacks.delete(callback); };
  }, []);

  return { ...tier, onFPSChange };
}

export function getAnimationTier(): AnimationTier {
  return createTierObject(currentTier, 60, ['Sync access']);
}

export function subscribeToTierChanges(callback: (tier: AnimationTier) => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}