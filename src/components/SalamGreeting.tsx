import { useEffect, useRef } from 'react';

const GREETING_ENABLED_KEY = 'greetingEnabled';
const LEGACY_GREETING_ENABLED_KEY = 'salam-greeting-enabled';
const GREETING_PLAYED_KEY = 'salam-greeting-played-session';

export const isSalamGreetingEnabled = (): boolean => {
  const currentValue = localStorage.getItem(GREETING_ENABLED_KEY);
  if (currentValue !== null) return currentValue !== 'false';
  return localStorage.getItem(LEGACY_GREETING_ENABLED_KEY) !== 'false';
};

export const setSalamGreetingEnabled = (enabled: boolean): void => {
  localStorage.setItem(GREETING_ENABLED_KEY, enabled ? 'true' : 'false');
  localStorage.removeItem(LEGACY_GREETING_ENABLED_KEY);
};

export const SalamGreeting = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayedRef = useRef(false);
  const handleInteractionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const isEnabled = isSalamGreetingEnabled();
    const sessionKey = sessionStorage.getItem(GREETING_PLAYED_KEY);

    if (!isEnabled || sessionKey || hasPlayedRef.current) {
      return;
    }

    const playGreeting = () => {
      if (hasPlayedRef.current) return;

      //
      // Construct audio ONLY inside the user-gesture callback.  `new Audio()`
      // warms up the WebView's media engine (on Android AAudio / OpenSL
      // initialization is cross-thread and blocks the JS bridge for 25–60ms)
      // — deferring it avoids stealing a frame from the splash-to-dashboard
      // animation, which was previously observed as a 92-frame jank bump on
      // the splash screen.
      //
      // Additionally, creating HTMLAudioElement from a click/touchstart
      // listener means the browser already has a user activation token and
      // will 100% allow playback, so we don't need a separate probe (the
      // probe itself allocated yet another media engine channel, which
      // itself caused jank).
      //
      if (!audioRef.current) {
        audioRef.current = new Audio('/audio/salam-greeting.mp3');
        audioRef.current.volume = 0.7;
        audioRef.current.preload = 'none';
      }

      hasPlayedRef.current = true;
      sessionStorage.setItem(GREETING_PLAYED_KEY, 'true');

      audioRef.current.play().catch((error) => {
        console.log('Greeting autoplay blocked:', error);
      });
    };

    const handleInteraction = () => {
      playGreeting();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      handleInteractionRef.current = null;
    };
    handleInteractionRef.current = handleInteraction;

    // Passive listeners so the browser's tap-scrolling path is never blocked.
    document.addEventListener('click', handleInteraction, { once: true, passive: true });
    document.addEventListener('touchstart', handleInteraction, { once: true, passive: true });

    return () => {
      if (handleInteractionRef.current) {
        document.removeEventListener('click', handleInteractionRef.current);
        document.removeEventListener('touchstart', handleInteractionRef.current);
        handleInteractionRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return null;
};
