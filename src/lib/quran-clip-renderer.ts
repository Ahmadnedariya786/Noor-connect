/**
 * Noor Connect — Quran Clip Studio Canvas & WebAudio Engine
 *
 * In-app Quran Ayah image card & recitation video (Reel / Story / Post) generator.
 * Features 7 Mandatory Android WebView Hardware & Audio Safeguards:
 *  1. Font Readiness Gate (No tofu boxes or unstyled fallback fonts)
 *  2. CORS-Safe Audio Fetching & Main-Thread Yielding (CacheStorage + EveryAyah CDN)
 *  3. Offscreen Static Layer Pre-Rendering (Word-wrap & static layers cached to offscreen bitmaps)
 *  4. Hardware audioContext.currentTime Master Clock (0.00s Lip-Sync Precision)
 *  5. Android Social Share Codec Priority (.mp4 First with .webm fallback)
 *  6. Canvas Context Loss Recovery (clean abort & user notice on GPU reset)
 *  7. Bulletproof Android Filesystem.Cache Write & Share.share Handling (with silent cancel catch)
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { OFFLINE_AUDIO_CACHE_NAME } from '@/lib/offline-audio';
import { getPrimaryAyahAudioUrl, getSecondaryAyahAudioUrl } from '@/lib/tilawah-data';
import { getReciterById } from '@/lib/quran-reciters';

export type AspectRatioType = '9:16' | '1:1' | '16:9';

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface ClipAyahData {
  ayahNumber: number;
  textUthmani: string;
  translation?: string;
  surahNumber: number;
}

export interface ClipAyahTimelineItem {
  ayahNumber: number;
  audioBuffer: AudioBuffer;
  startTime: number;
  endTime: number;
}

export type SceneId =
  | 'moonlit-ocean'
  | 'desert-sunset'
  | 'kiswah-gold'
  | 'rawdah-emerald'
  | 'cosmic-nebula'
  | 'burgundy-velvet'
  | 'bosphorus-mist'
  | 'dawn-glow'
  | 'persian-arch'
  | 'mushaf-parchment';

export interface SceneDefinition {
  id: SceneId;
  name: string;
  subtitle: string;
  icon: string;
  previewGradient: string;
}

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {
    id: 'moonlit-ocean',
    name: 'Moonlit Ocean',
    subtitle: 'Dark waves & full moon reflections',
    icon: '🌊',
    previewGradient: 'linear-gradient(135deg, #030712 0%, #0a192f 50%, #1e293b 100%)',
  },
  {
    id: 'desert-sunset',
    name: 'Desert Sunset',
    subtitle: 'Golden dunes & warm sunset horizon',
    icon: '🏜️',
    previewGradient: 'linear-gradient(135deg, #1a0928 0%, #7c2d12 50%, #f59e0b 100%)',
  },
  {
    id: 'kiswah-gold',
    name: 'Kiswah & Gold',
    subtitle: 'Obsidian fabric & 24K gold filigree',
    icon: '🕋',
    previewGradient: 'linear-gradient(135deg, #09090b 0%, #1c1917 50%, #dca349 100%)',
  },
  {
    id: 'rawdah-emerald',
    name: 'Rawdah Sanctuary',
    subtitle: 'Obsidian pine & Green Dome silhouette',
    icon: '🕌',
    previewGradient: 'linear-gradient(135deg, #02140b 0%, #063b22 50%, #45b88c 100%)',
  },
  {
    id: 'cosmic-nebula',
    name: 'Cosmic Nebula',
    subtitle: 'Deep starfield & violet nebula waves',
    icon: '✨',
    previewGradient: 'linear-gradient(135deg, #02040a 0%, #4c1d95 50%, #0e7490 100%)',
  },
  {
    id: 'burgundy-velvet',
    name: 'Burgundy Mihrab',
    subtitle: 'Deep onyx velvet & ornate pointed arch',
    icon: '🏮',
    previewGradient: 'linear-gradient(135deg, #0c0507 0%, #3b0813 50%, #c24552 100%)',
  },
  {
    id: 'bosphorus-mist',
    name: 'Bosphorus Mist',
    subtitle: 'Deep sapphire ocean & rolling mist',
    icon: '🌫️',
    previewGradient: 'linear-gradient(135deg, #020b1e 0%, #0a2550 50%, #6a9af2 100%)',
  },
  {
    id: 'dawn-glow',
    name: 'Honey Dawn Glow',
    subtitle: 'Midnight plum & amber horizon light',
    icon: '🌅',
    previewGradient: 'linear-gradient(135deg, #140727 0%, #4c1d95 50%, #f59e0b 100%)',
  },
  {
    id: 'persian-arch',
    name: 'Persian Indigo',
    subtitle: 'Midnight indigo & celestial arch',
    icon: '🏛️',
    previewGradient: 'linear-gradient(135deg, #08061d 0%, #1a1242 50%, #b8c4ff 100%)',
  },
  {
    id: 'mushaf-parchment',
    name: 'Mushaf Parchment',
    subtitle: 'Minimalist antique vellum & gold rule',
    icon: '📜',
    previewGradient: 'linear-gradient(135deg, #14110e 0%, #231c15 50%, #b87f28 100%)',
  },
];

export const ASPECT_RATIO_PRESETS: Record<
  AspectRatioType,
  { video: CanvasDimensions; image: CanvasDimensions; label: string }
> = {
  '9:16': {
    video: { width: 720, height: 1280 },
    image: { width: 1080, height: 1920 },
    label: '9:16 Reel / Story',
  },
  '1:1': {
    video: { width: 720, height: 720 },
    image: { width: 1080, height: 1080 },
    label: '1:1 Square Post',
  },
  '16:9': {
    video: { width: 1280, height: 720 },
    image: { width: 1920, height: 1080 },
    label: '16:9 Landscape',
  },
};

export interface RenderProgressUpdate {
  stage: 'fonts' | 'audio' | 'rendering' | 'encoding' | 'complete';
  currentAyah?: number;
  totalAyahs?: number;
  percent: number;
  statusText: string;
}

/**
 * Cleanly strips Arabic diacritics / harakat while preserving base Arabic glyphs
 */
