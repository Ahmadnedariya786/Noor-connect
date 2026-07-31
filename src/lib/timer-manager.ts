/**
 * Timer Manager - Consolidates multiple setInterval calls into a single timer
 * 
 * This reduces CPU usage by using a single underlying timer instead of multiple
 * setInterval calls. Each callback can have its own interval, and the manager
 * efficiently schedules them.
 */

type TimerCallback = () => void;

interface TimerEntry {
  callback: TimerCallback;
  interval: number;
  lastRun: number;
  id: string;
}

class TimerManager {
  private callbacks: Map<string, TimerEntry> = new Map();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private tickInterval: number = 1000; // Check every second (smallest common interval)

  /**
   * Add a callback to be executed at a specific interval
   * @param callback - Function to execute
   * @param intervalMs - Interval in milliseconds
   * @param id - Unique identifier for this callback (optional, auto-generated if not provided)
   * @returns The ID of the registered callback
   */
  addCallback(callback: TimerCallback, intervalMs: number, id?: string): string {
    const callbackId = id || `timer-${Date.now()}-${Math.random()}`;
    
    this.callbacks.set(callbackId, {
      callback,
      interval: intervalMs,
      lastRun: 0,
      id: callbackId
    });

    // Start the timer if not already running
    if (!this.intervalId) {
      this.start();
    }

    return callbackId;
  }

  /**
   * Remove a callback by its ID
   * @param id - The ID of the callback to remove
   */
  removeCallback(id: string): void {
    this.callbacks.delete(id);

    // Stop the timer if no callbacks remain
    if (this.callbacks.size === 0 && this.intervalId) {
      this.stop();
    }
  }

  /**
   * Update the interval for an existing callback
   * @param id - The ID of the callback
   * @param newIntervalMs - New interval in milliseconds
   */
  updateInterval(id: string, newIntervalMs: number): void {
    const entry = this.callbacks.get(id);
    if (entry) {
      entry.interval = newIntervalMs;
    }
  }

  /**
   * Remove all callbacks and stop the timer
   */
  clear(): void {
    this.callbacks.clear();
    this.stop();
  }

  /**
   * Get the number of active callbacks
   */
  getCallbackCount(): number {
    return this.callbacks.size;
  }

  private start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      const now = Date.now();

      this.callbacks.forEach((entry) => {
        const timeSinceLastRun = now - entry.lastRun;
        
        // Check if enough time has passed for this callback
        if (timeSinceLastRun >= entry.interval || entry.lastRun === 0) {
          try {
            entry.callback();
          } catch (error) {
            console.error(`[TimerManager] Error in callback ${entry.id}:`, error);
          }
          entry.lastRun = now;
        }
      });
    }, this.tickInterval);
  }

  private stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Global singleton instance for app-wide timer management
const globalTimerManager = new TimerManager();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    globalTimerManager.clear();
  });
}

export { TimerManager, globalTimerManager };
