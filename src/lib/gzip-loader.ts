/**
 * gzip-loader.ts
 * Loads gzip-compressed JSON assets from the local bundle (see clean-dist-data.js).
 *
 * At build time hadith data is shipped as *.json.gz (~65-70% smaller in the APK);
 * at runtime we decompress it with DecompressionStream (Chromium 103+, i.e. all
 * modern Android WebViews). Older WebViews fall back to the caller's plain-fetch
 * path via isGzipSupported().
 */

/** True when the runtime WebView supports DecompressionStream. */
export const isGzipSupported = (): boolean =>
  typeof DecompressionStream !== 'undefined';

/**
 * Fetch a gzipped JSON file and parse it.
 * Throws when the request fails or the payload is not valid JSON.
 */
export async function loadGzippedJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const blob = await response.blob();
  const ds = new DecompressionStream('gzip');
  const stream = blob.stream().pipeThrough(ds);
  const text = await new Response(stream).text();
  return JSON.parse(text) as T;
}
