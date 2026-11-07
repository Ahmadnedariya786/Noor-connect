// Noor Connect — Multi-Tier Universal Cloud E-Book Delivery Engine
// Streams large PDF volumes directly from GitHub Releases (ebooks-library-v1) via native Android stream proxy

import { savePdfBlob } from './idb-pdf-store';

export interface CloudEbookItem {
  id: string;
  volNumber: number;
  title: string;
  urduTitle: string;
  urduSubtitle: string;
  author: string;
  urduAuthor: string;
  coverage: string;
  juzCoverage: string;
  surahRange: string;
  category: string;
  estimatedSize: string;
  approxBytes: number;
  fileName: string;
  androidStreamUrl: string;
  githubReleaseUrl: string;
  localKey: string;
}

export interface EbooksCatalogManifest {
  version: string;
  updatedAt: string;
  description: string;
  catalog: CloudEbookItem[];
}

export interface DownloadProgressState {
  volId: string;
  isDownloading: boolean;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  statusText: string;
  error?: string;
  isCompleted?: boolean;
}

const STORAGE_CATALOG_KEY = 'noor_ebooks_cloud_catalog_v1';
const REMOTE_CATALOG_URL =
  'https://raw.githubusercontent.com/Ahmadnedariya786/Noor-connect/main/public/ebooks-catalog.json';

export const FALLBACK_CATALOG: CloudEbookItem[] = [
  {
    id: 'anwar-ul-bayan-vol-1',
    volNumber: 1,
    title: 'Tafseer Anwar-ul-Bayan — Part 1 (Vol. 1)',
    urduTitle: 'تفسیر انوار البیان — جلد اول',
    urduSubtitle: 'پارہ 1 تا 7',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: "Surah Al-Fatiha (1) to Surah Al-Ma'idah (5) • Juz 1 to 7",
    juzCoverage: 'Juz 1 to 7',
    surahRange: "Al-Fatiha (1) — Al-Ma'idah (5)",
    category: 'Quran & Tafsir',
    estimatedSize: '157.4 MB',
    approxBytes: 165044224,
    fileName: 'AnwarulBayan-Volume1.pdf',
    androidStreamUrl: '/__gh_ebook__/AnwarulBayan-Volume1.pdf',
    githubReleaseUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume1.pdf',
    localKey: 'anwar-ul-bayan-vol-1',
  },
  {
    id: 'anwar-ul-bayan-vol-2',
    volNumber: 2,
    title: 'Tafseer Anwar-ul-Bayan — Part 2 (Vol. 2)',
    urduTitle: 'تفسیر انوار البیان — جلد دوم',
    urduSubtitle: 'پارہ 7 تا 13',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: "Surah Al-An'am (6) to Surah Ibrahim (14) • Juz 7 to 13",
    juzCoverage: 'Juz 7 to 13',
    surahRange: "Al-An'am (6) — Ibrahim (14)",
    category: 'Quran & Tafsir',
    estimatedSize: '154.7 MB',
    approxBytes: 162214912,
    fileName: 'AnwarulBayan-Volume2.pdf',
    androidStreamUrl: '/__gh_ebook__/AnwarulBayan-Volume2.pdf',
    githubReleaseUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume2.pdf',
    localKey: 'anwar-ul-bayan-vol-2',
  },
  {
    id: 'anwar-ul-bayan-vol-3',
    volNumber: 3,
    title: 'Tafseer Anwar-ul-Bayan — Part 3 (Vol. 3)',
    urduTitle: 'تفسیر انوار البیان — جلد سوم',
    urduSubtitle: 'پارہ 14 تا 21',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: 'Surah Al-Hijr (15) to Surah Al-Ankabut (29) • Juz 14 to 21',
    juzCoverage: 'Juz 14 to 21',
    surahRange: 'Al-Hijr (15) — Al-Ankabut (29)',
    category: 'Quran & Tafsir',
    estimatedSize: '139.7 MB',
    approxBytes: 146486272,
    fileName: 'AnwarulBayan-Volume3.pdf',
    androidStreamUrl: '/__gh_ebook__/AnwarulBayan-Volume3.pdf',
    githubReleaseUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume3.pdf',
    localKey: 'anwar-ul-bayan-vol-3',
  },
  {
    id: 'anwar-ul-bayan-vol-4',
    volNumber: 4,
    title: 'Tafseer Anwar-ul-Bayan — Part 4 (Vol. 4)',
    urduTitle: 'تفسیر انوار البیان — جلد چہارم',
    urduSubtitle: 'پارہ 21 تا 27',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: 'Surah Ar-Rum (30) to Surah Al-Hadid (57) • Juz 21 to 27',
    juzCoverage: 'Juz 21 to 27',
    surahRange: 'Ar-Rum (30) — Al-Hadid (57)',
    category: 'Quran & Tafsir',
    estimatedSize: '160.5 MB',
    approxBytes: 168296448,
    fileName: 'AnwarulBayan-Volume4.pdf',
    androidStreamUrl: '/__gh_ebook__/AnwarulBayan-Volume4.pdf',
    githubReleaseUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume4.pdf',
    localKey: 'anwar-ul-bayan-vol-4',
  },
  {
    id: 'anwar-ul-bayan-vol-5',
    volNumber: 5,
    title: 'Tafseer Anwar-ul-Bayan — Part 5 (Vol. 5)',
    urduTitle: 'تفسیر انوار البیان — جلد پنجم',
    urduSubtitle: 'پارہ 28 تا 30',
    author: 'Mufti Muhammad Aashiq Ilahi Bulandshahri (R.A.)',
    urduAuthor: 'حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی رحمه الله',
    coverage: 'Surah Al-Mujadilah (58) to Surah An-Nas (114) • Juz 28 to 30',
    juzCoverage: 'Juz 28 to 30',
    surahRange: 'Al-Mujadilah (58) — An-Nas (114)',
    category: 'Quran & Tafsir',
    estimatedSize: '148.0 MB',
    approxBytes: 155189248,
    fileName: 'AnwarulBayan-Volume5.pdf',
    androidStreamUrl: '/__gh_ebook__/AnwarulBayan-Volume5.pdf',
    githubReleaseUrl:
      'https://github.com/Ahmadnedariya786/Noor-connect/releases/download/ebooks-library-v1/AnwarulBayan-Volume5.pdf',
    localKey: 'anwar-ul-bayan-vol-5',
  },
];

