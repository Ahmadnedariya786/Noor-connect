/**
 * Noor Connect - In-App OTA Update Engine
 *
 * Implements:
 * 1. Dual-Engine native update handoff (Engine A: direct stream, Engine B: system DownloadManager)
 * 2. 250ms active polling of native getOtaStatusJson() with push event synchronization
 * 3. 50-event in-memory ring buffer persisted to localStorage ('noor_ota_log_v1')
 * 4. Error code management and terminal state interval cleanup
 */

export type OtaPhase = 'check' | 'connect' | 'firstByte' | 'stream' | 'verify' | 'install';

export type OtaState =
  | 'idle'
  | 'connecting'
  | 'downloading'
  | 'verifying'
  | 'installing'
  | 'permission_required'
  | 'cancelled'
  | 'error';

export type OtaEngine = 'stream' | 'system' | 'none';

export interface OtaEvent {
  timestamp: string; // ISO 8601
  phase: OtaPhase;
  state: OtaState;
  httpCode?: number;
  bytes?: number;
  errorCode?: string;
  engine?: OtaEngine;
  message?: string;
}

export interface OtaStatus {
  state: OtaState;
  engine: OtaEngine;
  downloadedBytes: number;
  totalBytes: number;
  percent: number;
  speedMBps: number;
  error: string;
  downloadedMB: number;
  totalMB: number;
  message?: string;
}

export const OTA_LOG_STORAGE_KEY = 'noor_ota_log_v1';
const MAX_LOG_EVENTS = 50;
const POLL_INTERVAL_MS = 250;

// In-memory ring buffer
let otaEventBuffer: OtaEvent[] = [];

// Initialize buffer from localStorage safely
function initEventBuffer(): void {
  try {
    const raw = localStorage.getItem(OTA_LOG_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        otaEventBuffer = parsed.slice(-MAX_LOG_EVENTS);
        return;
      }
    }
  } catch {
    // Handled localStorage read fallback
  }
  otaEventBuffer = [];
}

initEventBuffer();

/**
 * Log an OTA event into the 50-item ring buffer and persist to localStorage
 */
export function logOtaEvent(
  phase: OtaPhase,
  state: OtaState,
  details?: Partial<OtaEvent>
): OtaEvent {
  const event: OtaEvent = {
    timestamp: new Date().toISOString(),
    phase,
    state,
    ...details,
  };

  otaEventBuffer.push(event);
  if (otaEventBuffer.length > MAX_LOG_EVENTS) {
    otaEventBuffer = otaEventBuffer.slice(-MAX_LOG_EVENTS);
  }

  try {
    localStorage.setItem(OTA_LOG_STORAGE_KEY, JSON.stringify(otaEventBuffer));
  } catch {
    // Handled localStorage write fallback
  }

  // Also dispatch a DOM event so diagnostics or listeners can react
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('noor-ota-event-logged', { detail: event }));
    } catch {
      // Handled window dispatch fallback
    }
  }

  return event;
}

/**
 * Get read-only tail of the last N OTA events (default up to 50)
 */
export function getOtaLogTail(count = 50): OtaEvent[] {
  return [...otaEventBuffer].slice(-count);
}

/**
 * Clear OTA event logs (for diagnostics reset)
 */
export function clearOtaLogs(): void {
  otaEventBuffer = [];
  try {
    localStorage.removeItem(OTA_LOG_STORAGE_KEY);
  } catch {
    // Handled localStorage remove fallback
  }
}

// Global active status cache
let currentOtaStatus: OtaStatus = {
  state: 'idle',
  engine: 'none',
  downloadedBytes: 0,
  totalBytes: 0,
  percent: 0,
  speedMBps: 0,
  error: '',
  downloadedMB: 0,
  totalMB: 0,
};

let pollingInterval: number | null = null;
let consecutivePollFailures = 0;
let hasLoggedFirstByte = false;
let lastLoggedStreamMB = 0;

type OtaStatusListener = (status: OtaStatus) => void;
const listeners = new Set<OtaStatusListener>();

export function subscribeOtaStatus(listener: OtaStatusListener): () => void {
  listeners.add(listener);
  listener(currentOtaStatus);
  return () => {
    listeners.delete(listener);
  };
}

function broadcastStatus(status: OtaStatus): void {
  currentOtaStatus = status;
  listeners.forEach((fn) => {
    try {
      fn(status);
    } catch {
      // Handled subscriber error safely
    }
  });

  // Also dispatch window custom event for backwards compatibility
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent('apkDownloadProgress', { detail: status }));
    } catch {
      // Handled event dispatch fallback
    }
  }
}

