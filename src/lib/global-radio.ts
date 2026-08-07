/**
 * Global Radio State Management
 * Persistent radio playback across app navigation
 */

import { useState, useEffect, useCallback } from 'react';

export interface RadioState {
  isPlaying: boolean;
  currentStation: {
    id: number;
    name: string;
    url: string;
  } | null;
  volume: number;
  isMuted: boolean;
  currentTrackInfo: string;
  sessionStartTime: number | null; // Timestamp when current playback segment started
  accumulatedTime: number; // Total seconds listened before current segment
}

const DEFAULT_RADIO_STATE: RadioState = {
  isPlaying: false,
  currentStation: null,
  volume: 70,
  isMuted: false,
  currentTrackInfo: '',
  sessionStartTime: null,
  accumulatedTime: 0
};

const STORAGE_KEY = 'global-radio-state';

// Load radio state from localStorage
const loadStoredRadioState = (): RadioState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the stored state
      return {
        ...DEFAULT_RADIO_STATE,
        ...parsed,
        isPlaying: false // Always start paused when loading from storage
      };
    }
  } catch {
    // Fall through to return default
  }
  return DEFAULT_RADIO_STATE;
};

// Save radio state to localStorage
const saveRadioState = (state: RadioState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save radio state:', error);
  }
};

// --- Singleton State Implementation ---

// The single source of truth
let globalState: RadioState = loadStoredRadioState();
const listeners = new Set<(state: RadioState) => void>();

// Volume slider drags fire setVolume per pointer move (up to ~60 Hz). Each
// notify re-renders every subscriber (GlobalRadioPlayer + GlobalQuranPlayer
// + GlobalNasheedPlayer + LayoutManager) and writes localStorage, which
// janks mid-drag. Volume is collapsed to one notify per animation frame;
// the state itself updates synchronously so listeners always read the
// latest value. A synchronous notify (play/pause/etc.) cancels any
// pending rAF so we never emit a redundant duplicate.
let pendingVolumeRaf: number | null = null;

const cancelPendingVolumeNotify = () => {
  if (pendingVolumeRaf !== null) {
    cancelAnimationFrame(pendingVolumeRaf);
    pendingVolumeRaf = null;
  }
};

const scheduleVolumeNotify = () => {
  if (pendingVolumeRaf !== null) return;
  pendingVolumeRaf = requestAnimationFrame(() => {
    pendingVolumeRaf = null;
    notifyListeners();
  });
};

const notifyListeners = () => {
  cancelPendingVolumeNotify();
  listeners.forEach(listener => listener(globalState));
  saveRadioState(globalState);
};

// Actions that modify the global state
const actions = {
  updateRadioState: (updates: Partial<RadioState>) => {
    globalState = { ...globalState, ...updates };
    notifyListeners();
  },

  playRadio: (station: { id: number; name: string; url: string }) => {
    const isSameStation = globalState.currentStation?.id === station.id;
    globalState = {
      ...globalState,
      currentStation: station,
      isPlaying: true,
      currentTrackInfo: station.name,
      sessionStartTime: Date.now(),
      // If switching stations, reset accumulated time
      accumulatedTime: isSameStation ? globalState.accumulatedTime : 0
    };
    notifyListeners();
  },

  pauseRadio: () => {
    const additionalTime = globalState.sessionStartTime
      ? Math.floor((Date.now() - globalState.sessionStartTime) / 1000)
      : 0;
    globalState = {
      ...globalState,
      isPlaying: false,
      sessionStartTime: null,
      accumulatedTime: globalState.accumulatedTime + additionalTime
    };
    notifyListeners();
  },

  stopRadio: () => {
    globalState = {
      ...globalState,
      isPlaying: false,
      currentStation: null,
      currentTrackInfo: '',
      sessionStartTime: null,
      accumulatedTime: 0
    };
    notifyListeners();
  },

  setVolume: (volume: number) => {
    globalState = {
      ...globalState,
      volume: Math.max(0, Math.min(100, volume)),
      isMuted: false // Unmute when setting volume
    };
    scheduleVolumeNotify();
  },

  toggleMute: () => {
    globalState = { ...globalState, isMuted: !globalState.isMuted };
    notifyListeners();
  }
};

// Global radio state hook
export const useGlobalRadio = () => {
  const [state, setState] = useState<RadioState>(globalState);

  useEffect(() => {
    const listener = (newState: RadioState) => setState(newState);
    listeners.add(listener);
    // Sync immediately
    setState(globalState);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    ...state,
    updateRadioState: actions.updateRadioState,
    playRadio: actions.playRadio,
    pauseRadio: actions.pauseRadio,
    stopRadio: actions.stopRadio,
    setVolume: actions.setVolume,
    toggleMute: actions.toggleMute
  };
};

// Global radio instance for direct access
let globalAudioRef: HTMLAudioElement | null = null;

export const getGlobalAudioRef = (): HTMLAudioElement | null => {
  return globalAudioRef;
};

export const setGlobalAudioRef = (audio: HTMLAudioElement | null): void => {
  globalAudioRef = audio;
};
