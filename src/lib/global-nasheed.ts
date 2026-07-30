import { useState, useEffect } from 'react';

export interface NasheedTrack {
    id: string;
    title: string;
    artist: string;
    category: string;
    url: string;
}

export type RepeatMode = 'none' | 'one' | 'all';

export interface NasheedState {
    isPlaying: boolean;
    currentTrack: NasheedTrack | null;
    volume: number;
    progress: number;
    duration: number;
    // Queue management
    queue: NasheedTrack[];
    currentIndex: number;
    isShuffled: boolean;
    repeatMode: RepeatMode;
    // Favorites & History
    favorites: string[]; // track IDs
    recentlyPlayed: string[]; // track IDs (most recent first, capped at 30)
}

const DEFAULT_NASHEED_STATE: NasheedState = {
    isPlaying: false,
    currentTrack: null,
    volume: 80,
    progress: 0,
    duration: 0,
    queue: [],
    currentIndex: -1,
    isShuffled: false,
    repeatMode: 'none',
    favorites: [],
    recentlyPlayed: [],
};

const STORAGE_KEY = 'global-nasheed-state-v2';

const loadStoredState = (): NasheedState => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return {
                ...DEFAULT_NASHEED_STATE,
                ...parsed,
                isPlaying: false, // Always start paused
                progress: 0,
                duration: 0,
                // Don't restore the queue — it'll be rebuilt when user taps play
                queue: [],
                currentIndex: -1,
            };
        }
    } catch {
        // ignore
    }
    return DEFAULT_NASHEED_STATE;
};

