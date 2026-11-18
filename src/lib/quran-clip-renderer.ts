/**
 * Noor Connect — Quran Clip Studio Canvas & WebAudio Engine
 *
 * In-app Quran Ayah image card & recitation video (Reel / Story / Post) generator.
 * True "@sufariq"-Style Visual Storytelling:
 *  - 16 Concrete Illustrated Object Scenes (No blank gradients)
 *  - Sub-Ayah Phrase Choreography (e.g. Surah An-Nur 24:35 splits into 4 distinct scenes)
 *  - Two-Zone Cinematic Stage Layout (Top-Third typography stage without bulky box + Lower 65% illustration stage)
 *  - Ken Burns 1.00x -> 1.08x Camera Push + 500ms Smooth Cross-Fades
 *  - Outer Golden Filigree Frame Signature
 *
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

import {
  resolveSceneForAyah,
  resolveSceneJourney,
  resolveAyahVisualTimeline,
  type VisualSegment,
} from './ayah-meaning-scene-engine';

export interface ClipAyahTimelineItem {
  ayahNumber: number;
  audioBuffer: AudioBuffer;
  startTime: number;
  endTime: number;
}

export type SceneId =
  | 'auto-meaning'
  | 'heavens-earth-rays'
  | 'niche-lamp'
  | 'glass-orb-lamp'
  | 'pearly-star'
  | 'illuminated-quran'
  | 'straight-path'
  | 'blessed-tree-garden'
  | 'two-seas-ship'
  | 'rain-revival'
  | 'cosmic-scale'
  | 'cosmic-eclipse-qiyamah'
  | 'ember-warning'
  | 'kaaba-sanctuary'
  | 'rawdah-mihrab-prayer'
  | 'iron-chains-veil'
  | 'desert-fortress-history'
  // Legacy aliases
  | 'moonlit-ocean'
  | 'desert-sunset'
  | 'kiswah-gold'
  | 'rawdah-emerald'
  | 'cosmic-nebula'
  | 'burgundy-velvet'
  | 'bosphorus-mist'
  | 'dawn-glow'
  | 'persian-arch'
  | 'mushaf-parchment'
  | 'ember-horizon';

export interface SceneDefinition {
  id: SceneId;
  name: string;
  subtitle: string;
  icon: string;
  previewGradient: string;
}

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {
    id: 'auto-meaning',
    name: '✨ Auto Sync',
    subtitle: 'Auto Meaning Sync',
    icon: '✨',
    previewGradient: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 35%, #059669 70%, #d97706 100%)',
  },
  {
    id: 'heavens-earth-rays',
    name: 'Heavens & Noor',
    subtitle: 'Golden Sunbeams & Mountains',
    icon: '🌅',
    previewGradient: 'linear-gradient(135deg, #050818 0%, #161e38 50%, #f59e0b 100%)',
  },
  {
    id: 'niche-lamp',
    name: 'Mishkat Lamp',
    subtitle: 'Wall Niche & Oil Lantern',
    icon: '🏮',
    previewGradient: 'linear-gradient(135deg, #0c0a09 0%, #292524 50%, #ea580c 100%)',
  },
  {
    id: 'glass-orb-lamp',
    name: 'Crystal Orb',
    subtitle: 'Glass Sphere & Breathing Flame',
    icon: '🔮',
    previewGradient: 'linear-gradient(135deg, #030712 0%, #0c4a6e 50%, #38bdf8 100%)',
  },
  {
    id: 'pearly-star',
    name: 'Pearly Star',
    subtitle: 'Radiant Kawkab Durriyy',
    icon: '⭐',
    previewGradient: 'linear-gradient(135deg, #020410 0%, #312e81 50%, #fef08a 100%)',
  },
  {
    id: 'illuminated-quran',
    name: 'Wise Quran',
    subtitle: 'Illuminated Mushaf on Rehal',
    icon: '📖',
    previewGradient: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #dca349 100%)',
  },
  {
    id: 'straight-path',
    name: 'Straight Path',
    subtitle: 'Sirat al-Mustaqim Road of Light',
    icon: '🛤️',
    previewGradient: 'linear-gradient(135deg, #09090b 0%, #1c1917 50%, #f59e0b 100%)',
  },
  {
    id: 'blessed-tree-garden',
    name: 'Jannah Tree',
    subtitle: 'Blessed Olive Tree & River',
    icon: '🌳',
    previewGradient: 'linear-gradient(135deg, #022c22 0%, #064e3b 50%, #34d399 100%)',
  },
  {
    id: 'two-seas-ship',
    name: 'Ocean & Ship',
    subtitle: 'Rolling Waves & Sailing Ark',
    icon: '🌊',
    previewGradient: 'linear-gradient(135deg, #030712 0%, #0a192f 50%, #38bdf8 100%)',
  },
  {
    id: 'rain-revival',
    name: 'Life Rain',
    subtitle: 'Sky Clouds & Blooming Earth',
    icon: '🌧️',
    previewGradient: 'linear-gradient(135deg, #020617 0%, #1e293b 50%, #10b981 100%)',
  },
  {
    id: 'cosmic-scale',
    name: 'Cosmic Scale',
    subtitle: 'The Balance Scale of Justice',
    icon: '⚖️',
    previewGradient: 'linear-gradient(135deg, #030014 0%, #2e1065 50%, #facc15 100%)',
  },
  {
    id: 'cosmic-eclipse-qiyamah',
    name: 'Eclipse Awe',
    subtitle: 'Solar Corona & Shattered Earth',
    icon: '🌑',
    previewGradient: 'linear-gradient(135deg, #000000 0%, #18181b 50%, #f59e0b 100%)',
  },
  {
    id: 'ember-warning',
    name: 'Ember Warning',
    subtitle: 'Volcanic Crags & Blazing Sparks',
    icon: '🔥',
    previewGradient: 'linear-gradient(135deg, #100202 0%, #450a0a 50%, #ea580c 100%)',
  },
  {
    id: 'kaaba-sanctuary',
    name: 'Kaaba House',
    subtitle: 'Sacred Kaaba & Tawaf Light Rings',
    icon: '🕋',
    previewGradient: 'linear-gradient(135deg, #09090b 0%, #18181b 50%, #dca349 100%)',
  },
  {
    id: 'rawdah-mihrab-prayer',
    name: 'Rawdah Arcade',
    subtitle: 'Grand Mosque & Hanging Lantern',
    icon: '🕌',
    previewGradient: 'linear-gradient(135deg, #02140b 0%, #063b22 50%, #45b88c 100%)',
  },
  {
    id: 'iron-chains-veil',
    name: 'Veil Barrier',
    subtitle: 'Parting Monoliths & Guiding Light',
    icon: '⛓️',
    previewGradient: 'linear-gradient(135deg, #030712 0%, #18181b 50%, #e2e8f0 100%)',
  },
  {
    id: 'desert-fortress-history',
    name: 'Desert Canyon',
    subtitle: 'Sandstone Arches & Twilight Sky',
    icon: '🏜️',
    previewGradient: 'linear-gradient(135deg, #1a0928 0%, #7c2d12 50%, #f59e0b 100%)',
  },
];

export const ASPECT_RATIO_PRESETS: Record<
  AspectRatioType,
  { video: CanvasDimensions; image: CanvasDimensions; label: string }
> = {
  '9:16': {
    video: { width: 720, height: 1280 },
    image: { width: 1080, height: 1920 },
    label: '9:16 Reel',
  },
  '1:1': {
    video: { width: 720, height: 720 },
    image: { width: 1080, height: 1080 },
    label: '1:1 Square',
  },
  '16:9': {
    video: { width: 1280, height: 720 },
    image: { width: 1920, height: 1080 },
    label: '16:9 Wide',
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
 * Clean tashkeel (harakat) diacritics from Arabic text
 */
export function stripTashkeel(text: string): string {
  if (!text) return '';
  return text.replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '');
}

/**
 * SAFEGUARD 1 — Font Readiness Gate
 */
export async function ensureFontsReady(): Promise<boolean> {
  if (typeof document === 'undefined' || !document.fonts) return true;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    return true;
  } catch {
    return true;
  }
}

/**
 * SAFEGUARD 2 — CORS-Safe Audio Fetching & Main-Thread Yielding
 */