export function stripTashkeel(text: string): string {
  if (!text) return '';
  return text.replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * SAFEGUARD 1 — Font Readiness Gate
 * Verifies Amiri, Scheherazade New, and Nastaliq fonts are ready before canvas drawing
 */
export async function ensureFontsReady(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  try {
    await Promise.allSettled([
      document.fonts.load('700 40px "Amiri"'),
      document.fonts.load('400 28px "Scheherazade New"'),
      document.fonts.load('400 28px "Noto Nastaliq Urdu"'),
      document.fonts.load('600 20px system-ui'),
    ]);
    await document.fonts.ready;
  } catch (err) {
    console.warn('[QuranClipRenderer] Font readiness check notice:', err);
  }
}

/**
 * Decodes an ArrayBuffer using AudioContext with dual promise/callback fallback
 */
function decodeAudioDataSafe(ctx: AudioContext, buffer: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    // Clone buffer because decodeAudioData detaches memory in Chromium
    const cloned = buffer.slice(0);
    try {
      const promise = ctx.decodeAudioData(
        cloned,
        (decoded) => resolve(decoded),
        (err) => reject(err || new Error('AudioBuffer decode failed'))
      );
      if (promise && typeof promise.then === 'function') {
        promise.then(resolve).catch(reject);
      }
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * SAFEGUARD 2 — CORS-Safe Audio Fetching & Main-Thread Yielding
 * Checks offline CacheStorage first, then falls back to EveryAyah CDN with AbortSignal
 */
export async function fetchAyahAudioBuffer(
  reciterId: string,
  surah: number,
  ayah: number,
  audioContext: AudioContext,
  signal?: AbortSignal
): Promise<AudioBuffer> {
  const reciter = getReciterById(reciterId);
  const primaryUrl = getPrimaryAyahAudioUrl(reciter.id, surah, ayah);
  const secondaryUrl = getSecondaryAyahAudioUrl(reciter.everyAyahDir, surah, ayah);

  let rawBuffer: ArrayBuffer | null = null;

  // 1. Check offline CacheStorage first
  if (typeof window !== 'undefined' && 'caches' in window) {
    try {
      const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
      const match = (await cache.match(primaryUrl)) || (await cache.match(secondaryUrl));
      if (match) {
        rawBuffer = await match.arrayBuffer();
      }
    } catch (cacheErr) {
      console.warn(`[QuranClipRenderer] CacheStorage lookup notice for ${surah}:${ayah}`, cacheErr);
    }
  }

  // 2. Online fetch if not in cache
  if (!rawBuffer) {
    const urlsToTry = [primaryUrl, secondaryUrl].filter(Boolean);
    let fetchError: Error | null = null;

    for (const url of urlsToTry) {
      if (signal?.aborted) {
        throw new DOMException('Download aborted by user', 'AbortError');
      }
      try {
        const response = await fetch(url, {
          mode: 'cors',
          signal,
          headers: { Accept: 'audio/mpeg, audio/*; q=0.9, */*; q=0.5' },
        });
        if (response.ok) {
          rawBuffer = await response.arrayBuffer();
          break;
        }
      } catch (err) {
        fetchError = err instanceof Error ? err : new Error(String(err));
      }
    }

    if (!rawBuffer) {
      throw fetchError || new Error(`Could not download audio for Ayah ${surah}:${ayah}`);
    }
  }

  // 3. Decode into AudioBuffer
  const audioBuffer = await decodeAudioDataSafe(audioContext, rawBuffer);

  // 4. Yield to main thread
  await new Promise((r) => setTimeout(r, 0));

  return audioBuffer;
}

/**
 * Multi-line canvas word-wrapping algorithm
 */
export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Sharia-Safe 8-Pointed Khatam Star Medallion (Two overlapping squares rotated 45°)
 */
export function drawKhatamMedallion(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  numberText: string,
  goldColor = '#DCA349'
): void {
  ctx.save();
  ctx.translate(cx, cy);

  // Outer glow
  ctx.shadowColor = 'rgba(220, 163, 73, 0.4)';
  ctx.shadowBlur = radius * 0.4;

  // First Square
  const half = radius * 0.85;
  ctx.strokeStyle = goldColor;
  ctx.lineWidth = Math.max(1.5, radius * 0.08);
  ctx.strokeRect(-half, -half, half * 2, half * 2);

  // Second Square (Rotated 45 degrees)
  ctx.rotate(Math.PI / 4);
  ctx.strokeRect(-half, -half, half * 2, half * 2);

  // Inner subtle circle
  ctx.rotate(-Math.PI / 4);
  ctx.beginPath();
  ctx.arc(0, 0, half * 0.75, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6, 9, 17, 0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(220, 163, 73, 0.6)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Number text inside medallion
  ctx.shadowBlur = 0;
  ctx.fillStyle = goldColor;
  ctx.font = `bold ${Math.round(radius * 0.75)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(numberText, 0, 1);

  ctx.restore();
}

/**
 * Draw 10 Procedural Luxury & Nature Canvas Scenes (100% Offline, Zero Copyright Risk)
 */
export function drawProceduralScene(
  ctx: CanvasRenderingContext2D,
  sceneId: SceneId,
  w: number,
  h: number,
  timeSec: number
): void {
  ctx.save();

  switch (sceneId) {
    case 'moonlit-ocean': {
      // 1. Moonlit Ocean Waves
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.62);
      skyGrad.addColorStop(0, '#02050E');
      skyGrad.addColorStop(0.5, '#07152B');
      skyGrad.addColorStop(1, '#0F2744');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.62);

      // Stars
      for (let i = 0; i < 45; i++) {
        const sx = (Math.sin(i * 997.1) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 331.7) * 0.5 + 0.5) * (h * 0.55);
        const alpha = 0.3 + 0.5 * Math.sin(timeSec * 2.5 + i * 1.8);
        ctx.fillStyle = `rgba(241, 245, 249, ${Math.max(0.1, alpha)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3 === 0 ? 1.6 : 1.0), 0, Math.PI * 2);
        ctx.fill();
      }

      // Glowing Full Moon
      const mx = w * 0.5;
      const my = h * 0.22;
      const mr = Math.min(w, h) * 0.085;

      const moonGlow = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 2.8);
      moonGlow.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
      moonGlow.addColorStop(0.5, 'rgba(186, 230, 253, 0.15)');
      moonGlow.addColorStop(1, 'rgba(186, 230, 253, 0)');
      ctx.fillStyle = moonGlow;
      ctx.beginPath();
      ctx.arc(mx, my, mr * 2.8, 0, Math.PI * 2);
      ctx.fill();

      // Moon Body
      const moonBody = ctx.createRadialGradient(mx - mr * 0.2, my - mr * 0.2, mr * 0.1, mx, my, mr);
      moonBody.addColorStop(0, '#FFFFFF');
      moonBody.addColorStop(0.8, '#F1F5F9');
      moonBody.addColorStop(1, '#CBD5E1');
      ctx.fillStyle = moonBody;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();

      // Ocean Base
      const oceanGrad = ctx.createLinearGradient(0, h * 0.62, 0, h);
      oceanGrad.addColorStop(0, '#07162C');
      oceanGrad.addColorStop(0.5, '#040C1A');
      oceanGrad.addColorStop(1, '#02060D');
      ctx.fillStyle = oceanGrad;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);

      // Moonlit Water Reflection Ripples
      const startY = h * 0.62;
      for (let y = startY; y < h; y += 7) {
        const progress = (y - startY) / (h - startY);
        const spread = mr * 1.5 + progress * (w * 0.4);
        const waveOffset = Math.sin(timeSec * 3 + y * 0.08) * 8 * (1 + progress);
        const rx = mx + waveOffset;
        const alpha = (1 - progress * 0.75) * 0.35 * (0.6 + 0.4 * Math.sin(timeSec * 2 + y));

        ctx.fillStyle = `rgba(224, 242, 254, ${Math.max(0.04, alpha)})`;
        ctx.fillRect(rx - spread * 0.5, y, spread, 2.5);
      }
      break;
    }

    case 'desert-sunset': {
      // 2. Golden Desert Sunset
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.65);
      sky.addColorStop(0, '#1E0B2B');
      sky.addColorStop(0.35, '#581845');
      sky.addColorStop(0.7, '#C70039');
      sky.addColorStop(0.88, '#FF5733');
      sky.addColorStop(1, '#FFC300');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h * 0.65);

      // Sun on Horizon
      const sunY = h * 0.56;
      const sunR = Math.min(w, h) * 0.12;
      const sunGrad = ctx.createRadialGradient(w * 0.5, sunY, sunR * 0.2, w * 0.5, sunY, sunR * 2.2);
      sunGrad.addColorStop(0, '#FFFBEB');
      sunGrad.addColorStop(0.3, '#FEF08A');
      sunGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.4)');
      sunGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(w * 0.5, sunY, sunR * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Dune 1 (Back)
      ctx.fillStyle = '#78220A';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.6);
      ctx.bezierCurveTo(w * 0.3, h * 0.55, w * 0.6, h * 0.64, w, h * 0.58);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();

      // Dune 2 (Mid)
      ctx.fillStyle = '#451004';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.68);
      ctx.bezierCurveTo(w * 0.4, h * 0.73, w * 0.7, h * 0.63, w, h * 0.7);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();

      // Dune 3 (Fore)
      ctx.fillStyle = '#200701';
      ctx.beginPath();
      ctx.moveTo(0, h * 0.8);
      ctx.bezierCurveTo(w * 0.35, h * 0.76, w * 0.65, h * 0.85, w, h * 0.78);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();
      break;
    }

    case 'kiswah-gold': {
      // 3. Kaaba Kiswah Obsidian & 24K Gold Filigree
      ctx.fillStyle = '#060608';
      ctx.fillRect(0, 0, w, h);

      // Subtle diagonal silk fabric weave
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const step = 24;
      for (let x = -h; x < w + h; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + h, h);
        ctx.stroke();
      }

      // Specular gold shimmer sweep
      const sweepX = ((timeSec * 0.12) % 1.6 - 0.3) * w;
      const shimmer = ctx.createLinearGradient(sweepX - 120, 0, sweepX + 120, 0);
      shimmer.addColorStop(0, 'rgba(220, 163, 73, 0)');
      shimmer.addColorStop(0.5, 'rgba(220, 163, 73, 0.08)');
      shimmer.addColorStop(1, 'rgba(220, 163, 73, 0)');
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, 0, w, h);

      // 24K Gold Border Frame
      const pad = 24;
      ctx.strokeStyle = '#DCA349';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);

      ctx.strokeStyle = 'rgba(220, 163, 73, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(pad + 6, pad + 6, w - (pad + 6) * 2, h - (pad + 6) * 2);

      // Corner rosettes
      const rSize = 14;
      drawKhatamMedallion(ctx, pad + 6, pad + 6, rSize, '', '#DCA349');
      drawKhatamMedallion(ctx, w - pad - 6, pad + 6, rSize, '', '#DCA349');
      drawKhatamMedallion(ctx, pad + 6, h - pad - 6, rSize, '', '#DCA349');
      drawKhatamMedallion(ctx, w - pad - 6, h - pad - 6, rSize, '', '#DCA349');
      break;
    }

    case 'rawdah-emerald': {
      // 4. Rawdah Emerald Sanctuary Dome
      const greenGrad = ctx.createLinearGradient(0, 0, 0, h);
      greenGrad.addColorStop(0, '#021208');
      greenGrad.addColorStop(0.5, '#07361F');
      greenGrad.addColorStop(1, '#021007');
      ctx.fillStyle = greenGrad;
      ctx.fillRect(0, 0, w, h);

      // Green Dome (Qubbat an-Nabi) silhouette at bottom
      const domeCx = w * 0.5;
      const domeCy = h * 0.78;
      const domeR = Math.min(w, h) * 0.22;

      ctx.fillStyle = 'rgba(10, 48, 28, 0.85)';
      ctx.beginPath();
      // Dome Pointed Curve
      ctx.moveTo(domeCx - domeR, domeCy + domeR * 0.5);
      ctx.bezierCurveTo(
        domeCx - domeR * 0.9,
        domeCy - domeR * 0.8,
        domeCx - domeR * 0.3,
        domeCy - domeR,
        domeCx,
        domeCy - domeR * 1.15
      );
      ctx.bezierCurveTo(
        domeCx + domeR * 0.3,
        domeCy - domeR,
        domeCx + domeR * 0.9,
        domeCy - domeR * 0.8,
        domeCx + domeR,
        domeCy + domeR * 0.5
      );
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.fill();

      // Crescent Finial on Dome Apex
      ctx.strokeStyle = '#DCA349';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(domeCx, domeCy - domeR * 1.15);
      ctx.lineTo(domeCx, domeCy - domeR * 1.32);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(domeCx, domeCy - domeR * 1.36, 6, 0.4, 2.2 * Math.PI, false);
      ctx.stroke();

      // Ambient floating emerald sparkles
      for (let i = 0; i < 30; i++) {
        const px = (Math.sin(i * 41.2 + timeSec * 0.4) * 0.5 + 0.5) * w;
        const py = (Math.cos(i * 73.1 + timeSec * 0.3) * 0.5 + 0.5) * h;
        const pAlpha = 0.2 + 0.4 * Math.sin(timeSec * 2 + i);
        ctx.fillStyle = `rgba(69, 184, 140, ${Math.max(0.1, pAlpha)})`;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'cosmic-nebula': {
      // 5. Cosmic Nebula & Starlight Night
      ctx.fillStyle = '#010206';
      ctx.fillRect(0, 0, w, h);

      // Flowing Nebulas
      const neb1 = ctx.createRadialGradient(
        w * 0.35 + Math.sin(timeSec * 0.3) * 30,
        h * 0.4 + Math.cos(timeSec * 0.25) * 30,
        40,
        w * 0.35,
        h * 0.4,
        w * 0.65
      );
      neb1.addColorStop(0, 'rgba(88, 28, 135, 0.38)');
      neb1.addColorStop(0.5, 'rgba(76, 29, 149, 0.16)');
      neb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, w, h);

      const neb2 = ctx.createRadialGradient(
        w * 0.7 - Math.cos(timeSec * 0.35) * 25,
        h * 0.65 + Math.sin(timeSec * 0.3) * 25,
        30,
        w * 0.7,
        h * 0.65,
        w * 0.6
      );
      neb2.addColorStop(0, 'rgba(14, 116, 144, 0.32)');
      neb2.addColorStop(0.5, 'rgba(6, 78, 59, 0.14)');
      neb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, w, h);

      // Starfield
      for (let i = 0; i < 70; i++) {
        const sx = (Math.sin(i * 123.4) * 0.5 + 0.5) * w;
        const sy = (Math.cos(i * 567.8) * 0.5 + 0.5) * h;
        const twinkle = 0.25 + 0.75 * Math.abs(Math.sin(timeSec * 2 + i * 2.4));
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 5 === 0 ? 2 : 1), 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'burgundy-velvet': {
      // 6. Burgundy Velvet Royal Mihrab
      const burg = ctx.createLinearGradient(0, 0, 0, h);
      burg.addColorStop(0, '#0C0306');
      burg.addColorStop(0.5, '#2D0A14');
      burg.addColorStop(1, '#0C0306');
      ctx.fillStyle = burg;
      ctx.fillRect(0, 0, w, h);

      // Pointed Mihrab Arch Silhouette
      const archW = w * 0.84;
      const archX = (w - archW) / 2;
      const archTop = h * 0.14;
      const archApex = h * 0.08;

      ctx.strokeStyle = '#DCA349';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(archX, h);
      ctx.lineTo(archX, archTop);
      ctx.bezierCurveTo(archX, archApex * 1.4, w * 0.5 - 20, archApex, w * 0.5, archApex);
      ctx.bezierCurveTo(w * 0.5 + 20, archApex, archX + archW, archApex * 1.4, archX + archW, archTop);
      ctx.lineTo(archX + archW, h);
      ctx.stroke();

      // Hanging Fanous Lantern
      const lanX = w * 0.5;
      const lanY = archApex + 32;
      ctx.strokeStyle = '#DCA349';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(lanX, archApex);
      ctx.lineTo(lanX, lanY - 12);
      ctx.stroke();

      // Fanous body with warm flickering candle glow
      const flameFlicker = 0.7 + 0.3 * Math.sin(timeSec * 5);
      const lanGlow = ctx.createRadialGradient(lanX, lanY, 2, lanX, lanY, 28);
      lanGlow.addColorStop(0, `rgba(254, 240, 138, ${flameFlicker})`);
      lanGlow.addColorStop(0.5, 'rgba(245, 158, 11, 0.3)');
      lanGlow.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = lanGlow;
      ctx.beginPath();
      ctx.arc(lanX, lanY, 28, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#DCA349';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(lanX - 8, lanY - 10, 16, 20);
      break;
    }

    case 'bosphorus-mist': {
      // 7. Abyssal Bosphorus Sapphire Mist
      const saph = ctx.createLinearGradient(0, 0, 0, h);
      saph.addColorStop(0, '#030814');
      saph.addColorStop(0.5, '#0B1E3D');
      saph.addColorStop(1, '#040C1A');
      ctx.fillStyle = saph;
      ctx.fillRect(0, 0, w, h);

      // Rolling Mist Layers in lower half
      for (let layer = 0; layer < 3; layer++) {
        const speed = (layer + 1) * 18;
        const mistY = h * (0.6 + layer * 0.12);
        const shift = (timeSec * speed) % (w * 0.5);

        ctx.fillStyle = `rgba(106, 154, 242, ${0.07 - layer * 0.015})`;
        ctx.beginPath();
        ctx.moveTo(-shift, mistY);
        for (let x = -shift; x < w + 80; x += 60) {
          ctx.quadraticCurveTo(
            x + 30,
            mistY - 20 + Math.sin(timeSec + x * 0.02) * 10,
            x + 60,
            mistY
          );
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.fill();
      }
      break;
    }

    case 'dawn-glow': {
      // 8. Midnight Plum & Honey Dawn Glow
      const dawn = ctx.createLinearGradient(0, 0, 0, h);
      dawn.addColorStop(0, '#10051E');
      dawn.addColorStop(0.4, '#2B0E44');
      dawn.addColorStop(0.75, '#853112');
      dawn.addColorStop(0.92, '#C26D07');
      dawn.addColorStop(1, '#FBBF24');
      ctx.fillStyle = dawn;
      ctx.fillRect(0, 0, w, h);

      // Slender Waxing Crescent Moon in Upper Sky
      const cx = w * 0.76;
      const cy = h * 0.18;
      const cr = Math.min(w, h) * 0.055;

      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();

      // Shadow overlay to create crescent
      ctx.fillStyle = '#10051E';
      ctx.beginPath();
      ctx.arc(cx - cr * 0.38, cy - cr * 0.1, cr * 0.88, 0, Math.PI * 2);
      ctx.fill();

      // Morning Star (Venus)
      const starX = cx - cr * 1.5;
      const starY = cy + cr * 0.6;
      const starAlpha = 0.6 + 0.4 * Math.sin(timeSec * 3);
      ctx.fillStyle = `rgba(254, 243, 199, ${starAlpha})`;
      ctx.beginPath();
      ctx.arc(starX, starY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'persian-arch': {
      // 9. Persian Indigo Celestial Arch
      const indigo = ctx.createLinearGradient(0, 0, 0, h);
      indigo.addColorStop(0, '#07051A');
      indigo.addColorStop(0.5, '#1A1242');
      indigo.addColorStop(1, '#07051A');
      ctx.fillStyle = indigo;
      ctx.fillRect(0, 0, w, h);

      // Scalloped Persian pointed arch
      const pw = w * 0.82;
      const px = (w - pw) / 2;
      const pTop = h * 0.16;
      const pApex = h * 0.09;

      // Glow behind apex
      const apexGlow = ctx.createRadialGradient(w * 0.5, pApex, 10, w * 0.5, pApex, pw * 0.45);
      apexGlow.addColorStop(0, 'rgba(184, 196, 255, 0.22)');
      apexGlow.addColorStop(1, 'rgba(184, 196, 255, 0)');
      ctx.fillStyle = apexGlow;
      ctx.beginPath();
      ctx.arc(w * 0.5, pApex, pw * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#B8C4FF';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(px, h);
      ctx.lineTo(px, pTop);
      ctx.bezierCurveTo(px, pApex * 1.35, w * 0.5 - 25, pApex, w * 0.5, pApex);
      ctx.bezierCurveTo(w * 0.5 + 25, pApex, px + pw, pApex * 1.35, px + pw, pTop);
      ctx.lineTo(px + pw, h);
      ctx.stroke();
      break;
    }

    case 'mushaf-parchment': {
      // 10. Minimalist Mushaf Parchment (Antique Dark Leather-Bound Look)
      const parchment = ctx.createLinearGradient(0, 0, 0, h);
      parchment.addColorStop(0, '#16120E');
      parchment.addColorStop(0.5, '#241E17');
      parchment.addColorStop(1, '#16120E');
      ctx.fillStyle = parchment;
      ctx.fillRect(0, 0, w, h);

      // Inner ornate border
      const bPad = 26;
      ctx.strokeStyle = '#B87F28';
      ctx.lineWidth = 2;
      ctx.strokeRect(bPad, bPad, w - bPad * 2, h - bPad * 2);

      ctx.strokeStyle = 'rgba(184, 127, 40, 0.45)';
      ctx.lineWidth = 1;
      ctx.strokeRect(bPad + 5, bPad + 5, w - (bPad + 5) * 2, h - (bPad + 5) * 2);

      // Corner rosettes
      const roSize = 12;
      drawKhatamMedallion(ctx, bPad + 5, bPad + 5, roSize, '', '#B87F28');
      drawKhatamMedallion(ctx, w - bPad - 5, bPad + 5, roSize, '', '#B87F28');
      drawKhatamMedallion(ctx, bPad + 5, h - bPad - 5, roSize, '', '#B87F28');
      drawKhatamMedallion(ctx, w - bPad - 5, h - bPad - 5, roSize, '', '#B87F28');
      break;
    }
  }

  // Dark central vignette to ensure 100% text legibility across all scenes
  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.2, w * 0.5, h * 0.5, h * 0.75);
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
}

/**
 * SAFEGUARD 3 — Offscreen Static Layer Pre-Rendering
 * Renders the static Surah Header Banner and each Ayah's wrapped Arabic & translation
 * text block onto lightweight offscreen canvases.
 */
export function prerenderAyahOffscreenCanvas(params: {
  width: number;
  height: number;
  ayah: ClipAyahData;
  surahNameArabic: string;
  surahNameEnglish: string;
  withTashkeel: boolean;
  subtitleLang: string;
}): HTMLCanvasElement {
  const {
    width,
    height,
    ayah,
    surahNameArabic,
    surahNameEnglish,
    withTashkeel,
    subtitleLang,
  } = params;

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return offscreen;

  // 1. Surah Header Banner (Top)
  const headerY = Math.round(height * 0.12);
  ctx.save();
  ctx.textAlign = 'center';

  // Surah Name Arabic Badge
  ctx.font = 'bold 32px "Amiri", "Scheherazade New", serif';
  ctx.fillStyle = '#DCA349';
  ctx.shadowColor = 'rgba(220, 163, 73, 0.4)';
  ctx.shadowBlur = 10;
  ctx.fillText(`سُورَةُ ${surahNameArabic || 'الْقُرْآن'}`, width * 0.5, headerY);

  // Surah English + Ayah indicator
  ctx.shadowBlur = 0;
  ctx.font = '600 16px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.fillText(
    `${surahNameEnglish || 'Surah'} • Ayah ${ayah.ayahNumber}`,
    width * 0.5,
    headerY + 28
  );

  // Thin gold ornamental divider line
  const divW = Math.min(width * 0.45, 240);
  ctx.strokeStyle = 'rgba(220, 163, 73, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width * 0.5 - divW * 0.5, headerY + 44);
  ctx.lineTo(width * 0.5 + divW * 0.5, headerY + 44);
  ctx.stroke();
  ctx.restore();

  // 2. Center Content Area (Arabic Text + Translation)
  const arabicTextRaw = withTashkeel ? ayah.textUthmani : stripTashkeel(ayah.textUthmani);
  const arabicContent = arabicTextRaw || `بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ`;

  const maxTextWidth = Math.round(width * 0.84);
  const isLandscape = width > height;

  // Calculate dynamic font size based on text length and canvas dimensions
  let arabicFontSize = isLandscape ? 38 : width < 800 ? 42 : 52;
  if (arabicContent.length > 200) arabicFontSize = Math.round(arabicFontSize * 0.72);
  else if (arabicContent.length > 120) arabicFontSize = Math.round(arabicFontSize * 0.82);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = `700 ${arabicFontSize}px "Amiri", "Scheherazade New", serif`;

  const arabicLines = wrapCanvasText(ctx, arabicContent, maxTextWidth);
  const arabicLineHeight = Math.round(arabicFontSize * 1.85);
  const totalArabicBlockHeight = arabicLines.length * arabicLineHeight;

  // Translation lines
  let transLines: string[] = [];
  const transFontSize = isLandscape ? 17 : width < 800 ? 19 : 23;
  const isUrdu = subtitleLang === 'ur';

  if (subtitleLang !== 'none' && ayah.translation) {
    ctx.direction = isUrdu ? 'rtl' : 'ltr';
    ctx.font = isUrdu
      ? `400 ${transFontSize + 3}px "Noto Nastaliq Urdu", serif`
      : `500 ${transFontSize}px system-ui, -apple-system, sans-serif`;
    transLines = wrapCanvasText(ctx, ayah.translation, maxTextWidth);
  }

  const transLineHeight = Math.round(transFontSize * 1.6);
  const totalTransBlockHeight = transLines.length * transLineHeight;

  // Compute centered Y coordinate
  const combinedHeight = totalArabicBlockHeight + (transLines.length > 0 ? totalTransBlockHeight + 36 : 0);
  const centerY = Math.round(height * 0.48);
  let curY = centerY - Math.round(combinedHeight * 0.5) + arabicFontSize;

  // Draw Arabic Lines with rich glow
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = `700 ${arabicFontSize}px "Amiri", "Scheherazade New", serif`;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 12;

  for (const line of arabicLines) {
    ctx.fillText(line, width * 0.5, curY);
    curY += arabicLineHeight;
  }

  // Draw Ayah End Medallion directly beneath Arabic block
  curY += 10;
  drawKhatamMedallion(ctx, width * 0.5, curY, Math.round(arabicFontSize * 0.45), String(ayah.ayahNumber));
  curY += Math.round(arabicFontSize * 0.6) + 20;

  // Draw Translation Lines
  if (transLines.length > 0) {
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.fillStyle = 'rgba(241, 245, 249, 0.92)';
    ctx.direction = isUrdu ? 'rtl' : 'ltr';
    ctx.font = isUrdu
      ? `400 ${transFontSize + 3}px "Noto Nastaliq Urdu", serif`
      : `500 ${transFontSize}px system-ui, -apple-system, sans-serif`;

    for (const tLine of transLines) {
      ctx.fillText(tLine, width * 0.5, curY);
      curY += transLineHeight;
    }
  }

  ctx.restore();
  return offscreen;
}

/**
 * Draw Sleek Progress Bar & Noor Connect Watermark
 */
export function drawClipOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number // 0 to 1
): void {
  ctx.save();

  // 1. Sleek Top Progress Bar
  const barH = 4;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(0, 0, width, barH);

  const fillGrad = ctx.createLinearGradient(0, 0, width, 0);
  fillGrad.addColorStop(0, '#DCA349');
  fillGrad.addColorStop(1, '#FDE047');
  ctx.fillStyle = fillGrad;
  ctx.fillRect(0, 0, width * Math.min(1, Math.max(0, progress)), barH);

  // 2. Noor Connect Watermark (Bottom)
  const wmY = height - 28;
  ctx.textAlign = 'center';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(220, 163, 73, 0.78)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText('NOOR CONNECT • QURAN CLIP STUDIO', width * 0.5, wmY);

  ctx.restore();
}

/**
 * SAFEGUARD 5 — Android Social Share Codec Priority (.mp4 First)
 */
export function getOptimalVideoMimeType(): { mimeType: string; extension: string } {
  if (typeof MediaRecorder === 'undefined') {
    return { mimeType: 'video/webm', extension: '.webm' };
  }
  const candidates = [
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: '.mp4' },
    { mimeType: 'video/mp4', extension: '.mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: '.webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: '.webm' },
    { mimeType: 'video/webm', extension: '.webm' },
  ];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c.mimeType)) {
        return c;
      }
    } catch {
      // Safe next candidate
    }
  }
  return { mimeType: 'video/webm', extension: '.webm' };
}