const saveState = (state: NasheedState) => {
    try {
        // Only persist preferences, not playback position
        const toSave = {
            volume: state.volume,
            isShuffled: state.isShuffled,
            repeatMode: state.repeatMode,
            favorites: state.favorites,
            recentlyPlayed: state.recentlyPlayed,
            currentTrack: state.currentTrack, // remember last track
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.error('Failed to save nasheed state', e);
    }
};

// Shuffle an array (Fisher-Yates) while keeping currentIndex at 0
const shuffleArray = <T>(arr: T[], pinnedIndex: number): { shuffled: T[]; newPinnedIndex: number } => {
    const result = [...arr];
    const pinned = result.splice(pinnedIndex, 1)[0];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    result.unshift(pinned);
    return { shuffled: result, newPinnedIndex: 0 };
};

// Singleton State
let globalState: NasheedState = loadStoredState();
const listeners = new Set<(state: NasheedState) => void>();

const notifyListeners = () => {
    listeners.forEach(listener => listener({ ...globalState }));
    saveState(globalState);
};

// ── Actions ──────────────────────────────────────────────────────────────────
export const nasheedActions = {
    updateState: (updates: Partial<NasheedState>) => {
        globalState = { ...globalState, ...updates };
        notifyListeners();
    },

    /** 
     * Play a specific track. Optionally pass the full list (queue) it belongs to
     * so we can navigate next/prev without losing context.
     */
    playTrack: (track: NasheedTrack, queue?: NasheedTrack[]) => {
        let newQueue = queue && queue.length > 0 ? queue : globalState.queue;
        let newIndex = newQueue.findIndex(t => t.id === track.id);

        // If track not in queue (e.g. played from a different filtered list), just play it solo
        if (newIndex === -1) {
            newQueue = [track];
            newIndex = 0;
        }

        // Apply shuffle if enabled
        if (globalState.isShuffled && newIndex !== -1) {
            const { shuffled, newPinnedIndex } = shuffleArray(newQueue, newIndex);
            newQueue = shuffled;
            newIndex = newPinnedIndex;
        }

        // Update recently played
        const recentlyPlayed = [
            track.id,
            ...globalState.recentlyPlayed.filter(id => id !== track.id)
        ].slice(0, 30);

        globalState = {
            ...globalState,
            currentTrack: track,
            isPlaying: true,
            progress: 0,
            queue: newQueue,
            currentIndex: newIndex,
            recentlyPlayed,
        };
        notifyListeners();
    },

    pause: () => {
        globalState = { ...globalState, isPlaying: false };
        notifyListeners();
    },

    resume: () => {
        if (!globalState.currentTrack) return;
        globalState = { ...globalState, isPlaying: true };
        notifyListeners();
    },

    nextTrack: () => {
        const { queue, currentIndex, repeatMode } = globalState;
        if (queue.length === 0) return;

        if (repeatMode === 'one') {
            // Signal audio to restart by toggling a flag
            globalState = { ...globalState, progress: 0, isPlaying: true };
            notifyListeners();
            return;
        }

        const nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
            if (repeatMode === 'all') {
                // Wrap around
                nasheedActions.playTrack(queue[0], queue);
            } else {
                // Stop at end
                globalState = { ...globalState, isPlaying: false, progress: 0, currentIndex: 0 };
                notifyListeners();
            }
            return;
        }

        const nextTrack = queue[nextIndex];
        const recentlyPlayed = [
            nextTrack.id,
            ...globalState.recentlyPlayed.filter(id => id !== nextTrack.id)
        ].slice(0, 30);

        globalState = {
            ...globalState,
            currentTrack: nextTrack,
            currentIndex: nextIndex,
            isPlaying: true,
            progress: 0,
            recentlyPlayed,
        };
        notifyListeners();
    },

    prevTrack: () => {
        const { queue, currentIndex, progress } = globalState;
        if (queue.length === 0) return;

        // If more than 3 seconds in, restart current track instead
        if (progress > 3) {
            globalState = { ...globalState, progress: 0 };
            notifyListeners();
            return;
        }

        const prevIndex = Math.max(0, currentIndex - 1);
        const prevTrack = queue[prevIndex];

        const recentlyPlayed = [
            prevTrack.id,
            ...globalState.recentlyPlayed.filter(id => id !== prevTrack.id)
        ].slice(0, 30);

        globalState = {
            ...globalState,
            currentTrack: prevTrack,
            currentIndex: prevIndex,
            isPlaying: true,
            progress: 0,
            recentlyPlayed,
        };
        notifyListeners();
    },

    toggleShuffle: () => {
        const newShuffled = !globalState.isShuffled;
        const { queue, currentIndex } = globalState;

        if (newShuffled && queue.length > 0) {
            const { shuffled, newPinnedIndex } = shuffleArray(queue, currentIndex);
            globalState = { ...globalState, isShuffled: true, queue: shuffled, currentIndex: newPinnedIndex };
        } else {
            globalState = { ...globalState, isShuffled: false };
        }
        notifyListeners();
    },

    cycleRepeat: () => {
        const modes: RepeatMode[] = ['none', 'all', 'one'];
        const currentIdx = modes.indexOf(globalState.repeatMode);
        const nextMode = modes[(currentIdx + 1) % modes.length];
        globalState = { ...globalState, repeatMode: nextMode };
        notifyListeners();
    },

    toggleFavorite: (trackId: string) => {
        const isFav = globalState.favorites.includes(trackId);
        const favorites = isFav
            ? globalState.favorites.filter(id => id !== trackId)
            : [trackId, ...globalState.favorites];
        globalState = { ...globalState, favorites };
        notifyListeners();
    },

    setVolume: (volume: number) => {
        globalState = { ...globalState, volume };
        notifyListeners();
    },

    setProgress: (progress: number) => {
        globalState = { ...globalState, progress };
        notifyListeners();
    },

    setDuration: (duration: number) => {
        globalState = { ...globalState, duration };
        notifyListeners();
    },
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useGlobalNasheed = () => {
    const [state, setState] = useState<NasheedState>(globalState);

    useEffect(() => {
        const listener = (newState: NasheedState) => setState(newState);
        listeners.add(listener);
        setState({ ...globalState });
        return () => {
            listeners.delete(listener);
        };
    }, []);

    return {
        ...state,
        ...nasheedActions,
    };
};

// ── Audio Ref Access ──────────────────────────────────────────────────────────
let globalAudioRef: HTMLAudioElement | null = null;
export const getGlobalNasheedAudioRef = () => globalAudioRef;
export const setGlobalNasheedAudioRef = (ref: HTMLAudioElement | null) => { globalAudioRef = ref; };
