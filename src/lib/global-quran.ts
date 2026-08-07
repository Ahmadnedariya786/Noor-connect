import { useState, useEffect } from 'react';

export interface Reciter {
    id: string;
    name: string;
    server: string;
    surahList: number[];
}

export interface QuranState {
    isPlaying: boolean;
    surahNumber: number | null;
    surahName: string;
    reciter: Reciter | null;
    volume: number;
    isMuted: boolean;
    progress: number;
    duration: number;
    isBackgroundMode: boolean; // Just for UI toggle state
}

const DEFAULT_QURAN_STATE: QuranState = {
    isPlaying: false,
    surahNumber: null,
    surahName: '',
    reciter: null,
    volume: 80,
    isMuted: false,
    progress: 0,
    duration: 0,
    isBackgroundMode: false
};

const STORAGE_KEY = 'global-quran-state';

// Load state from localStorage
const loadStoredState = (): QuranState => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_QURAN_STATE,
                ...parsed,
                isPlaying: false // Always start paused
            };
        }
    } catch {
        // ignore
    }
    return DEFAULT_QURAN_STATE;
};

const saveState = (state: QuranState) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.error('Failed to save quran state', e);
    }
};

// Singleton State
let globalState: QuranState = loadStoredState();
const listeners = new Set<(state: QuranState) => void>();

const notifyListeners = () => {
    listeners.forEach(listener => listener(globalState));
    saveState(globalState);
};

// Actions
export const quranActions = {
    updateState: (updates: Partial<QuranState>) => {
        globalState = { ...globalState, ...updates };
        notifyListeners();
    },

    playSurah: (surahNumber: number, surahName: string, reciter: Reciter) => {
        const isSameSurah = globalState.surahNumber === surahNumber && globalState.reciter?.id === reciter.id;

        globalState = {
            ...globalState,
            surahNumber,
            surahName,
            reciter,
            isPlaying: true, // Start playing
            progress: isSameSurah ? globalState.progress : 0
        };
        notifyListeners();
    },

    pause: () => {
        globalState = { ...globalState, isPlaying: false };
        notifyListeners();
    },

    resume: () => {
        globalState = { ...globalState, isPlaying: true };
        notifyListeners();
    },

    setVolume: (volume: number) => {
        globalState = { ...globalState, volume };
        notifyListeners();
    },

    setProgress: (progress: number) => {
        // Guard: skip sub-tick updates. timeupdate fires ~4×/sec while playing;
        // notifying every listener + writing localStorage at that rate re-renders
        // every useGlobalQuran consumer (including the Nasheed player and mood
        // selectors) and churns GC. Callers are expected to throttle to ~1Hz;
        // this threshold is a safety net for any unthrottled producer.
        if (Math.abs(progress - globalState.progress) < 0.25) return;
        globalState = { ...globalState, progress };
        notifyListeners();
    },

    setDuration: (duration: number) => {
        if (duration === globalState.duration) return;
        globalState = { ...globalState, duration };
        notifyListeners();
    }
};

// Hook
export const useGlobalQuran = () => {
    const [state, setState] = useState<QuranState>(globalState);

    useEffect(() => {
        const listener = (newState: QuranState) => setState(newState);
        listeners.add(listener);
        setState(globalState);
        return () => {
            listeners.delete(listener);
        };
    }, []);

    return {
        ...state,
        ...quranActions
    };
};

// Direct Audio Ref Access
let globalAudioRef: HTMLAudioElement | null = null;
export const getGlobalQuranAudioRef = () => globalAudioRef;
export const setGlobalQuranAudioRef = (ref: HTMLAudioElement | null) => { globalAudioRef = ref; };