/**
 * Retrieve current cloud catalog from localStorage or fallback
 */
export function getLocalCloudCatalog(): CloudEbookItem[] {
  if (typeof localStorage === 'undefined') return FALLBACK_CATALOG;
  try {
    const raw = localStorage.getItem(STORAGE_CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EbooksCatalogManifest;
      if (parsed && Array.isArray(parsed.catalog) && parsed.catalog.length > 0) {
        return parsed.catalog;
      }
    }
  } catch {
    // Fall back to bundled catalog on parse error
  }
  return FALLBACK_CATALOG;
}

/**
 * Sync latest catalog from GitHub in background
 */
export async function syncCloudCatalogFromRemote(): Promise<CloudEbookItem[]> {
  try {
    const response = await fetch(REMOTE_CATALOG_URL, {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
    });
    if (response.ok) {
      const manifest = (await response.json()) as EbooksCatalogManifest;
      if (manifest && Array.isArray(manifest.catalog) && manifest.catalog.length > 0) {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(manifest));
          } catch {
            // Storage quota safe
          }
        }
        return manifest.catalog;
      }
    }
  } catch {
    // Network silent fallback to local catalog
  }
  return getLocalCloudCatalog();
}

/**
 * Find catalog item by volume id
 */
export function getCloudEbookItem(volId: string): CloudEbookItem | undefined {
  const catalog = getLocalCloudCatalog();
  return catalog.find((item) => item.id === volId || item.localKey === volId);
}

// Global Download Progress State & Listeners
const activeDownloads = new Map<string, DownloadProgressState>();
const downloadAbortControllers = new Map<string, AbortController>();
const downloadListeners = new Set<(state: DownloadProgressState) => void>();

export function getDownloadState(volId: string): DownloadProgressState | undefined {
  return activeDownloads.get(volId);
}

export function subscribeDownloadProgress(
  listener: (state: DownloadProgressState) => void
): () => void {
  downloadListeners.add(listener);
  return () => {
    downloadListeners.delete(listener);
  };
}

function notifyDownloadProgress(state: DownloadProgressState): void {
  activeDownloads.set(state.volId, state);
  downloadListeners.forEach((listener) => {
    try {
      listener(state);
    } catch {
      // Listener error safe
    }
  });
}

/**
 * Format bytes to human readable format (MB)
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Cancel an active download
 */
export function cancelCloudEbookDownload(volId: string): void {
  const controller = downloadAbortControllers.get(volId);
  if (controller) {
    try {
      controller.abort();
    } catch {
      // Safe abort
    }
    downloadAbortControllers.delete(volId);
  }
  notifyDownloadProgress({
    volId,
    isDownloading: false,
    percent: 0,
    loadedBytes: 0,
    totalBytes: 0,
    statusText: 'Download cancelled',
  });
}

