import { useState, useEffect, useCallback } from 'react';
import { type ClockStyleId, CLOCK_STYLES } from '@/types/clock';

const STORAGE_KEY = 'noor_clock_style';
export const CLOCK_STYLE_CHANGED_EVENT = 'noor-clock-style-changed';
export const DEFAULT_CLOCK_STYLE: ClockStyleId = 'digital-bold';

const VALID_STYLE_IDS = new Set<string>(CLOCK_STYLES.map(s => s.id));

export function getClockStyle(): ClockStyleId {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val && VALID_STYLE_IDS.has(val)) {
      return val as ClockStyleId;
    }
  } catch {
    // Return default on storage read error
  }
  return DEFAULT_CLOCK_STYLE;
}

export function setClockStyle(style: ClockStyleId): void {
  try {
    const validStyle = VALID_STYLE_IDS.has(style) ? style : DEFAULT_CLOCK_STYLE;
    localStorage.setItem(STORAGE_KEY, validStyle);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CLOCK_STYLE_CHANGED_EVENT, { detail: validStyle }));
    }
  } catch {
    // Silently continue on storage write error
  }
}

export function useClockStyle(): {
  clockStyle: ClockStyleId;
  setClockStyle: (style: ClockStyleId) => void;
} {
  const [style, setStyleState] = useState<ClockStyleId>(getClockStyle);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const custom = e as CustomEvent<ClockStyleId>;
      if (custom.detail && VALID_STYLE_IDS.has(custom.detail)) {
        setStyleState(custom.detail);
      } else {
        setStyleState(getClockStyle());
      }
    };

    window.addEventListener(CLOCK_STYLE_CHANGED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(CLOCK_STYLE_CHANGED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const updateStyle = useCallback((newStyle: ClockStyleId) => {
    setClockStyle(newStyle);
    setStyleState(newStyle);
  }, []);

  return { clockStyle: style, setClockStyle: updateStyle };
}