/**
 * Convert Blob to Base64 data string (for Capacitor Filesystem)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = () => {
      reject(reader.error || new Error('Failed to read blob'));
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * SAFEGUARD 7 — Bulletproof Android Filesystem.Cache Write & Share.share Handling
 */
export async function exportAndShareClip(params: {
  blob: Blob;
  filename: string;
  title: string;
  text: string;
  onToast?: (msg: string) => void;
}): Promise<boolean> {
  const { blob, filename, title, text, onToast } = params;

  // 1. Large video clip check (> 50MB)
  if (blob.size > 50 * 1024 * 1024) {
    onToast?.('Large video clip — opening share sheet may take a moment');
  }

  // 2. Native Capacitor Android Platform
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob);
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      // Verify file URI
      const stat = await Filesystem.stat({
        path: filename,
        directory: Directory.Cache,
      });

      const targetUri = stat.uri || writeResult.uri;

      try {
        await Share.share({
          title,
          text,
          files: [targetUri],
          dialogTitle: 'Share Quran Clip',
        });
        return true;
      } catch (shareErr) {
        // Ignore user dismissal silently without logging a crash
        const msg = String(shareErr).toLowerCase();
        if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('aborterror')) {
          return false;
        }
        console.warn('[QuranClipRenderer] Share notice:', shareErr);
        return false;
      }
    } catch (fsErr) {
      console.warn('[QuranClipRenderer] Native Filesystem cache export notice:', fsErr);
      // Fallback to web download
    }
  }

  // 3. Web & Desktop Browser Share / Download Fallback
  if (typeof navigator !== 'undefined' && navigator.canShare && typeof File !== 'undefined') {
    try {
      const file = new File([blob], filename, { type: blob.type });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file],
        });
        return true;
      }
    } catch (shareErr) {
      const msg = String(shareErr).toLowerCase();
      if (msg.includes('cancel') || msg.includes('dismiss') || msg.includes('abort')) {
        return false;
      }
    }
  }

  // Direct Browser Download
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return true;
  } catch (dlErr) {
    console.error('[QuranClipRenderer] Download fallback error:', dlErr);
    return false;
  }
}