/**
 * Stops the 250ms polling interval cleanly
 */
export function stopOtaPolling(): void {
  if (pollingInterval !== null) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  consecutivePollFailures = 0;
}

/**
 * Query native bridge getOtaStatusJson() synchronously
 */
export function pollNativeOtaStatus(): OtaStatus | null {
  if (typeof window === 'undefined' || !window.AndroidBridge?.getOtaStatusJson) {
    return null;
  }

  try {
    const raw = window.AndroidBridge.getOtaStatusJson();
    if (!raw || typeof raw !== 'string') {
      return null;
    }
    const data = JSON.parse(raw);
    const downloadedBytes = Number(data.downloadedBytes || 0);
    const totalBytes = Number(data.totalBytes || 0);
    const downloadedMB = Math.round((downloadedBytes / (1024 * 1024)) * 10) / 10;
    const totalMB = totalBytes > 0 ? Math.round((totalBytes / (1024 * 1024)) * 10) / 10 : 0;

    const status: OtaStatus = {
      state: data.state || 'idle',
      engine: data.engine || 'stream',
      downloadedBytes,
      totalBytes,
      percent: Number(data.percent || 0),
      speedMBps: Number(data.speedMBps || 0),
      error: data.error || '',
      downloadedMB,
      totalMB,
      message: data.error || undefined,
    };
    return status;
  } catch (err) {
    console.warn('[OtaUpdater] Failed to parse native OTA status JSON:', err);
    return null;
  }
}

/**
 * Process a status update from either polling or native push event
 */
export function handleOtaStatusUpdate(status: OtaStatus): void {
  // Watch for first byte phase
  if (!hasLoggedFirstByte && status.downloadedBytes > 0 && (status.state === 'downloading' || status.state === 'connecting')) {
    hasLoggedFirstByte = true;
    logOtaEvent('firstByte', status.state, {
      bytes: status.downloadedBytes,
      engine: status.engine,
    });
  }

  // Log stream progress every 10 MB or on transition
  if (status.state === 'downloading' && status.downloadedMB - lastLoggedStreamMB >= 10) {
    lastLoggedStreamMB = status.downloadedMB;
    logOtaEvent('stream', status.state, {
      bytes: status.downloadedBytes,
      engine: status.engine,
      message: `${status.downloadedMB} / ${status.totalMB} MB @ ${status.speedMBps} MB/s`,
    });
  }

  // Log verifying phase
  if (status.state === 'verifying' && currentOtaStatus.state !== 'verifying') {
    logOtaEvent('verify', status.state, {
      bytes: status.downloadedBytes,
      engine: status.engine,
    });
  }

  // Log installing phase
  if (status.state === 'installing' && currentOtaStatus.state !== 'installing') {
    logOtaEvent('install', status.state, {
      bytes: status.downloadedBytes,
      engine: status.engine,
    });
  }

  // Log error phase
  if (status.state === 'error' && currentOtaStatus.state !== 'error') {
    logOtaEvent('stream', status.state, {
      errorCode: status.error || 'E_UNKNOWN',
      engine: status.engine,
      message: status.error,
    });
  }

  // Log cancelled phase
  if (status.state === 'cancelled' && currentOtaStatus.state !== 'cancelled') {
    logOtaEvent('stream', status.state, {
      engine: status.engine,
      message: 'Download paused by user',
    });
  }

  broadcastStatus(status);

  // Stop polling on terminal states
  if (
    status.state === 'installing' ||
    status.state === 'cancelled' ||
    status.state === 'error'
  ) {
    stopOtaPolling();
  }
}

/**
 * Start the single 250ms polling loop
 */
function startOtaPolling(): void {
  stopOtaPolling();
  consecutivePollFailures = 0;

  pollingInterval = window.setInterval(() => {
    const status = pollNativeOtaStatus();
    if (!status) {
      consecutivePollFailures++;
      if (consecutivePollFailures >= 2) {
        stopOtaPolling();
        const errStatus: OtaStatus = {
          state: 'error',
          engine: 'none',
          downloadedBytes: 0,
          totalBytes: 0,
          percent: 0,
          speedMBps: 0,
          error: 'E_BRIDGE',
          downloadedMB: 0,
          totalMB: 0,
          message: 'Android native bridge communication failed',
        };
        logOtaEvent('connect', 'error', {
          errorCode: 'E_BRIDGE',
          message: 'Polling getOtaStatusJson returned empty/null twice',
        });
        broadcastStatus(errStatus);
      }
      return;
    }

    consecutivePollFailures = 0;
    handleOtaStatusUpdate(status);
  }, POLL_INTERVAL_MS);
}

