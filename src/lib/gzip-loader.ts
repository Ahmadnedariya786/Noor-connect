/**
 * gzip-loader.ts
 * Loads gzip-compressed JSON assets from the local bundle (see clean-dist-data.js).
 *
 * At build time hadith data is shipped as *.json.gz (~65-70% smaller in the APK);
 * at runtime we decompress it with DecompressionStream (Chromium 103+, i.e. all
 * modern Android WebViews). Older WebViews fall back to the caller's plain-fetch
 * path via isGzipSupported().
 *
 * Heavy loads (the hadith collections are 15MB+ of JSON) are parsed inside a
 * Web Worker so the renderer main thread is never blocked for long stretches —
 * long synchronous work in the renderer is a common cause of WebView
 * renderer-process death on Android. If the worker can't be created or fails,
 * we transparently fall back to the original inline path.
 */

import JsonParseWorker from "./json-parse-worker?worker";

/** True when the runtime WebView supports DecompressionStream. */
export const isGzipSupported = (): boolean =>
  typeof DecompressionStream !== "undefined";

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

let workerInstance: Worker | null = null;
let workerRequestSeq = 0;
let workerBroken = false;
const pendingRequests = new Map<number, PendingRequest>();

/** Get the shared parse worker, or null if workers are unavailable. */
function getParseWorker(): Worker | null {
  if (workerBroken) return null;
  if (workerInstance) return workerInstance;

  let instance: Worker;
  try {
    instance = new JsonParseWorker();
  } catch {
    workerBroken = true;
    return null;
  }

  instance.onmessage = (event: MessageEvent) => {
    const msg = event.data as {
      id?: number;
      ok?: boolean;
      data?: unknown;
      error?: string;
    };
    if (typeof msg?.id !== "number") return;
    const pending = pendingRequests.get(msg.id);
    if (!pending) return;
    pendingRequests.delete(msg.id);
    if (msg.ok) {
      pending.resolve(msg.data);
    } else {
      pending.reject(new Error(msg.error || "Worker failed to parse data"));
    }
  };

  instance.onerror = () => {
    // Worker crashed or failed to load — reject everything pending and stop
    // trying so callers fall back to the inline parse path.
    workerBroken = true;
    for (const pending of pendingRequests.values()) {
      pending.reject(new Error("Worker unavailable"));
    }
    pendingRequests.clear();
    if (workerInstance) {
      try {
        workerInstance.terminate();
      } catch {
        // ignore
      }
    }
    workerInstance = null;
  };

  workerInstance = instance;
  return instance;
}

/**
 * Fetch a gzipped JSON file and parse it.
 * Throws when the request fails or the payload is not valid JSON.
 */
export async function loadGzippedJson<T>(url: string): Promise<T> {
  const worker = getParseWorker();
  if (worker) {
    try {
      return await new Promise<T>((resolve, reject) => {
        const id = ++workerRequestSeq;
        pendingRequests.set(id, { resolve: resolve as (v: unknown) => void, reject });
        worker.postMessage({ id, url, gzipped: true });
      });
    } catch (error) {
      // Worker path failed (crash, timeout, unsupported) — fall through to the
      // inline implementation so loading still works everywhere.
      console.warn('Worker parse failed for %s, falling back inline:', url, error);
    }
  }

  return loadGzippedJsonInline<T>(url);
}

/** Inline (main-thread) implementation, used as a fallback. */
async function loadGzippedJsonInline<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const ds = new DecompressionStream("gzip");
  const stream = blob.stream().pipeThrough(ds);
  const text = await new Response(stream).text();
  return JSON.parse(text) as T;
}
