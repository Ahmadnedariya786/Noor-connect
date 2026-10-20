import { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  getAdhanPreferences,
  setAdhanForPrayer,
  ALL_ADHAN_OPTIONS,
  ADHAN_OPTIONS,
  type PrayerName,
  type AdhanPreferences
} from '@/lib/adhan-preferences';
import { adhanService, type AdhanConfig } from '@/lib/adhan-service';

const ADHAN_STORAGE_KEY = 'selected-adhan-id';

export const getSelectedAdhanUrl = (): string => {
  const savedId = localStorage.getItem(ADHAN_STORAGE_KEY);
  const adhan = ADHAN_OPTIONS.find(a => a.id === savedId);
  return adhan?.url || ADHAN_OPTIONS[0].url;
};

// Global audio instance to prevent multiple audio playing
let globalPreviewAudio: HTMLAudioElement | null = null;

export const stopAllAdhanPreviews = () => {
  if (globalPreviewAudio) {
    globalPreviewAudio.pause();
    globalPreviewAudio.currentTime = 0;
    globalPreviewAudio = null;
  }
};

const PRAYERS: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export const AdhanSelector = () => {
  const [preferences, setPreferences] = useState<AdhanPreferences>(getAdhanPreferences);
  const [adhanConfig, setAdhanConfig] = useState<AdhanConfig>(adhanService.getAdhanConfig());
  const [isExpanded, setIsExpanded] = useState(false);
  const [playingPrayer, setPlayingPrayer] = useState<PrayerName | null>(null);
  const [customAdhans, setCustomAdhans] = useState<{ id: string, name: string }[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load custom adhan metadata from IndexedDB/localforage.
    // Defer 600ms so Profile.tsx's initial paint + framer-motion page
    // transition completes before we spin up IndexedDB connections,
    // which otherwise cause a synchronous IDBFactory.open() call on
    // the main thread inside React's commit phase.
    let t: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      void (async () => {
        try {
          const localforage = (await import('localforage')).default;
          const adhanStore = localforage.createInstance({
            name: 'islamic-companion',
            storeName: 'custom-adhans',
            description: 'User uploaded adhan audio files'
          });
          const saved = await adhanStore.getItem<any[]>('custom-adhan-audio');
          if (saved) {
            setCustomAdhans(saved.map(a => ({ id: a.id, name: `Custom: ${a.name}` })));
          }
        } catch (error) {
          console.error("Error loading custom adhan metadata:", error);
        }
      })();
      t = null;
    }, 600);

    // Sync preferences when storage changes or external events fire
    const handleSync = () => {
      setPreferences(getAdhanPreferences());
      setAdhanConfig(adhanService.getAdhanConfig());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('adhan-config-changed' as any, handleSync);

    return () => {
      if (t !== null) clearTimeout(t);
      stopAllAdhanPreviews();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setPlayingPrayer(null);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('adhan-config-changed' as any, handleSync);
    };
  }, []);

  const handleAdhanChange = (prayer: PrayerName, adhanId: string) => {
    setAdhanForPrayer(prayer, adhanId);
    setPreferences(prev => ({ ...prev, [prayer]: adhanId }));

    // Stop any playing preview
    stopAllAdhanPreviews();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setPlayingPrayer(null);

    // Trigger notification reschedule
    window.dispatchEvent(new Event('prayer-method-changed'));
  };

  const handlePreview = async (prayer: PrayerName) => {
    const adhanId = preferences[prayer];

    // If already playing this prayer's adhan, stop it
    if (playingPrayer === prayer) {
      stopAllAdhanPreviews();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setPlayingPrayer(null);
      return;
    }

    // Stop any existing audio first
    stopAllAdhanPreviews();

    const startPlayingUrl = (url: string) => {
      globalPreviewAudio = new Audio(url);
      globalPreviewAudio.volume = 0.5;

      const handleEnded = () => {
        setPlayingPrayer(null);
        globalPreviewAudio = null;
      };

      const handleError = () => {
        setPlayingPrayer(null);
        globalPreviewAudio = null;
      };

      globalPreviewAudio.addEventListener('ended', handleEnded);
      globalPreviewAudio.addEventListener('error', handleError);

      globalPreviewAudio.play().then(() => {
        setPlayingPrayer(prayer);
      }).catch((e) => {
        console.error("Audio playback failed:", e);
        setPlayingPrayer(null);
        globalPreviewAudio = null;
      });
    };

    if (adhanId.startsWith('custom-')) {
      try {
        const { getCustomAdhanUrl } = await import('./CustomAdhanUpload');
        const url = await getCustomAdhanUrl(adhanId);
        if (url) {
          startPlayingUrl(url);
        }
      } catch (err) {
        console.error("Failed to load custom adhan", err);
      }
    } else {
      const adhan = ALL_ADHAN_OPTIONS.find(a => a.id === adhanId);
      if (adhan && adhan.url) {
        startPlayingUrl(adhan.url);
      }
    }
  };

  const combinedOptions = [...ALL_ADHAN_OPTIONS, ...customAdhans];
  const prayerToggleMap: Record<PrayerName, keyof AdhanConfig> = {
    Fajr: 'fajrEnabled',
    Dhuhr: 'dhuhrEnabled',
    Asr: 'asrEnabled',
    Maghrib: 'maghribEnabled',
    Isha: 'ishaEnabled'
  };

  const handleTogglePrayer = (prayer: PrayerName, enabled: boolean) => {
    const key = prayerToggleMap[prayer];
    if (!key) return;
    const updated = { ...adhanConfig, [key]: enabled };
    adhanService.saveAdhanConfig(updated);
    setAdhanConfig(updated);

    // Notify other components (GlobalAlarm, Profile, etc.)
    window.dispatchEvent(new CustomEvent('adhan-config-changed', { detail: updated }));
    
    // Also trigger notification reschedule for background alarms
    window.dispatchEvent(new Event('prayer-method-changed'));
  };

  return (
    <Card
      className="p-4 bg-[var(--surface)] border-[var(--border)] rounded-2xl w-full max-w-full overflow-hidden box-border"
      style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}
    >
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center shrink-0 border border-[var(--border)] text-[var(--accent)]">
            <Volume2 className="w-4 h-4 text-[var(--accent)]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Adhan Sounds</h3>
            <p className="text-xs text-[var(--text-secondary)] truncate">
              Customize adhan for each prayer
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-[var(--text-secondary)]">
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3 w-full max-w-full overflow-hidden box-border">
          {PRAYERS.map((prayer) => {
            const isEnabled = Boolean(adhanConfig[prayerToggleMap[prayer]]);
            return (
              <div
                key={prayer}
                className="w-full box-border rounded-[14px] p-2.5 sm:p-3 flex flex-col gap-2 border transition-all"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border)',
                  width: '100%',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Top Row: Prayer Name + Status Badge (Left), Switch + Play Button (Right) */}
                <div className="flex items-center justify-between gap-2 w-full">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-[var(--text-primary)]">
                      {prayer}
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-semibold border select-none"
                      style={{
                        background: isEnabled ? 'var(--accent-soft)' : 'var(--surface)',
                        borderColor: isEnabled ? 'var(--accent)' : 'var(--border)',
                        color: isEnabled ? 'var(--accent-text)' : 'var(--text-secondary)',
                      }}
                    >
                      {isEnabled ? 'Active' : 'Muted'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleTogglePrayer(prayer, checked)}
                      className="shrink-0"
                    />
                    <button
                      type="button"
                      onClick={() => handlePreview(prayer)}
                      aria-label={`Preview adhan for ${prayer}`}
                      className="w-[34px] h-[34px] rounded-[10px] border flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-sm"
                      style={{
                        borderColor: 'var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--accent-text)',
                      }}
                    >
                      {playingPrayer === prayer ? (
                        <Pause className="w-3.5 h-3.5 text-[var(--accent)]" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-[var(--accent)] ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Bottom Row: Full-Width Contained Sound Selector */}
                <div className="w-full min-w-0 max-w-full overflow-hidden box-border">
                  <Select
                    value={preferences[prayer]}
                    onValueChange={(value) => handleAdhanChange(prayer, value)}
                  >
                    <SelectTrigger
                      className="w-full max-w-full min-w-0 h-9 rounded-xl border text-xs font-medium"
                      style={{
                        background: 'var(--surface)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                        width: '100%',
                        maxWidth: '100%',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      <SelectValue placeholder="Select Adhan" />
                    </SelectTrigger>
                    <SelectContent className="bg-[var(--surface)] border-[var(--border)] z-50 max-h-60 rounded-xl">
                      {combinedOptions.map((adhan) => (
                        <SelectItem key={adhan.id} value={adhan.id} className="text-xs">
                          {adhan.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}

          <p className="text-xs text-[var(--text-secondary)] mt-3 pt-2 border-t border-[var(--border)]">
            💡 Fajr defaults to a special Adhan, but you can assign any sound or custom upload.
          </p>
        </div>
      )}
    </Card>
  );
};