/**
 * Tab 2: High-Resolution Ayah Image Card Generator (1080p PNG)
 */
export async function renderAyahImageCard(params: {
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  ayah: ClipAyahData;
  aspectRatio: AspectRatioType;
  sceneId: SceneId;
  withTashkeel: boolean;
  subtitleLang: string;
}): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  await ensureFontsReady();

  const dims = ASPECT_RATIO_PRESETS[params.aspectRatio].image;
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context');

  // 1. Draw Selected Procedural Scene at time = 0
  drawProceduralScene(ctx, params.sceneId, dims.width, dims.height, 0);

  // 2. Pre-render Ayah Content onto offscreen canvas and draw
  const offscreen = prerenderAyahOffscreenCanvas({
    width: dims.width,
    height: dims.height,
    ayah: params.ayah,
    surahNameArabic: params.surahNameArabic,
    surahNameEnglish: params.surahNameEnglish,
    withTashkeel: params.withTashkeel,
    subtitleLang: params.subtitleLang,
  });
  ctx.drawImage(offscreen, 0, 0);

  // 3. Draw Watermark
  drawClipOverlay(ctx, dims.width, dims.height, 1.0);

  // 4. Export as PNG Blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error('Canvas toBlob failed'));
    }, 'image/png');
  });

  const dataUrl = canvas.toDataURL('image/png');
  return { blob, dataUrl, width: dims.width, height: dims.height };
}