/**
 * Download a cloud ebook volume with live progress and automatic IndexedDB storage.
 * Prioritizes the native Android interceptor URL (/__gh_ebook__/...) to stream directly from GitHub Releases CDN with zero CORS.
 */
export async function downloadCloudEbook(volId: string): Promise<boolean> {
  const vol = getCloudEbookItem(volId);
  if (!vol) {
    throw new Error(`Volume ${volId} not found in catalog.`);
  }

  // Cancel any existing download for this volume
  cancelCloudEbookDownload(volId);

  const controller = new AbortController();
  downloadAbortControllers.set(volId, controller);

  // Candidate URLs in priority order: Native Android interceptor URL -> Direct GitHub Release URL
  const urlsToTry = [vol.androidStreamUrl, vol.githubReleaseUrl].filter(Boolean);

  let response: Response | null = null;
  let responseError: Error | null = null;

  notifyDownloadProgress({
    volId,
    isDownloading: true,
    percent: 1,
    loadedBytes: 0,
    totalBytes: vol.approxBytes || 160000000,
    statusText: 'Connecting to Noor Connect Cloud CDN...',
  });

  for (let uIdx = 0; uIdx < urlsToTry.length; uIdx++) {
    const candidateUrl = urlsToTry[uIdx];
    try {
      notifyDownloadProgress({
        volId,
        isDownloading: true,
        percent: 2,
        loadedBytes: 0,
        totalBytes: vol.approxBytes || 160000000,
        statusText: uIdx === 0 ? 'Connecting to Cloud CDN Stream...' : 'Connecting to Direct Release CDN...',
      });

      const res = await fetch(candidateUrl, {
        signal: controller.signal,
      });

      if (res.ok && res.body) {
        response = res;
        break;
      }
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return false;
      }
      responseError = err instanceof Error ? err : new Error(String(err));
    }
  }

  if (!response || !response.body) {
    notifyDownloadProgress({
      volId,
      isDownloading: false,
      percent: 0,
      loadedBytes: 0,
      totalBytes: 0,
      statusText: 'Download failed: Could not connect to Cloud CDN',
      error: responseError?.message || 'Could not connect to book servers.',
    });
    downloadAbortControllers.delete(volId);
    return false;
  }

  try {
    const headerLen = parseInt(response.headers.get('content-length') || '0', 10);
    const totalBytes = headerLen > 100000 ? headerLen : (vol.approxBytes || 160000000);

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    let lastPercentReported = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        receivedBytes += value.length;

        const currentPercent = Math.min(
          99,
          Math.max(1, Math.round((receivedBytes / totalBytes) * 100))
        );

        if (currentPercent !== lastPercentReported || receivedBytes % (1024 * 1024 * 2) === 0) {
          lastPercentReported = currentPercent;
          notifyDownloadProgress({
            volId,
            isDownloading: true,
            percent: currentPercent,
            loadedBytes: receivedBytes,
            totalBytes,
            statusText: `Downloading: ${formatBytes(receivedBytes)} / ${formatBytes(totalBytes)} (${currentPercent}%)`,
          });
        }
      }
    }

    if (receivedBytes < 100000) {
      throw new Error(`Incomplete download: received only ${receivedBytes} bytes.`);
    }

    notifyDownloadProgress({
      volId,
      isDownloading: true,
      percent: 99,
      loadedBytes: receivedBytes,
      totalBytes: receivedBytes,
      statusText: 'Saving to offline storage...',
    });

    // Assemble blob and persist directly to IndexedDB
    const blob = new Blob(chunks, { type: 'application/pdf' });
    const filename = `${vol.title}.pdf`;
    await savePdfBlob(vol.localKey, blob, filename);

    // Notify completion
    notifyDownloadProgress({
      volId,
      isDownloading: false,
      percent: 100,
      loadedBytes: receivedBytes,
      totalBytes: receivedBytes,
      statusText: '✓ Download Complete — Ready Offline',
      isCompleted: true,
    });

    downloadAbortControllers.delete(volId);

    // Dispatch global event so UI updates immediately
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('anwar-ul-bayan-linked', { detail: { volId: vol.id } })
        );
      } catch {
        // Safe dispatch
      }
    }

    return true;
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      return false;
    }
    const errMessage = err instanceof Error ? err.message : String(err);
    notifyDownloadProgress({
      volId,
      isDownloading: false,
      percent: 0,
      loadedBytes: 0,
      totalBytes: 0,
      statusText: 'Download failed',
      error: errMessage,
    });
    downloadAbortControllers.delete(volId);
    return false;
  }
}
