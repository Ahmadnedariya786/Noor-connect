import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

const GREETING_ENABLED_KEY = 'greetingEnabled';
const LEGACY_GREETING_ENABLED_KEY = 'salam-greeting-enabled';
const GREETING_PLAYED_KEY = 'salam-greeting-played-session';

export const isSalamGreetingEnabled = (): boolean => {
  try {
    const currentValue = localStorage.getItem(GREETING_ENABLED_KEY);
    if (currentValue !== null) return currentValue !== 'false';
    return localStorage.getItem(LEGACY_GREETING_ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const setSalamGreetingEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(GREETING_ENABLED_KEY, enabled ? 'true' : 'false');
    localStorage.removeItem(LEGACY_GREETING_ENABLED_KEY);
  } catch {}
};

interface SalamGreetingProps {
  splashActive?: boolean;
}

export const SalamGreeting = ({ splashActive = false }: SalamGreetingProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);
  const handleInteractionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    try {
      const isEnabled = isSalamGreetingEnabled();
      const sessionKey = sessionStorage.getItem(GREETING_PLAYED_KEY);

      if (!isEnabled || sessionKey || hasPlayedRef.current) {
        return;
      }

      const isNative = Capacitor.isNativePlatform();

      const playGreeting = () => {
        try {
          if (hasPlayedRef.current) return;
          if (sessionStorage.getItem(GREETING_PLAYED_KEY)) return;

          if (!audioRef.current) {
            audioRef.current = new Audio('/audio/salam-greeting.mp3');
            audioRef.current.volume = 0.7;
          }

          hasPlayedRef.current = true;
          sessionStorage.setItem(GREETING_PLAYED_KEY, 'true');

          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn('Greeting audio playback fallback:', error);
            });
          }
        } catch (err) {
          console.warn('Greeting audio error, falling back silently:', err);
        }
      };

      // Native platform: play immediately once splash finishes without gesture
      if (isNative) {
        if (splashActive) return;

        const timer = window.setTimeout(() => {
          playGreeting();
        }, 80);

        return () => {
          window.clearTimeout(timer);
          if (audioRef.current) {
            try {
              audioRef.current.pause();
            } catch {}
            audioRef.current = null;
          }
        };
      }

      // Web platform: gesture-gated
      const handleInteraction = () => {
        playGreeting();
        if (handleInteractionRef.current) {
          document.removeEventListener('click', handleInteraction);
          document.removeEventListener('touchstart', handleInteraction);
          handleInteractionRef.current = null;
        }
      };
      handleInteractionRef.current = handleInteraction;

      document.addEventListener('click', handleInteraction, { once: true, passive: true });
      document.addEventListener('touchstart', handleInteraction, { once: true, passive: true });

      return () => {
        if (handleInteractionRef.current) {
          document.removeEventListener('click', handleInteractionRef.current);
          document.removeEventListener('touchstart', handleInteractionRef.current);
          handleInteractionRef.current = null;
        }
        if (audioRef.current) {
          try {
            audioRef.current.pause();
          } catch {}
          audioRef.current = null;
        }
      };
    } catch (e) {
      console.warn('SalamGreeting initialization error:', e);
    }
  }, [splashActive]);

  return null;
};