/**
 * Tab 1: BULLETPROOF CANVAS + WEBAUDIO RECITATION VIDEO ENGINE
 * Combines 30FPS Animated Canvas + Multi-Ayah Qari Tilawah Audio Sync
 */
export async function renderRecitationVideoClip(params: {
  surahNumber: number;
  surahNameArabic: string;
  surahNameEnglish: string;
  ayahs: ClipAyahData[];
  reciterId: string;
  aspectRatio: AspectRatioType;
  sceneId: SceneId;
  withTashkeel: boolean;
  subtitleLang: string;
  onProgress?: (info: RenderProgressUpdate) => void;
  signal?: AbortSignal;
}): Promise<{ blob: Blob; mimeType: string; extension: string; duration: number }> {
  const {
    surahNumber,
    surahNameArabic,
    surahNameEnglish,
    ayahs,
    reciterId,
    aspectRatio,
    sceneId,
    withTashkeel,
    subtitleLang,
    onProgress,
    signal,
  } = params;

  if (ayahs.length === 0) {
    throw new Error('No Ayahs selected for clip generation');
  }

  // 1. SAFEGUARD 1 — Font Readiness Gate
  onProgress?.({
    stage: 'fonts',
    percent: 5,
    statusText: 'Loading Arabic Calligraphy Fonts...',
  });
  await ensureFontsReady();

  if (signal?.aborted) throw new DOMException('Aborted by user', 'AbortError');

  // 2. Initialize AudioContext for WebAudio timeline & master clock
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('WebAudio AudioContext not supported on this device');
  }

  const audioContext = new AudioContextClass();
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  // 3. SAFEGUARD 2 — Download & Decode Each Ayah's AudioBuffer
  const audioItems: Array<{ ayahNumber: number; audioBuffer: AudioBuffer; duration: number }> = [];
  const totalVerses = ayahs.length;

  for (let i = 0; i < totalVerses; i++) {
    if (signal?.aborted) {
      audioContext.close().catch(() => {});
      throw new DOMException('Aborted by user', 'AbortError');
    }

    const curAyah = ayahs[i];
    const pct = Math.round(10 + (i / totalVerses) * 35);
    onProgress?.({
      stage: 'audio',
      currentAyah: curAyah.ayahNumber,
      totalAyahs: totalVerses,
      percent: pct,
      statusText: `Downloading Qari Audio... (${i + 1}/${totalVerses})`,
    });

    const buffer = await fetchAyahAudioBuffer(
      reciterId,
      surahNumber,
      curAyah.ayahNumber,
      audioContext,
      signal
    );

    audioItems.push({
      ayahNumber: curAyah.ayahNumber,
      audioBuffer: buffer,
      duration: buffer.duration,
    });
  }

  // 4. SAFEGUARD 4 — Compute Deterministic Timeline (Capped at 60s)
  let accumulatedTime = 0;
  const timeline: ClipAyahTimelineItem[] = [];

  for (const item of audioItems) {
    if (accumulatedTime >= 60) break;
    const dur = Math.min(item.duration, 60 - accumulatedTime);
    timeline.push({
      ayahNumber: item.ayahNumber,
      audioBuffer: item.audioBuffer,
      startTime: accumulatedTime,
      endTime: accumulatedTime + dur,
    });
    accumulatedTime += dur;
  }

  const totalDuration = Math.min(60, accumulatedTime);

  // 5. SAFEGUARD 3 — Pre-render Offscreen Static Ayah Bitmaps
  onProgress?.({
    stage: 'rendering',
    percent: 50,
    statusText: 'Pre-rendering Calligraphy Text Layers...',
  });

  const dims = ASPECT_RATIO_PRESETS[aspectRatio].video;
  const cachedAyahBitmaps = new Map<number, HTMLCanvasElement>();

  for (const item of ayahs) {
    const bmp = prerenderAyahOffscreenCanvas({
      width: dims.width,
      height: dims.height,
      ayah: item,
      surahNameArabic,
      surahNameEnglish,
      withTashkeel,
      subtitleLang,
    });
    cachedAyahBitmaps.set(item.ayahNumber, bmp);
  }

  // 6. Setup Rendering Canvas & Stream
  const canvas = document.createElement('canvas');
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    audioContext.close().catch(() => {});
    throw new Error('Could not initialize 2D canvas context');
  }

  // SAFEGUARD 6 — Canvas Context Loss Recovery
  let contextLostOccurred = false;
  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLostOccurred = true;
  };
  canvas.addEventListener('contextlost', onContextLost);

  // Setup Streams for MediaRecorder
  const canvasStream = canvas.captureStream ? canvas.captureStream(30) : null;
  if (!canvasStream) {
    audioContext.close().catch(() => {});
    throw new Error('Canvas captureStream not supported in this WebView');
  }

  const streamDest = audioContext.createMediaStreamDestination();

  // Combine video + audio tracks
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...streamDest.stream.getAudioTracks(),
  ]);

  // SAFEGUARD 5 — Optimal Video MIME Type Selection
  const { mimeType: selectedMime, extension } = getOptimalVideoMimeType();
  const recordedChunks: Blob[] = [];

  const recorder = new MediaRecorder(combinedStream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 2_500_000,
  });

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  // Start MediaRecorder
  recorder.start(100);

  // SAFEGUARD 4 — Schedule AudioBufferSourceNodes on AudioContext Timeline
  const startAudioTime = audioContext.currentTime + 0.05; // 50ms buffer lead-in
  const activeSources: AudioBufferSourceNode[] = [];

  for (const item of timeline) {
    const src = audioContext.createBufferSource();
    src.buffer = item.audioBuffer;
    src.connect(streamDest);
    src.start(startAudioTime + item.startTime);
    activeSources.push(src);
  }

  // 7. 30FPS Rendering Loop Driven by audioContext.currentTime
  const frameIntervalMs = 1000 / 30;
  let frameCount = 0;

  try {
    while (!signal?.aborted && !contextLostOccurred) {
      const currentAudioTime = audioContext.currentTime;
      const elapsed = currentAudioTime - startAudioTime;

      if (elapsed >= totalDuration) {
        break;
      }

      const visualElapsed = Math.max(0, elapsed);
      const activeTimelineItem =
        timeline.find((t) => visualElapsed >= t.startTime && visualElapsed < t.endTime) ||
        timeline[timeline.length - 1];

      // Draw Procedural Background (< 1.5ms)
      drawProceduralScene(ctx, sceneId, dims.width, dims.height, visualElapsed);

      // Draw Pre-rendered Active Ayah Bitmap (< 0.3ms)
      const cachedBmp = cachedAyahBitmaps.get(activeTimelineItem.ayahNumber);
      if (cachedBmp) {
        ctx.drawImage(cachedBmp, 0, 0);
      }

      // Draw Progress Bar + Watermark (< 0.2ms)
      const clipProgress = totalDuration > 0 ? visualElapsed / totalDuration : 0;
      drawClipOverlay(ctx, dims.width, dims.height, clipProgress);

      frameCount++;

      // Progress reporting
      const renderPct = Math.round(50 + clipProgress * 45);
      onProgress?.({
        stage: 'rendering',
        percent: renderPct,
        statusText: `Recording Reel: ${visualElapsed.toFixed(1)}s / ${totalDuration.toFixed(1)}s (${renderPct}%)`,
      });

      // Yield every 10 frames to keep Cancel button & UI responsive in < 16ms
      if (frameCount % 10 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }

      await new Promise((r) => setTimeout(r, frameIntervalMs));
    }
  } finally {
    // Cleanup active audio sources
    for (const src of activeSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // Handled stop
      }
    }
    canvas.removeEventListener('contextlost', onContextLost);
  }

  if (contextLostOccurred) {
    recorder.stop();
    audioContext.close().catch(() => {});
    throw new Error('Rendering interrupted by device GPU. Tap Retry.');
  }

  if (signal?.aborted) {
    try {
      recorder.stop();
    } catch {
      // Safe stop
    }
    audioContext.close().catch(() => {});
    throw new DOMException('Aborted by user', 'AbortError');
  }

  // 8. Finalize MediaRecorder & Collect Blobs
  onProgress?.({
    stage: 'encoding',
    percent: 98,
    statusText: 'Finalizing Video Reel Encoding...',
  });

  const finalBlob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const output = new Blob(recordedChunks, { type: selectedMime });
      resolve(output);
    };
    recorder.stop();
  });

  audioContext.close().catch(() => {});

  onProgress?.({
    stage: 'complete',
    percent: 100,
    statusText: 'Quran Reel Ready!',
  });

  return {
    blob: finalBlob,
    mimeType: selectedMime,
    extension,
    duration: totalDuration,
  };
}