export async function fetchAyahAudioBuffer(
  reciterId: string,
  surahNumber: number,
  ayahNumber: number,
  audioContext: AudioContext,
  signal?: AbortSignal
): Promise<AudioBuffer> {
  const primaryUrl = getPrimaryAyahAudioUrl(reciterId, surahNumber, ayahNumber);
  const secondaryUrl = getSecondaryAyahAudioUrl(reciterId, surahNumber, ayahNumber);

  let arrayBuffer: ArrayBuffer | null = null;

  // 1. Check Offline Audio CacheStorage first
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
      const cachedRes = await cache.match(primaryUrl);
      if (cachedRes && cachedRes.ok) {
        arrayBuffer = await cachedRes.arrayBuffer();
      }
    } catch {
      // Continue to network fetch
    }
  }

  // 2. Network fetch primary URL with CORS safety
  if (!arrayBuffer) {
    try {
      const res = await fetch(primaryUrl, { mode: 'cors', signal });
      if (res.ok) {
        arrayBuffer = await res.arrayBuffer();
        if (typeof caches !== 'undefined') {
          try {
            const cache = await caches.open(OFFLINE_AUDIO_CACHE_NAME);
            cache.put(primaryUrl, new Response(arrayBuffer.slice(0), { headers: res.headers })).catch(() => {});
          } catch (_cacheErr) {
            // Handled cache store notice
          }
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
    }
  }

  // 3. Fallback to secondary CDN
  if (!arrayBuffer) {
    try {
      const res2 = await fetch(secondaryUrl, { mode: 'cors', signal });
      if (res2.ok) {
        arrayBuffer = await res2.arrayBuffer();
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') throw err;
    }
  }

  if (!arrayBuffer) {
    throw new Error(`Failed to load audio for ${surahNumber}:${ayahNumber}`);
  }

  // 4. Decode in AudioContext with 10ms yield to prevent UI freeze
  await new Promise((resolve) => setTimeout(resolve, 10));
  return await audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Fast Canvas Text Wrapping Helper
 */
export function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const width = ctx.measureText(testLine).width;
    if (width < maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Draw 16 Concrete Illustrated Object Scenes (@sufariq Cinematic Style)
 * 100% Offline Procedural Canvas Rendering with Ken Burns Camera Zoom
 */
export function drawProceduralScene(
  ctx: CanvasRenderingContext2D,
  sceneId: SceneId,
  w: number,
  h: number,
  timeSec: number,
  zoomScale: number = 1.0
): void {
  ctx.save();

  // Alias legacy sceneIds to illustrated counterparts
  let activeId: string = sceneId;
  if (activeId === 'moonlit-ocean') activeId = 'two-seas-ship';
  else if (activeId === 'desert-sunset') activeId = 'desert-fortress-history';
  else if (activeId === 'kiswah-gold') activeId = 'kaaba-sanctuary';
  else if (activeId === 'rawdah-emerald') activeId = 'rawdah-mihrab-prayer';
  else if (activeId === 'cosmic-nebula') activeId = 'cosmic-eclipse-qiyamah';
  else if (activeId === 'burgundy-velvet') activeId = 'niche-lamp';
  else if (activeId === 'bosphorus-mist') activeId = 'heavens-earth-rays';
  else if (activeId === 'dawn-glow') activeId = 'straight-path';
  else if (activeId === 'persian-arch') activeId = 'glass-orb-lamp';
  else if (activeId === 'mushaf-parchment') activeId = 'illuminated-quran';
  else if (activeId === 'ember-horizon') activeId = 'ember-warning';

  const cx = w * 0.5;
  const stageCenterY = h * 0.64;

  switch (activeId) {
    case 'heavens-earth-rays': {
      // 1. Heavens, Earth & Noor Sunbeams (video_2.mp4 00:02)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#040817');
      skyGrad.addColorStop(0.45, '#161e38');
      skyGrad.addColorStop(0.76, '#451a03');
      skyGrad.addColorStop(1, '#0c0a09');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Ken Burns Zoom applied to illustrated stage
      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const hy = h * 0.76;

      // 18 Volumetric Sunbeams radiating upward
      ctx.save();
      for (let i = 0; i < 18; i++) {
        const baseAngle = -Math.PI * 0.90 + (i / 17) * (Math.PI * 0.80);
        const wave = Math.sin(timeSec * 0.8 + i * 0.6) * 0.04;
        const angle = baseAngle + wave;
        const rayLen = Math.max(w, h) * 0.95;
        const rx = cx + Math.cos(angle) * rayLen;
        const ry = hy + Math.sin(angle) * rayLen;

        const rayGrad = ctx.createLinearGradient(cx, hy, rx, ry);
        const alpha = 0.16 + 0.09 * Math.sin(timeSec * 1.5 + i);
        rayGrad.addColorStop(0, `rgba(253, 224, 71, ${alpha * 1.5})`);
        rayGrad.addColorStop(0.4, `rgba(245, 158, 11, ${alpha * 0.8})`);
        rayGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(cx - 10, hy);
        ctx.lineTo(rx - 30, ry);
        ctx.lineTo(rx + 30, ry);
        ctx.lineTo(cx + 10, hy);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // Atmospheric Clouds in mid-sky
      for (let i = 0; i < 4; i++) {
        const drift = ((timeSec * 8 + i * 180) % (w + 200)) - 100;
        const cy = h * (0.42 + i * 0.05);
        const cGrad = ctx.createRadialGradient(drift, cy, 0, drift, cy, w * 0.28);
        cGrad.addColorStop(0, 'rgba(254, 243, 199, 0.18)');
        cGrad.addColorStop(0.6, 'rgba(245, 158, 11, 0.08)');
        cGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = cGrad;
        ctx.beginPath();
        ctx.arc(drift, cy, w * 0.28, 0, Math.PI * 2);
        ctx.fill();
      }

      // Distant silhouetted mountain range
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, hy + 20);
      ctx.lineTo(w * 0.18, hy - 40);
      ctx.lineTo(w * 0.35, hy);
      ctx.lineTo(w * 0.50, hy - 25);
      ctx.lineTo(w * 0.68, hy + 10);
      ctx.lineTo(w * 0.85, hy - 50);
      ctx.lineTo(w, hy - 15);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Foreground sharp jagged mountain peaks with golden rim-light
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.65)';
      ctx.lineWidth = 1.5;
      ctx.fillStyle = '#0a0908';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, hy + 45);
      ctx.lineTo(w * 0.25, hy + 10);
      ctx.lineTo(w * 0.42, hy + 50);
      ctx.lineTo(w * 0.58, hy + 5);
      ctx.lineTo(w * 0.78, hy + 40);
      ctx.lineTo(w, hy + 20);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central radiant horizon burst
      const burst = ctx.createRadialGradient(cx, hy, 0, cx, hy, w * 0.35);
      burst.addColorStop(0, '#FFFBEB');
      burst.addColorStop(0.3, 'rgba(253, 224, 71, 0.75)');
      burst.addColorStop(0.7, 'rgba(245, 158, 11, 0.25)');
      burst.addColorStop(1, 'rgba(245, 158, 11, 0)');
      ctx.fillStyle = burst;
      ctx.beginPath();
      ctx.arc(cx, hy, w * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'niche-lamp': {
      // 2. The Wall Niche & Lamp — Mishkat (video_2.mp4 00:06)
      const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
      wallGrad.addColorStop(0, '#0c0a09');
      wallGrad.addColorStop(0.5, '#1c1917');
      wallGrad.addColorStop(1, '#090807');
      ctx.fillStyle = wallGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      // Stone brick texture in background
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = 2;
      const rowH = 26;
      for (let y = h * 0.35; y < h; y += rowH) {
        const offset = (Math.floor(y / rowH) % 2) * 40;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
        for (let x = offset; x < w; x += 80) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + rowH);
          ctx.stroke();
        }
      }

      // Pointed Islamic arch niche
      const nw = Math.min(w * 0.52, 340);
      const sillY = h * 0.82;
      const archTop = h * 0.44;
      const nLeft = cx - nw * 0.5;
      const nRight = cx + nw * 0.5;

      // Recessed niche shadow
      ctx.fillStyle = '#050403';
      ctx.beginPath();
      ctx.moveTo(nLeft, sillY);
      ctx.lineTo(nLeft, sillY - (sillY - archTop) * 0.65);
      ctx.quadraticCurveTo(nLeft, archTop, cx, archTop - 25);
      ctx.quadraticCurveTo(nRight, archTop, nRight, sillY - (sillY - archTop) * 0.65);
      ctx.lineTo(nRight, sillY);
      ctx.closePath();
      ctx.fill();

      // Niche stone arch bevel trim
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.65)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Warm radial glow inside niche from lamp
      const lampGlow = ctx.createRadialGradient(cx, sillY - 90, 0, cx, sillY - 90, nw * 0.85);
      lampGlow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
      lampGlow.addColorStop(0.5, 'rgba(217, 119, 6, 0.25)');
      lampGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath();
      ctx.arc(cx, sillY - 90, nw * 0.85, 0, Math.PI * 2);
      ctx.fill();

      // Ornate Brass Lantern (Misbah)
      const lampY = sillY - 30;
      // Base
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.roundRect(cx - 26, lampY, 52, 12, 4);
      ctx.fill();
      // Glass body
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(254, 243, 199, 0.15)';
      ctx.beginPath();
      ctx.moveTo(cx - 20, lampY);
      ctx.lineTo(cx - 28, lampY - 50);
      ctx.lineTo(cx - 16, lampY - 80);
      ctx.lineTo(cx + 16, lampY - 80);
      ctx.lineTo(cx + 28, lampY - 50);
      ctx.lineTo(cx + 20, lampY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Top Dome Cap & Ring
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.arc(cx, lampY - 82, 16, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, lampY - 96, 6, 0, Math.PI * 2);
      ctx.stroke();

      // Multi-layer flickering flame inside
      const flameFlicker = Math.sin(timeSec * 16) * 3;
      const flameCore = ctx.createRadialGradient(cx + flameFlicker * 0.4, lampY - 45, 0, cx, lampY - 45, 18);
      flameCore.addColorStop(0, '#FFFFFF');
      flameCore.addColorStop(0.3, '#FDE047');
      flameCore.addColorStop(0.7, '#EA580C');
      flameCore.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = flameCore;
      ctx.beginPath();
      ctx.arc(cx + flameFlicker * 0.4, lampY - 45, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'glass-orb-lamp': {
      // 3. Crystal Glass Orb & Flame — Zujajah (video_2.mp4 00:10)
      const bgGrad = ctx.createRadialGradient(cx, stageCenterY, 0, cx, stageCenterY, w * 0.7);
      bgGrad.addColorStop(0, '#0c1a30');
      bgGrad.addColorStop(0.6, '#030712');
      bgGrad.addColorStop(1, '#02040a');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const orbR = Math.min(w, h) * 0.17;
      const orbY = h * 0.61;

      // Tiered Golden Pedestal
      const pedY = orbY + orbR + 8;
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.roundRect(cx - 36, pedY, 72, 10, 4);
      ctx.roundRect(cx - 48, pedY + 10, 96, 12, 4);
      ctx.roundRect(cx - 60, pedY + 22, 120, 14, 6);
      ctx.fill();

      // Outer refraction aura
      const aura = ctx.createRadialGradient(cx, orbY, orbR * 0.7, cx, orbY, orbR * 1.6);
      aura.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      aura.addColorStop(0.6, 'rgba(217, 119, 6, 0.20)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(cx, orbY, orbR * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Glass Orb body
      const glass = ctx.createRadialGradient(cx - orbR * 0.3, orbY - orbR * 0.3, orbR * 0.1, cx, orbY, orbR);
      glass.addColorStop(0, 'rgba(240, 249, 255, 0.15)');
      glass.addColorStop(0.7, 'rgba(56, 189, 248, 0.18)');
      glass.addColorStop(0.95, 'rgba(186, 230, 253, 0.45)');
      glass.addColorStop(1, 'rgba(255, 255, 255, 0.85)');
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.arc(cx, orbY, orbR, 0, Math.PI * 2);
      ctx.fill();

      // Breathing flame inside glass
      const breathe = 1.0 + Math.sin(timeSec * 5) * 0.08;
      const flameR = 24 * breathe;
      const flame = ctx.createRadialGradient(cx, orbY + 6, 0, cx, orbY + 6, flameR * 1.5);
      flame.addColorStop(0, '#FFFFFF');
      flame.addColorStop(0.3, '#FDE047');
      flame.addColorStop(0.7, '#EA580C');
      flame.addColorStop(1, 'rgba(234, 88, 12, 0)');
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.arc(cx, orbY + 6, flameR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Specular reflection arcs on crystal surface
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, orbY, orbR - 6, -Math.PI * 0.85, -Math.PI * 0.45);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, orbY, orbR - 6, Math.PI * 0.15, Math.PI * 0.35);
      ctx.stroke();

      ctx.restore();
      break;
    }

    case 'pearly-star': {
      // 4. Pearly Radiant Star — Kawkab Durriyy (video_2.mp4 00:13)
      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, '#020410');
      bgGrad.addColorStop(0.5, '#1e1b4b');
      bgGrad.addColorStop(1, '#020617');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const starY = h * 0.60;

      // 45° diagonal motion light-streaks
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.22)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 9; i++) {
        const offset = ((timeSec * 70 + i * 90) % (w + 400)) - 200;
        ctx.beginPath();
        ctx.moveTo(offset, starY - 140);
        ctx.lineTo(offset + 140, starY);
        ctx.stroke();
      }
      ctx.restore();

      // Concentric expanding shockwave
      const ringProg = (timeSec * 0.5) % 1.0;
      ctx.strokeStyle = `rgba(253, 224, 71, ${0.4 * (1 - ringProg)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, starY, 40 + ringProg * (w * 0.35), 0, Math.PI * 2);
      ctx.stroke();

      // Radiant pearl star halo
      const halo = ctx.createRadialGradient(cx, starY, 0, cx, starY, w * 0.40);
      halo.addColorStop(0, '#FFFFFF');
      halo.addColorStop(0.25, 'rgba(254, 240, 138, 0.65)');
      halo.addColorStop(0.65, 'rgba(99, 102, 241, 0.20)');
      halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, starY, w * 0.40, 0, Math.PI * 2);
      ctx.fill();

      // 8-Point Diffraction Star Flare
      const pulse = 1.0 + Math.sin(timeSec * 6) * 0.08;
      const longRay = w * 0.34 * pulse;
      const shortRay = w * 0.18 * pulse;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      // Horizontal & vertical primary spikes
      ctx.beginPath();
      ctx.moveTo(cx, starY - longRay);
      ctx.lineTo(cx + 6, starY);
      ctx.lineTo(cx, starY + longRay);
      ctx.lineTo(cx - 6, starY);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx - longRay, starY);
      ctx.lineTo(cx, starY + 6);
      ctx.lineTo(cx + longRay, starY);
      ctx.lineTo(cx, starY - 6);
      ctx.closePath();
      ctx.fill();

      // Diagonal secondary spikes
      ctx.beginPath();
      ctx.moveTo(cx - shortRay * 0.7, starY - shortRay * 0.7);
      ctx.lineTo(cx + 4, starY - 4);
      ctx.lineTo(cx + shortRay * 0.7, starY + shortRay * 0.7);
      ctx.lineTo(cx - 4, starY + 4);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(cx + shortRay * 0.7, starY - shortRay * 0.7);
      ctx.lineTo(cx + 4, starY + 4);
      ctx.lineTo(cx - shortRay * 0.7, starY + shortRay * 0.7);
      ctx.lineTo(cx - 4, starY - 4);
      ctx.closePath();
      ctx.fill();

      // Diamond star core
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(cx, starY, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'illuminated-quran': {
      // 5. The Wise Quran / Open Mushaf on Rehal (Surah Ya-Sin 36:2)
      const qGrad = ctx.createRadialGradient(cx, stageCenterY, 0, cx, stageCenterY, w * 0.75);
      qGrad.addColorStop(0, '#111827');
      qGrad.addColorStop(0.6, '#030712');
      qGrad.addColorStop(1, '#020408');
      ctx.fillStyle = qGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const rehalY = h * 0.75;

      // X-Shaped Golden Wood Rehal Stand
      ctx.strokeStyle = '#dca349';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(cx - 75, rehalY + 36);
      ctx.lineTo(cx + 75, rehalY - 30);
      ctx.moveTo(cx + 75, rehalY + 36);
      ctx.lineTo(cx - 75, rehalY - 30);
      ctx.stroke();

      // Carved Rehal center pivot
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(cx, rehalY + 3, 10, 0, Math.PI * 2);
      ctx.fill();

      // Golden Beams of light rising from Holy Quran
      ctx.save();
      for (let i = 0; i < 5; i++) {
        const beamX = cx - 40 + i * 20;
        const beamGrad = ctx.createLinearGradient(beamX, rehalY - 40, beamX, rehalY - 220);
        beamGrad.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
        beamGrad.addColorStop(1, 'rgba(253, 224, 71, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(beamX - 6, rehalY - 220, 12, 180);
      }
      ctx.restore();

      // Open Holy Mushaf with 3D curved pages
      const mY = rehalY - 32;
      const pageW = 85;
      const pageH = 58;

      // Left curved page
      ctx.fillStyle = '#FFFBEB';
      ctx.strokeStyle = '#dca349';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, mY);
      ctx.quadraticCurveTo(cx - pageW * 0.5, mY - 14, cx - pageW, mY - 6);
      ctx.lineTo(cx - pageW, mY - 6 - pageH);
      ctx.quadraticCurveTo(cx - pageW * 0.5, mY - 14 - pageH, cx, mY - pageH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Right curved page
      ctx.beginPath();
      ctx.moveTo(cx, mY);
      ctx.quadraticCurveTo(cx + pageW * 0.5, mY - 14, cx + pageW, mY - 6);
      ctx.lineTo(cx + pageW, mY - 6 - pageH);
      ctx.quadraticCurveTo(cx + pageW * 0.5, mY - 14 - pageH, cx, mY - pageH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gilded calligraphy lines on open pages
      ctx.strokeStyle = '#b45309';
      ctx.lineWidth = 1.2;
      for (let r = 1; r <= 4; r++) {
        const lineY = mY - pageH + 12 + r * 9;
        ctx.beginPath();
        ctx.moveTo(cx - pageW + 12, lineY);
        ctx.lineTo(cx - 8, lineY);
        ctx.moveTo(cx + 8, lineY);
        ctx.lineTo(cx + pageW - 12, lineY);
        ctx.stroke();
      }

      // Floating golden stardust particles rising
      for (let p = 0; p < 18; p++) {
        const px = cx + Math.sin(timeSec * 2 + p) * 60;
        const py = mY - 60 - ((timeSec * 28 + p * 20) % 140);
        ctx.fillStyle = 'rgba(253, 224, 71, 0.75)';
        ctx.beginPath();
        ctx.arc(px, py, (p % 3 === 0 ? 2 : 1.2), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      break;
    }

    case 'straight-path': {
      // 6. Sirat al-Mustaqim / Guided Road (Surah Ya-Sin 36:3-4)
      const pGrad = ctx.createLinearGradient(0, 0, 0, h);
      pGrad.addColorStop(0, '#040612');
      pGrad.addColorStop(0.5, '#1e1b4b');
      pGrad.addColorStop(1, '#09090b');
      ctx.fillStyle = pGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const portalY = h * 0.54;

      // Flanking rolling hills
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, portalY + 30);
      ctx.quadraticCurveTo(w * 0.25, portalY + 10, cx, portalY);
      ctx.quadraticCurveTo(w * 0.75, portalY + 10, w, portalY + 30);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // 3D Perspective Road of Light converging to vanishing point
      const roadGrad = ctx.createLinearGradient(0, h, 0, portalY);
      roadGrad.addColorStop(0, '#F59E0B');
      roadGrad.addColorStop(0.6, '#FDE047');
      roadGrad.addColorStop(1, '#FFFFFF');

      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(cx - 8, portalY);
      ctx.lineTo(cx + 8, portalY);
      ctx.lineTo(cx + w * 0.38, h);
      ctx.lineTo(cx - w * 0.38, h);
      ctx.closePath();
      ctx.fill();

      // Dashed perspective center line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 3;
      for (let s = 0; s < 6; s++) {
        const segProgress = s / 5;
        const curY = portalY + Math.pow(segProgress, 1.8) * (h - portalY);
        const nextY = portalY + Math.pow((s + 0.5) / 5, 1.8) * (h - portalY);
        ctx.beginPath();
        ctx.moveTo(cx, curY);
        ctx.lineTo(cx, nextY);
        ctx.stroke();
      }

      // Radiant Arched Portal at Horizon
      const pGlow = ctx.createRadialGradient(cx, portalY, 0, cx, portalY, 80);
      pGlow.addColorStop(0, '#FFFFFF');
      pGlow.addColorStop(0.4, 'rgba(253, 224, 71, 0.85)');
      pGlow.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = pGlow;
      ctx.beginPath();
      ctx.arc(cx, portalY, 80, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'blessed-tree-garden': {
      // 7. Blessed Olive Tree & Jannah Gardens
      const tGrad = ctx.createLinearGradient(0, 0, 0, h);
      tGrad.addColorStop(0, '#022c22');
      tGrad.addColorStop(0.5, '#064e3b');
      tGrad.addColorStop(1, '#020617');
      ctx.fillStyle = tGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const treeY = h * 0.76;

      // Shimmering Turquoise River in foreground
      const river = ctx.createLinearGradient(0, treeY + 20, 0, h);
      river.addColorStop(0, '#042f2e');
      river.addColorStop(0.5, '#0d9488');
      river.addColorStop(1, '#0f172a');
      ctx.fillStyle = river;
      ctx.fillRect(0, treeY + 20, w, h - (treeY + 20));

      // Sculptural Olive/Jannah Tree
      // Trunk & Branches
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, treeY + 20);
      ctx.quadraticCurveTo(cx - 10, treeY - 40, cx, treeY - 80);
      ctx.stroke();

      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(cx, treeY - 70);
      ctx.quadraticCurveTo(cx - 35, treeY - 95, cx - 60, treeY - 110);
      ctx.moveTo(cx, treeY - 70);
      ctx.quadraticCurveTo(cx + 35, treeY - 95, cx + 60, treeY - 110);
      ctx.stroke();

      // Layered Emerald & Golden Foliage Canopy
      const clusters = [
        { x: cx, y: treeY - 120, r: 48 },
        { x: cx - 45, y: treeY - 105, r: 38 },
        { x: cx + 45, y: treeY - 105, r: 38 },
        { x: cx - 25, y: treeY - 135, r: 34 },
        { x: cx + 25, y: treeY - 135, r: 34 },
      ];

      for (const c of clusters) {
        const cG = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.r);
        cG.addColorStop(0, '#34d399');
        cG.addColorStop(0.6, '#059669');
        cG.addColorStop(1, '#064e3b');
        ctx.fillStyle = cG;
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Golden Olives / Fruits glowing
      for (let f = 0; f < 9; f++) {
        const fx = cx + Math.sin(f * 1.8) * 55;
        const fy = treeY - 110 + Math.cos(f * 2.3) * 35;
        ctx.fillStyle = '#fde047';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(fx, fy, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Orbiting Golden Fireflies
      ctx.shadowBlur = 0;
      for (let i = 0; i < 14; i++) {
        const flyX = cx + Math.sin(timeSec * 2.5 + i * 0.9) * 85;
        const flyY = treeY - 100 + Math.cos(timeSec * 1.8 + i * 1.2) * 50;
        ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
        ctx.beginPath();
        ctx.arc(flyX, flyY, (i % 2 === 0 ? 2.5 : 1.5), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      break;
    }

    case 'two-seas-ship': {
      // 8. Ocean Waves, Ark & Barrier (The Two Seas)
      const oGrad = ctx.createLinearGradient(0, 0, 0, h);
      oGrad.addColorStop(0, '#02050E');
      oGrad.addColorStop(0.5, '#07152B');
      oGrad.addColorStop(1, '#02060D');
      ctx.fillStyle = oGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      // Full Moon
      const moonY = h * 0.44;
      const moonR = 34;
      const mGlow = ctx.createRadialGradient(cx, moonY, 0, cx, moonY, moonR * 2.5);
      mGlow.addColorStop(0, 'rgba(224, 242, 254, 0.45)');
      mGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = mGlow;
      ctx.beginPath();
      ctx.arc(cx, moonY, moonR * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, moonY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // 3 Layers of rolling parallax ocean waves
      const waveBase = h * 0.66;
      for (let layer = 0; layer < 3; layer++) {
        const speed = (layer + 1) * 1.2;
        const ly = waveBase + layer * 28;
        ctx.fillStyle = layer === 0 ? '#0a2540' : layer === 1 ? '#071c32' : '#030e1a';
        ctx.beginPath();
        ctx.moveTo(0, h);
        ctx.lineTo(0, ly);
        for (let x = 0; x <= w; x += 15) {
          const waveHeight = Math.sin(timeSec * speed + x * 0.02 + layer) * (10 + layer * 4);
          ctx.lineTo(x, ly + waveHeight);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();

        // Shimmering foam crest
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Wooden Sailing Ship / Ark Silhouette
      const shipX = cx + Math.sin(timeSec * 0.5) * 35;
      const shipY = waveBase - 10 + Math.sin(timeSec * 1.5) * 6;
      const shipTilt = Math.cos(timeSec * 1.5) * 0.06;

      ctx.save();
      ctx.translate(shipX, shipY);
      ctx.rotate(shipTilt);

      // Hull
      ctx.fillStyle = '#1c1917';
      ctx.beginPath();
      ctx.moveTo(-35, 0);
      ctx.quadraticCurveTo(-40, 16, 0, 18);
      ctx.quadraticCurveTo(40, 16, 45, 0);
      ctx.closePath();
      ctx.fill();

      // Mast & Sails
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -42);
      ctx.stroke();

      // White Sails billowing in wind
      ctx.fillStyle = 'rgba(254, 250, 240, 0.85)';
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.quadraticCurveTo(24, -22, 2, -38);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      ctx.restore();
      break;
    }

    case 'rain-revival': {
      // 9. Rain from the Sky & Blooming Earth
      const rGrad = ctx.createLinearGradient(0, 0, 0, h);
      rGrad.addColorStop(0, '#030712');
      rGrad.addColorStop(0.45, '#1e293b');
      rGrad.addColorStop(1, '#064e3b');
      ctx.fillStyle = rGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      // Rainclouds shelf across mid-sky
      const cloudY = h * 0.44;
      for (let c = 0; c < 5; c++) {
        const cxPos = (w * 0.2) + c * (w * 0.18);
        const clG = ctx.createRadialGradient(cxPos, cloudY, 0, cxPos, cloudY, 65);
        clG.addColorStop(0, 'rgba(71, 85, 105, 0.65)');
        clG.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = clG;
        ctx.beginPath();
        ctx.arc(cxPos, cloudY, 65, 0, Math.PI * 2);
        ctx.fill();
      }

      // Diagonal silver rain streaks
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
      ctx.lineWidth = 1.5;
      for (let r = 0; r < 40; r++) {
        const rx = ((r * 37 + timeSec * 140) % (w + 100)) - 50;
        const ry = cloudY + 20 + ((r * 53 + timeSec * 450) % (h * 0.4));
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 8, ry + 22);
        ctx.stroke();
      }

      // Rolling verdant green hills along bottom
      const hillY = h * 0.78;
      ctx.fillStyle = '#065f46';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, hillY + 15);
      ctx.quadraticCurveTo(w * 0.35, hillY - 25, cx, hillY);
      ctx.quadraticCurveTo(w * 0.75, hillY + 25, w, hillY - 15);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Sprouting green/golden vitality shoots
      for (let s = 0; s < 10; s++) {
        const sx = w * 0.12 + s * (w * 0.08);
        const sy = hillY + Math.sin(s) * 12;
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + 6, sy - 14, sx, sy - 20);
        ctx.stroke();
      }

      ctx.restore();
      break;
    }

    case 'cosmic-scale': {
      // 10. The Balance Scale of Justice — Al-Mizan (Surah Ar-Rahman)
      const sGrad = ctx.createLinearGradient(0, 0, 0, h);
      sGrad.addColorStop(0, '#030014');
      sGrad.addColorStop(0.5, '#2e1065');
      sGrad.addColorStop(1, '#020617');
      ctx.fillStyle = sGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const scaleY = h * 0.62;

      // Celestial Scale Pillar
      ctx.strokeStyle = '#dca349';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(cx, scaleY - 90);
      ctx.lineTo(cx, scaleY + 80);
      ctx.stroke();

      // Pillar base & top crescent
      ctx.fillStyle = '#dca349';
      ctx.beginPath();
      ctx.roundRect(cx - 30, scaleY + 80, 60, 10, 3);
      ctx.fill();

      // Tilting Horizontal Beam
      const tilt = Math.sin(timeSec * 1.4) * 0.045;
      const armLen = 95;

      ctx.save();
      ctx.translate(cx, scaleY - 70);
      ctx.rotate(tilt);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-armLen, 0);
      ctx.lineTo(armLen, 0);
      ctx.stroke();

      // Left Pan & Chains
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(250, 204, 21, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-armLen, 0);
      ctx.lineTo(-armLen - 16, 50);
      ctx.moveTo(-armLen, 0);
      ctx.lineTo(-armLen + 16, 50);
      ctx.stroke();

      ctx.fillStyle = '#dca349';
      ctx.beginPath();
      ctx.arc(-armLen, 50, 20, 0, Math.PI);
      ctx.fill();

      // Light Sphere in Left Pan
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-armLen, 46, 10, 0, Math.PI * 2);
      ctx.fill();

      // Right Pan & Chains
      ctx.beginPath();
      ctx.moveTo(armLen, 0);
      ctx.lineTo(armLen - 16, 50);
      ctx.moveTo(armLen, 0);
      ctx.lineTo(armLen + 16, 50);
      ctx.stroke();

      ctx.fillStyle = '#dca349';
      ctx.beginPath();
      ctx.arc(armLen, 50, 20, 0, Math.PI);
      ctx.fill();

      // Light Sphere in Right Pan
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(armLen, 46, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      ctx.restore();
      break;
    }

    case 'cosmic-eclipse-qiyamah': {
      // 11. Total Solar Eclipse & Shattering Earth (Surah Al-Waqi'ah)
      ctx.fillStyle = '#020205';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const eclipseY = h * 0.56;
      const moonR = Math.min(w, h) * 0.13;

      // Radiant Diamond-Ring Solar Corona
      for (let i = 0; i < 36; i++) {
        const ang = (i / 36) * Math.PI * 2;
        const len = moonR * (1.3 + Math.sin(timeSec * 3 + i) * 0.35);
        const cG = ctx.createLinearGradient(cx, eclipseY, cx + Math.cos(ang) * len, eclipseY + Math.sin(ang) * len);
        cG.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
        cG.addColorStop(1, 'rgba(245, 158, 11, 0)');
        ctx.strokeStyle = cG;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * moonR, eclipseY + Math.sin(ang) * moonR);
        ctx.lineTo(cx + Math.cos(ang) * len, eclipseY + Math.sin(ang) * len);
        ctx.stroke();
      }

      // Pitch-Black Moon Disc
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, eclipseY, moonR, 0, Math.PI * 2);
      ctx.fill();

      // Diamond Flare on Rim
      const flareX = cx + moonR * 0.72;
      const flareY = eclipseY - moonR * 0.70;
      const fG = ctx.createRadialGradient(flareX, flareY, 0, flareX, flareY, 32);
      fG.addColorStop(0, '#FFFFFF');
      fG.addColorStop(0.4, 'rgba(253, 224, 71, 0.85)');
      fG.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = fG;
      ctx.beginPath();
      ctx.arc(flareX, flareY, 32, 0, Math.PI * 2);
      ctx.fill();

      // Fractured mountains along bottom
      ctx.fillStyle = '#0f0f13';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.80);
      ctx.lineTo(w * 0.25, h * 0.72);
      ctx.lineTo(w * 0.45, h * 0.84);
      ctx.lineTo(w * 0.68, h * 0.74);
      ctx.lineTo(w, h * 0.82);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Glowing red magma fissure line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.88);
      ctx.lineTo(w * 0.45, h * 0.84);
      ctx.lineTo(w * 0.75, h * 0.90);
      ctx.stroke();

      ctx.restore();
      break;
    }

    case 'ember-warning': {
      // 12. Blazing Fire & Warning (Ember Volcanic Crags)
      const fGrad = ctx.createLinearGradient(0, 0, 0, h);
      fGrad.addColorStop(0, '#0a0404');
      fGrad.addColorStop(0.5, '#2e0a0a');
      fGrad.addColorStop(1, '#0c0505');
      ctx.fillStyle = fGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      // Jagged basalt volcanic crags
      const cragY = h * 0.76;
      ctx.fillStyle = '#140c0c';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, cragY);
      ctx.lineTo(w * 0.22, cragY - 35);
      ctx.lineTo(w * 0.44, cragY + 15);
      ctx.lineTo(w * 0.65, cragY - 45);
      ctx.lineTo(w * 0.88, cragY + 5);
      ctx.lineTo(w, cragY - 20);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      // Magma Fissure Glow
      const fissure = ctx.createLinearGradient(0, cragY, 0, h);
      fissure.addColorStop(0, 'rgba(234, 88, 12, 0.85)');
      fissure.addColorStop(0.4, 'rgba(220, 38, 38, 0.45)');
      fissure.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = fissure;
      ctx.fillRect(0, cragY, w, h - cragY);

      // Rising Animated Ember Sparks
      for (let i = 0; i < 35; i++) {
        const sparkProgress = (timeSec * 0.45 + i * 0.08) % 1.0;
        const sparkX = cx + Math.sin(timeSec * 3 + i * 1.5) * (w * 0.4);
        const sparkY = h - sparkProgress * (h * 0.55);
        const sparkRadius = (1 - sparkProgress) * 3.5 + 0.8;
        const alpha = Math.sin(sparkProgress * Math.PI) * 0.9;

        ctx.fillStyle = `rgba(251, 146, 60, ${alpha})`;
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, sparkRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      break;
    }

    case 'kaaba-sanctuary': {
      // 13. The Sacred Kaaba & Makkah (Isometric Kiswah & Tawaf)
      const kGrad = ctx.createRadialGradient(cx, stageCenterY, 0, cx, stageCenterY, w * 0.75);
      kGrad.addColorStop(0, '#18181b');
      kGrad.addColorStop(0.6, '#09090b');
      kGrad.addColorStop(1, '#020203');
      ctx.fillStyle = kGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const kaabaY = h * 0.65;
      const kw = 70;
      const kh = 85;

      // Concentric Tawaf light rings on Mataf floor
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.2;
      for (let r = 1; r <= 3; r++) {
        ctx.beginPath();
        ctx.ellipse(cx, kaabaY + 45, 95 + r * 30, 35 + r * 12, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Column of divine Noor ascending into heavens
      const noor = ctx.createLinearGradient(cx, kaabaY - kh, cx, kaabaY - kh - 200);
      noor.addColorStop(0, 'rgba(253, 224, 71, 0.35)');
      noor.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = noor;
      ctx.fillRect(cx - 24, kaabaY - kh - 200, 48, 200);

      // Kaaba Cube (Isometric View)
      // Front Face
      ctx.fillStyle = '#09090b';
      ctx.beginPath();
      ctx.moveTo(cx - kw * 0.5, kaabaY - kh * 0.4);
      ctx.lineTo(cx, kaabaY);
      ctx.lineTo(cx, kaabaY + kh * 0.6);
      ctx.lineTo(cx - kw * 0.5, kaabaY + kh * 0.2);
      ctx.closePath();
      ctx.fill();

      // Right Face
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.moveTo(cx, kaabaY);
      ctx.lineTo(cx + kw * 0.5, kaabaY - kh * 0.4);
      ctx.lineTo(cx + kw * 0.5, kaabaY + kh * 0.2);
      ctx.lineTo(cx, kaabaY + kh * 0.6);
      ctx.closePath();
      ctx.fill();

      // Roof Face
      ctx.fillStyle = '#27272a';
      ctx.beginPath();
      ctx.moveTo(cx, kaabaY - kh * 0.8);
      ctx.lineTo(cx + kw * 0.5, kaabaY - kh * 0.4);
      ctx.lineTo(cx, kaabaY);
      ctx.lineTo(cx - kw * 0.5, kaabaY - kh * 0.4);
      ctx.closePath();
      ctx.fill();

      // Gleaming Golden Hizam Band
      ctx.strokeStyle = '#dca349';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - kw * 0.5, kaabaY - kh * 0.2);
      ctx.lineTo(cx, kaabaY + kh * 0.2);
      ctx.lineTo(cx + kw * 0.5, kaabaY - kh * 0.2);
      ctx.stroke();

      // Bab al-Kaaba (Door)
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.moveTo(cx - 20, kaabaY + kh * 0.25);
      ctx.lineTo(cx - 8, kaabaY + kh * 0.35);
      ctx.lineTo(cx - 8, kaabaY + kh * 0.55);
      ctx.lineTo(cx - 20, kaabaY + kh * 0.45);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'rawdah-mihrab-prayer': {
      // 14. Grand Mosque Arcade & Chandelier (Rawdah Mihrab)
      const mGrad = ctx.createLinearGradient(0, 0, 0, h);
      mGrad.addColorStop(0, '#02140b');
      mGrad.addColorStop(0.5, '#063b22');
      mGrad.addColorStop(1, '#020b06');
      ctx.fillStyle = mGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      const archY = h * 0.76;

      // Grand Islamic Mosque Arches
      ctx.strokeStyle = '#dca349';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx - 80, archY);
      ctx.lineTo(cx - 80, archY - 100);
      ctx.quadraticCurveTo(cx - 80, archY - 150, cx, archY - 170);
      ctx.quadraticCurveTo(cx + 80, archY - 150, cx + 80, archY - 100);
      ctx.lineTo(cx + 80, archY);
      ctx.stroke();

      // Inner Mihrab niche glow
      const mGlow = ctx.createRadialGradient(cx, archY - 90, 0, cx, archY - 90, 90);
      mGlow.addColorStop(0, 'rgba(253, 224, 71, 0.45)');
      mGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = mGlow;
      ctx.beginPath();
      ctx.arc(cx, archY - 90, 90, 0, Math.PI * 2);
      ctx.fill();

      // Hanging Mosque Chandelier Lantern
      const chanTilt = Math.sin(timeSec * 1.5) * 4;
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, archY - 170);
      ctx.lineTo(cx + chanTilt, archY - 100);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(cx + chanTilt, archY - 96, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'iron-chains-veil': {
      // 15. Barriers & Parting Light for the Heedless (Surah Ya-Sin 36:6-10)
      const vGrad = ctx.createLinearGradient(0, 0, 0, h);
      vGrad.addColorStop(0, '#030712');
      vGrad.addColorStop(0.5, '#111827');
      vGrad.addColorStop(1, '#020408');
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      // Distant narrow sliver of guiding horizon light
      const slit = ctx.createLinearGradient(cx, h * 0.45, cx, h * 0.85);
      slit.addColorStop(0, 'rgba(253, 224, 71, 0)');
      slit.addColorStop(0.5, 'rgba(253, 224, 71, 0.85)');
      slit.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = slit;
      ctx.fillRect(cx - 4, h * 0.45, 8, h * 0.40);

      // Two Towering Monolith Barriers (Saddan)
      ctx.fillStyle = '#0f172a';
      // Left Monolith
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.40);
      ctx.lineTo(cx - 15, h * 0.45);
      ctx.lineTo(cx - 15, h);
      ctx.closePath();
      ctx.fill();

      // Right Monolith
      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(w, h * 0.40);
      ctx.lineTo(cx + 15, h * 0.45);
      ctx.lineTo(cx + 15, h);
      ctx.closePath();
      ctx.fill();

      // Hanging Chains in foreground
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 70, h * 0.70);
      ctx.quadraticCurveTo(cx, h * 0.78, cx + 70, h * 0.70);
      ctx.stroke();

      ctx.restore();
      break;
    }

    case 'desert-fortress-history': {
      // 16. Ancient Desert Canyon & Twilight Sky
      const dGrad = ctx.createLinearGradient(0, 0, 0, h);
      dGrad.addColorStop(0, '#1a0928');
      dGrad.addColorStop(0.48, '#7c2d12');
      dGrad.addColorStop(0.78, '#f59e0b');
      dGrad.addColorStop(1, '#451a03');
      ctx.fillStyle = dGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(cx, stageCenterY);
      ctx.scale(zoomScale, zoomScale);
      ctx.translate(-cx, -stageCenterY);

      // Massive carved sandstone arch on left
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.50);
      ctx.quadraticCurveTo(w * 0.25, h * 0.48, w * 0.32, h * 0.65);
      ctx.quadraticCurveTo(w * 0.18, h * 0.68, 0, h * 0.75);
      ctx.closePath();
      ctx.fill();

      // Canyon Pillars on right
      ctx.beginPath();
      ctx.moveTo(w, h);
      ctx.lineTo(w, h * 0.52);
      ctx.lineTo(w * 0.75, h * 0.60);
      ctx.lineTo(w * 0.78, h);
      ctx.closePath();
      ctx.fill();

      // Wind-carved dunes across center
      ctx.fillStyle = '#7c2d12';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.82);
      ctx.quadraticCurveTo(w * 0.45, h * 0.74, w, h * 0.84);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'auto-meaning':
    default: {
      // Standalone Multi-Hue Celestial Aurora (for Auto Meaning preview)
      const auroraGrad = ctx.createLinearGradient(0, 0, 0, h);
      auroraGrad.addColorStop(0, '#020617');
      auroraGrad.addColorStop(0.35, '#1e1b4b');
      auroraGrad.addColorStop(0.65, '#064e3b');
      auroraGrad.addColorStop(0.85, '#78350f');
      auroraGrad.addColorStop(1, '#020617');
      ctx.fillStyle = auroraGrad;
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < 3; i++) {
        const waveY = h * (0.40 + i * 0.15);
        const grad = ctx.createRadialGradient(
          w * (0.3 + 0.4 * Math.sin(timeSec * 0.8 + i)),
          waveY,
          0,
          w * 0.5,
          waveY,
          w * 0.6
        );
        grad.addColorStop(0, i === 0 ? 'rgba(168, 85, 247, 0.22)' : i === 1 ? 'rgba(16, 185, 129, 0.20)' : 'rgba(245, 158, 11, 0.18)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
      break;
    }
  }

  // Soft atmospheric top vignette across upper 36% for typography stage
  const topVignette = ctx.createLinearGradient(0, 0, 0, h * 0.38);
  topVignette.addColorStop(0, 'rgba(2, 6, 12, 0.70)');
  topVignette.addColorStop(0.55, 'rgba(2, 6, 12, 0.40)');
  topVignette.addColorStop(1, 'rgba(2, 6, 12, 0.0)');
  ctx.fillStyle = topVignette;
  ctx.fillRect(0, 0, w, h * 0.38);

  ctx.restore();
}

/**
 * SAFEGUARD 3 — Offscreen Static Layer Pre-Rendering
 * Renders the top-third typography stage (Zone A) onto lightweight offscreen canvases.
 * NO bulky rectangular border box! Open cinema screen aesthetic (@sufariq style).
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
    withTashkeel,
    subtitleLang,
  } = params;

  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d');
  if (!ctx) return offscreen;

  const isLandscape = width > height;
  const maxTextWidth = Math.round(width * (isLandscape ? 0.72 : 0.86));

  // Translation font stack & language helpers
  const isUrdu = subtitleLang === 'ur';
  const isHindi = subtitleLang === 'hi';
  const isGujarati = subtitleLang === 'gu';

  const getTransFont = (size: number) => {
    if (isUrdu) return `400 ${size + 3}px "Noto Nastaliq Urdu", serif`;
    if (isHindi) return `600 ${size}px "Noto Sans Devanagari", system-ui, sans-serif`;
    if (isGujarati) return `600 ${size}px "Noto Sans Gujarati", system-ui, sans-serif`;
    return `500 ${size}px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif`;
  };

  // ZONE A — Upper Typography Stage (y = 8% to 34% of canvas height)
  // 1. Top Small Header (y = 10%)
  const headerY = Math.round(height * 0.10);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '700 18px "Amiri", "Scheherazade New", serif';
  ctx.fillStyle = 'rgba(235, 210, 160, 0.85)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 6;
  ctx.fillText(
    `سُورَةُ ${surahNameArabic || 'الْقُرْآن'} • Ayah ${ayah.ayahNumber}`,
    width * 0.5,
    headerY
  );
  ctx.restore();

  // 2. Arabic Ayah & Translation
  const arabicTextRaw = withTashkeel ? ayah.textUthmani : stripTashkeel(ayah.textUthmani);
  const arabicContent = arabicTextRaw || 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';

  let arabicFontSize = isLandscape ? 28 : width < 800 ? 32 : 40;
  if (arabicContent.length > 200) arabicFontSize = Math.round(arabicFontSize * 0.72);
  else if (arabicContent.length > 120) arabicFontSize = Math.round(arabicFontSize * 0.82);

  ctx.save();
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.font = `700 ${arabicFontSize}px "Amiri", "Scheherazade New", serif`;

  let arabicLines = wrapCanvasText(ctx, arabicContent, maxTextWidth);
  let arabicLineHeight = Math.round(arabicFontSize * 1.55);
  let totalArabicHeight = arabicLines.length * arabicLineHeight;

  let transLines: string[] = [];
  let transFontSize = isLandscape ? 14 : width < 800 ? 16 : 19;

  if (subtitleLang !== 'none' && ayah.translation) {
    ctx.direction = isUrdu ? 'rtl' : 'ltr';
    ctx.font = getTransFont(transFontSize);
    transLines = wrapCanvasText(ctx, ayah.translation, maxTextWidth);
  }

  let transLineHeight = Math.round(transFontSize * 1.45);
  let totalTransHeight = transLines.length * transLineHeight;

  const gap = Math.max(14, Math.round(height * 0.018));
  const totalTextHeight = totalArabicHeight + (transLines.length > 0 ? gap + totalTransHeight : 0);

  // Height budget for Upper Typography: strictly y = 0.08 * h to 0.35 * h (budget = 0.25 * h)
  const maxAvailableHeight = Math.round(height * 0.24);
  if (totalTextHeight > maxAvailableHeight) {
    const scale = maxAvailableHeight / totalTextHeight;
    arabicFontSize = Math.max(20, Math.round(arabicFontSize * scale));
    arabicLineHeight = Math.round(arabicFontSize * 1.55);
    ctx.font = `700 ${arabicFontSize}px "Amiri", "Scheherazade New", serif`;
    arabicLines = wrapCanvasText(ctx, arabicContent, maxTextWidth);
    totalArabicHeight = arabicLines.length * arabicLineHeight;

    transFontSize = Math.max(12, Math.round(transFontSize * scale));
    transLineHeight = Math.round(transFontSize * 1.45);
    if (transLines.length > 0) {
      ctx.font = getTransFont(transFontSize);
      transLines = wrapCanvasText(ctx, ayah.translation!, maxTextWidth);
      totalTransHeight = transLines.length * transLineHeight;
    }
  }

  // Draw Arabic Text (NO bulky rectangular border box! Open cinema screen aesthetic)
  let curY = headerY + 28 + arabicFontSize;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.font = `700 ${arabicFontSize}px "Amiri", "Scheherazade New", serif`;
  ctx.fillStyle = '#FFFDF9';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
  ctx.shadowBlur = 14;

  for (const line of arabicLines) {
    ctx.fillText(line, width * 0.5, curY);
    curY += arabicLineHeight;
  }

  // Draw Subtitle / Translation
  if (transLines.length > 0) {
    curY += gap - (arabicLineHeight - arabicFontSize);
    ctx.direction = isUrdu ? 'rtl' : 'ltr';
    ctx.font = getTransFont(transFontSize);
    ctx.fillStyle = 'rgba(235, 230, 220, 0.90)';
    ctx.shadowBlur = 8;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.90)';

    for (const line of transLines) {
      ctx.fillText(line, width * 0.5, curY);
      curY += transLineHeight;
    }
  }

  ctx.restore();
  return offscreen;
}

/**
 * Draw Sleek Progress Bar, Outer Golden Filigree Frame & Noor Connect Watermark
 * Signature "@sufariq" aesthetic (video_2.mp4)
 */
export function drawClipOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  progress: number // 0 to 1
): void {
  ctx.save();

  // 1. Outer Golden Filigree Frame (video_2.mp4 Signature)
  const pad = Math.round(width * 0.028);
  const frameW = width - pad * 2;
  const frameH = height - pad * 2;
  const radius = Math.min(24, Math.round(width * 0.035));

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(212, 175, 55, 0.25)';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.roundRect(pad, pad, frameW, frameH, radius);
  ctx.stroke();

  // Subtle inner ambient rim
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(pad + 3, pad + 3, frameW - 6, frameH - 6, Math.max(4, radius - 3));
  ctx.stroke();

  // 2. Sleek Inset Top Progress Bar
  const barH = 3;
  const barY = pad + 4;
  const barW = frameW - 8;
  const barX = pad + 4;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.fillRect(barX, barY, barW, barH);

  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, '#DCA349');
  fillGrad.addColorStop(1, '#FDE047');
  ctx.fillStyle = fillGrad;
  ctx.fillRect(barX, barY, barW * Math.min(1, Math.max(0, progress)), barH);

  // 3. Noor Connect Watermark (Bottom)
  const wmY = height - pad - 12;
  ctx.textAlign = 'center';
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(220, 163, 73, 0.80)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
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
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      const base64 = res.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Tab 2: AYAH IMAGE CARD EXPORT (1080p High Resolution PNG)
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

  // 1. Draw Selected Procedural Scene (dynamically resolved if auto-meaning) at time = 0
  let targetSceneId = params.sceneId;
  if (targetSceneId === 'auto-meaning') {
    const res = resolveSceneForAyah(
      params.ayah.textUthmani,
      params.ayah.translation || '',
      params.surahNumber,
      params.ayah.ayahNumber
    );
    targetSceneId = res.sceneId;
  }
  drawProceduralScene(ctx, targetSceneId, dims.width, dims.height, 0, 1.04);

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

  // 3. Draw Watermark & Frame
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
 * With Sub-Ayah Phrase Choreography & Ken Burns 1.00x -> 1.08x Camera Push
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

  if (!ayahs || ayahs.length === 0) {
    throw new Error('No Ayahs selected for video generation');
  }

  // 1. SAFEGUARD 1 — Font Readiness Gate
  onProgress?.({ stage: 'fonts', percent: 5, statusText: 'Verifying Calligraphy Fonts...' });
  await ensureFontsReady();

  // 2. Setup AudioContext & Offscreen Canvas
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) {
    throw new Error('Web Audio API is not supported on this device');
  }
  const audioContext = new AudioCtxClass();
  const streamDest = audioContext.createMediaStreamDestination();

  if (audioContext.state === 'suspended') {
    try {
      await audioContext.resume();
    } catch (_resumeErr) {
      // AudioContext state resume notice handled
    }
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
  interface ExtendedTimelineItem extends ClipAyahTimelineItem {
    resolvedSceneId: SceneId;
    subTimeline: VisualSegment[];
  }
  const timeline: ExtendedTimelineItem[] = [];

  const sceneJourney = resolveSceneJourney(
    ayahs.map((a) => ({
      ayahNumber: a.ayahNumber,
      textUthmani: a.textUthmani,
      translation: a.translation,
    })),
    surahNumber
  );
  const sceneMap = new Map<number, SceneId>();
  sceneJourney.forEach((sj) => sceneMap.set(sj.ayahNumber, sj.sceneId));

  for (const item of audioItems) {
    if (accumulatedTime >= 60) break;
    const dur = Math.min(item.duration, 60 - accumulatedTime);
    const itemSceneId = sceneId === 'auto-meaning' ? (sceneMap.get(item.ayahNumber) || 'illuminated-quran') : sceneId;

    const ayahData = ayahs.find((a) => a.ayahNumber === item.ayahNumber);
    const itemSubTimeline = sceneId === 'auto-meaning'
      ? resolveAyahVisualTimeline(
          ayahData?.textUthmani || '',
          ayahData?.translation || '',
          surahNumber,
          item.ayahNumber,
          dur
        )
      : [
          {
            startRatio: 0.0,
            endRatio: 1.0,
            startTime: 0.0,
            endTime: dur,
            sceneId,
            label: '',
            icon: '',
          },
        ];

    timeline.push({
      ayahNumber: item.ayahNumber,
      audioBuffer: item.audioBuffer,
      startTime: accumulatedTime,
      endTime: accumulatedTime + dur,
      resolvedSceneId: itemSceneId,
      subTimeline: itemSubTimeline,
    });
    accumulatedTime += dur;
  }

  const totalDuration = accumulatedTime;

  // 5. Pre-Render Offscreen Canvases for Each Ayah
  onProgress?.({ stage: 'rendering', percent: 48, statusText: 'Pre-rendering Calligraphy Stages...' });
  const dims = ASPECT_RATIO_PRESETS[aspectRatio].video;

  const cachedAyahBitmaps = new Map<number, HTMLCanvasElement>();
  for (const a of ayahs) {
    const off = prerenderAyahOffscreenCanvas({
      width: dims.width,
      height: dims.height,
      ayah: a,
      surahNameArabic,
      surahNameEnglish,
      withTashkeel,
      subtitleLang,
    });
    cachedAyahBitmaps.set(a.ayahNumber, off);
  }

  // 6. Setup Rendering Canvas & CaptureStream (30 FPS)
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = dims.width;
  renderCanvas.height = dims.height;
  const ctx = renderCanvas.getContext('2d');
  if (!ctx) {
    audioContext.close().catch(() => {});
    throw new Error('Failed to create render canvas 2D context');
  }

  let contextLostOccurred = false;
  renderCanvas.addEventListener('contextlost', (e) => {
    e.preventDefault();
    contextLostOccurred = true;
  });

  const canvasStream = (renderCanvas as any).captureStream
    ? renderCanvas.captureStream(30)
    : (renderCanvas as any).webkitCaptureStream
    ? (renderCanvas as any).webkitCaptureStream(30)
    : null;

  if (!canvasStream) {
    audioContext.close().catch(() => {});
    throw new Error('Canvas captureStream is not supported in this browser environment');
  }

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
      const activeIndex = timeline.findIndex(
        (t) => visualElapsed >= t.startTime && visualElapsed < t.endTime
      );
      const safeIndex = activeIndex >= 0 ? activeIndex : timeline.length - 1;
      const activeTimelineItem = timeline[safeIndex];

      const timeInAyah = visualElapsed - activeTimelineItem.startTime;
      const subSegments = activeTimelineItem.subTimeline || [];
      const segIndex = subSegments.findIndex(
        (s) => timeInAyah >= s.startTime && timeInAyah < s.endTime
      );
      const safeSegIndex = segIndex >= 0 ? segIndex : subSegments.length - 1;
      const activeSeg = subSegments[safeSegIndex];

      const currScene = activeSeg ? activeSeg.sceneId : activeTimelineItem.resolvedSceneId;
      const segStartTime = activeSeg ? activeSeg.startTime : 0;
      const segEndTime = activeSeg ? activeSeg.endTime : activeTimelineItem.endTime - activeTimelineItem.startTime;
      const timeInSeg = Math.max(0, timeInAyah - segStartTime);
      const segDuration = Math.max(0.1, segEndTime - segStartTime);

      // Ken Burns 1.00x -> 1.08x camera zoom push
      const zoomProgress = Math.min(1.0, Math.max(0.0, timeInSeg / segDuration));
      const zoomScale = 1.00 + 0.08 * zoomProgress;

      // 500ms scene cross-fade during sub-segment / ayah transitions
      if (safeSegIndex > 0 || (safeIndex > 0 && timeInAyah < 0.50)) {
        let prevScene = currScene;
        if (safeSegIndex > 0) {
          prevScene = subSegments[safeSegIndex - 1].sceneId;
        } else if (safeIndex > 0) {
          const prevItem = timeline[safeIndex - 1];
          const prevSubs = prevItem.subTimeline || [];
          prevScene = prevSubs.length > 0 ? prevSubs[prevSubs.length - 1].sceneId : prevItem.resolvedSceneId;
        }

        if (prevScene !== currScene && timeInSeg < 0.50) {
          drawProceduralScene(ctx, prevScene, dims.width, dims.height, visualElapsed, 1.08);
          const crossProgress = timeInSeg / 0.50;
          const easeAlpha = crossProgress * crossProgress * (3 - 2 * crossProgress);
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, easeAlpha));
          drawProceduralScene(ctx, currScene, dims.width, dims.height, visualElapsed, zoomScale);
          ctx.restore();
        } else {
          drawProceduralScene(ctx, currScene, dims.width, dims.height, visualElapsed, zoomScale);
        }
      } else {
        drawProceduralScene(ctx, currScene, dims.width, dims.height, visualElapsed, zoomScale);
      }

      // Draw Pre-rendered Active Ayah Bitmap with 0.25s boundary fade
      const cachedBmp = cachedAyahBitmaps.get(activeTimelineItem.ayahNumber);
      if (cachedBmp) {
        const textAlpha = Math.min(1.0, timeInAyah / 0.25);
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.drawImage(cachedBmp, 0, 0);
        ctx.restore();
      }

      // Draw Golden Frame + Progress Bar + Watermark (< 0.2ms)
      const clipProgress = totalDuration > 0 ? visualElapsed / totalDuration : 0;
      drawClipOverlay(ctx, dims.width, dims.height, clipProgress);

      frameCount++;

      // Progress reporting
      const renderPct = Math.round(50 + clipProgress * 45);
      onProgress?.({
        stage: 'rendering',
        currentAyah: activeTimelineItem.ayahNumber,
        totalAyahs: totalVerses,
        percent: renderPct,
        statusText: `Encoding HD Reel... (${Math.round(clipProgress * 100)}%)`,
      });

      // Yield frame
      await new Promise((resolve) => setTimeout(resolve, frameIntervalMs));
    }
  } finally {
    for (const s of activeSources) {
      try {
        s.stop();
      } catch (_stopErr) {
        // Source already terminated
      }
    }
  }

  if (signal?.aborted) {
    recorder.stop();
    audioContext.close().catch(() => {});
    throw new DOMException('Aborted by user', 'AbortError');
  }

  if (contextLostOccurred) {
    recorder.stop();
    audioContext.close().catch(() => {});
    throw new Error('GPU Canvas Context Reset during rendering.');
  }

  // 8. Stop recorder and package output blob
  onProgress?.({ stage: 'encoding', percent: 96, statusText: 'Packaging MP4 Video Reel...' });

  const outputBlob = await new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      try {
        const finalBlob = new Blob(recordedChunks, { type: selectedMime });
        resolve(finalBlob);
      } catch (e) {
        reject(e);
      }
    };
    recorder.onerror = (e) => reject(e);
    recorder.stop();
  });

  audioContext.close().catch(() => {});

  onProgress?.({ stage: 'complete', percent: 100, statusText: 'Reel Export Complete!' });

  return {
    blob: outputBlob,
    mimeType: selectedMime,
    extension,
    duration: totalDuration,
  };
}

/**
 * SAFEGUARD 7 — Native Android Filesystem.writeFile + Share.share
 */
export async function exportAndShareClip(params: {
  blob: Blob;
  fileName: string;
  mimeType: string;
  title: string;
  text: string;
}): Promise<void> {
  const { blob, fileName, mimeType, title, text } = params;

  // 1. Capacitor Native Android Path
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await blobToBase64(blob);
      const filePath = `clips/${fileName}`;

      await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      const uriResult = await Filesystem.getUri({
        path: filePath,
        directory: Directory.Cache,
      });

      await Share.share({
        title,
        text,
        url: uriResult.uri,
        dialogTitle: 'Share Quran Clip',
      });
      return;
    } catch (err: any) {
      // User cancelled share dialog -> ignore silently
      if (
        err?.message?.includes('cancelled') ||
        err?.message?.includes('canceled') ||
        err?.message?.includes('User dismissed')
      ) {
        return;
      }
      // Fall through to browser download on error
    }
  }

  // 2. Web Browser Fallback
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 4000);
}