/**
 * Instantly triggers native OTA download without any blocking JS fetch
 */
export function startOtaDownload(apkUrl: string, expectedBytes = 0): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  hasLoggedFirstByte = false;
  lastLoggedStreamMB = 0;

  logOtaEvent('connect', 'connecting', {
    bytes: expectedBytes,
    message: `Initiating download: ${apkUrl.slice(-30)}`,
  });

  const bridge = window.AndroidBridge;

  if (bridge?.startUpdateDownload) {
    bridge.startUpdateDownload(apkUrl, expectedBytes);
  } else if (bridge?.downloadAndInstallApk) {
    bridge.downloadAndInstallApk(apkUrl);
  } else {
    // Missing native bridge
    logOtaEvent('connect', 'error', {
      errorCode: 'E_BRIDGE',
      message: 'AndroidBridge download method is not available',
    });
    broadcastStatus({
      state: 'error',
      engine: 'none',
      downloadedBytes: 0,
      totalBytes: expectedBytes,
      percent: 0,
      speedMBps: 0,
      error: 'E_BRIDGE',
      downloadedMB: 0,
      totalMB: expectedBytes > 0 ? Math.round((expectedBytes / (1024 * 1024)) * 10) / 10 : 0,
      message: 'AndroidBridge unavailable',
    });
    return false;
  }

  // Set initial connecting state immediately so UI updates on frame 1
  broadcastStatus({
    state: 'connecting',
    engine: 'stream',
    downloadedBytes: 0,
    totalBytes: expectedBytes,
    percent: 0,
    speedMBps: 0,
    error: '',
    downloadedMB: 0,
    totalMB: expectedBytes > 0 ? Math.round((expectedBytes / (1024 * 1024)) * 10) / 10 : 0,
  });

  // Start polling
  startOtaPolling();
  return true;
}

/**
 * Real user cancellation only
 */
export function cancelOtaDownload(): void {
  stopOtaPolling();
  try {
    window.AndroidBridge?.cancelApkDownload?.();
  } catch {
    // Handled native cancel call fallback
  }

  logOtaEvent('stream', 'cancelled', {
    message: 'User tapped cancel/pause',
  });

  broadcastStatus({
    state: 'cancelled',
    engine: currentOtaStatus.engine,
    downloadedBytes: 0,
    totalBytes: 0,
    percent: 0,
    speedMBps: 0,
    error: '',
    downloadedMB: 0,
    totalMB: 0,
    message: 'Download paused',
  });
}

/**
 * Re-trigger installer intent for ready APK
 */
export function installReadyApk(): void {
  logOtaEvent('install', 'installing', {
    message: 'User requested package installer launch',
  });

  try {
    if (window.AndroidBridge?.installReadyApk) {
      window.AndroidBridge.installReadyApk();
    } else if (window.AndroidBridge?.installDownloadedApk) {
      window.AndroidBridge.installDownloadedApk();
    }
  } catch {
    // Handled native installReadyApk call fallback
  }
}

/**
 * Listen for native push events as a complement to active polling
 */
if (typeof window !== 'undefined') {
  window.addEventListener('apkDownloadProgress', ((e: CustomEvent<Partial<OtaStatus>>) => {
    if (e?.detail) {
      const d = e.detail;
      const rawState = (d.state || (d as { status?: string }).status || 'downloading') as OtaState;
      const downloadedBytes = Number(d.downloadedBytes || (d.downloadedMB ? Math.round(d.downloadedMB * 1024 * 1024) : 0));
      const totalBytes = Number(d.totalBytes || (d.totalMB ? Math.round(d.totalMB * 1024 * 1024) : 0));
      const downloadedMB = d.downloadedMB ?? (downloadedBytes > 0 ? Math.round((downloadedBytes / (1024 * 1024)) * 10) / 10 : 0);
      const totalMB = d.totalMB ?? (totalBytes > 0 ? Math.round((totalBytes / (1024 * 1024)) * 10) / 10 : 0);

      const status: OtaStatus = {
        state: rawState,
        engine: d.engine || 'stream',
        downloadedBytes,
        totalBytes,
        percent: Number(d.percent || 0),
        speedMBps: Number(d.speedMBps || 0),
        error: d.error || (d as { message?: string }).message || '',
        downloadedMB,
        totalMB,
        message: d.message || d.error,
      };

      handleOtaStatusUpdate(status);
    }
  }) as EventListener);
}
