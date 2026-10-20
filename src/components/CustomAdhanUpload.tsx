import { useState, useRef, useEffect } from "react";
import { Upload, Play, Pause, Trash2, Check, Music } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { useToast } from "@/hooks/use-toast";
import { getAdhanPreferences, setAdhanForPrayer, type PrayerName, type AdhanPreferences } from "@/lib/adhan-preferences";

const CUSTOM_ADHAN_KEY = 'custom-adhan-audio';
const SELECTED_ADHAN_KEY = 'selected-adhan';

interface CustomAdhan {
  id: string;
  name: string;
  data: string; // base64
  addedAt: number;
}

// ─── Lazy localforage store (typed contract) ──────────────────────────
// We only use 2 methods on the localforage instance — getItem / setItem.
// Declaring this typed interface (instead of `any`) gives us full TS safety
// without needing to install/bundle the entire localforage type declarations
// at edit time.  The actual module is still dynamically imported so the
// IndexedDB connection opens lazily (never on Settings mount).
interface LocalforageAdhanStore {
  getItem<T>(key: string): Promise<T | null>;
  setItem<T>(key: string, value: T): Promise<T>;
}
let _adhanStore: LocalforageAdhanStore | null = null;
async function getAdhanStore(): Promise<LocalforageAdhanStore> {
  if (_adhanStore) return _adhanStore;
  const localforageModule = await import('localforage');
  const localforageInstance = (
    (localforageModule as { default?: LocalforageAdhanStore & { createInstance: (opts: any) => LocalforageAdhanStore } }).default ??
    (localforageModule as unknown as LocalforageAdhanStore & { createInstance: (opts: any) => LocalforageAdhanStore })
  );
  _adhanStore = localforageInstance.createInstance({
    name: 'islamic-companion',
    storeName: 'custom-adhans',
    description: 'User uploaded adhan audio files'
  });
  return _adhanStore;
}

// Export helper function to get custom adhan audio
export const getCustomAdhanUrl = async (id: string): Promise<string | null> => {
  try {
    const adhanStore = await getAdhanStore();
    const adhans = await adhanStore.getItem<CustomAdhan[]>(CUSTOM_ADHAN_KEY);
    const adhan = adhans?.find((a) => a.id === id);
    if (!adhan) return null;

    const binaryString = atob(adhan.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'audio/mp3' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('getCustomAdhanUrl error:', error);
    return null;
  }
};

const PRAYERS: PrayerName[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

export function CustomAdhanUpload() {
  const [customAdhans, setCustomAdhans] = useState<CustomAdhan[]>([]);
  const [isLoadingCustomAdhans, setIsLoadingCustomAdhans] = useState<boolean>(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<AdhanPreferences>(getAdhanPreferences());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Defer IndexedDB loads + setups: 800ms after mount lets the page paint and
    // transition animation completes before we open an IndexedDB connection.
    let t: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      loadCustomAdhans();
      t = null;
    }, 800);

    // Listen for storage changes to keep preferences in sync
    const handleStorageChange = () => {
      setPreferences(getAdhanPreferences());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      if (t !== null) clearTimeout(t);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const loadCustomAdhans = async () => {
    try {
      const adhanStore = await getAdhanStore();
      const saved = await adhanStore.getItem<CustomAdhan[]>(CUSTOM_ADHAN_KEY);
      if (saved) setCustomAdhans(saved);
    } catch (error) {
      console.error("Error loading custom adhans:", error);
    } finally {
      setIsLoadingCustomAdhans(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      toast({ title: "Invalid file", description: "Please select an audio file (MP3, WAV, etc.)", variant: "destructive" });
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please select a file under 10MB", variant: "destructive" });
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const newAdhan: CustomAdhan = {
        id: `custom-${Date.now()}`,
        name: file.name.replace(/\.[^/.]+$/, ""),
        data: base64,
        addedAt: Date.now()
      };

      const updated = [...customAdhans, newAdhan];
      const adhanStore = await getAdhanStore();
      await adhanStore.setItem(CUSTOM_ADHAN_KEY, updated);
      setCustomAdhans(updated);

      toast({ title: "Adhan uploaded", description: `${newAdhan.name} added to your collection` });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload failed", description: "Could not save the audio file", variant: "destructive" });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handlePlay = async (adhan: CustomAdhan) => {
    if (playingId === adhan.id) {
      // Stop
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setPlayingId(null);
    } else {
      // Play
      if (audioRef.current) {
        audioRef.current.pause();
      }

      const url = await getCustomAdhanUrl(adhan.id);
      if (!url) return;

      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(adhan.id);

      // Auto-stop after 15 seconds
      setTimeout(() => {
        if (audioRef.current && playingId === adhan.id) {
          audioRef.current.pause();
          setPlayingId(null);
        }
      }, 15000);
    }
  };

  const handleDelete = async (id: string) => {
    const updated = customAdhans.filter(a => a.id !== id);
    const adhanStore = await getAdhanStore();
    await adhanStore.setItem(CUSTOM_ADHAN_KEY, updated);
    setCustomAdhans(updated);

    // Clear any prayer assignments for this adhan
    let changed = false;
    const newPrefs = { ...preferences };
    PRAYERS.forEach(p => {
      if (newPrefs[p] === id) {
        newPrefs[p] = 'adhan-makkah'; // Reset to default
        setAdhanForPrayer(p, 'adhan-makkah');
        changed = true;
      }
    });

    if (changed) {
      setPreferences(newPrefs);
    }

    toast({ title: "Adhan deleted" });
  };

  const handleAssignToPrayer = (adhanId: string, prayer: PrayerName) => {
    setAdhanForPrayer(prayer, adhanId);
    setPreferences(prev => ({ ...prev, [prayer]: adhanId }));

    toast({
      title: "Adhan assigned",
      description: `Assigned to ${prayer}`
    });

    // Trigger notification reschedule
    window.dispatchEvent(new Event('prayer-method-changed'));
  };

  const isAssignedTo = (adhanId: string, prayer: PrayerName) => {
    return preferences[prayer] === adhanId;
  };

  const getAssignedPrayers = (adhanId: string) => {
    return PRAYERS.filter(p => preferences[p] === adhanId);
  };

  return (
    <Card className="p-4 space-y-4 rounded-2xl bg-[var(--surface)] border-[var(--border)] w-full max-w-full overflow-hidden box-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="w-5 h-5 text-[var(--accent)]" />
          <h3 className="font-bold text-sm text-[var(--text-primary)]">Custom Adhan Library</h3>
        </div>
        <input
          type="file"
          accept="audio/*"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload MP3
        </Button>
      </div>

      {isLoadingCustomAdhans ? (
        <div className="py-6 flex flex-col items-center justify-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <span className="text-[11px] text-[var(--text-secondary)] font-medium">Checking saved adhans...</span>
        </div>
      ) : customAdhans.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)] text-center py-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)]">
          No custom adhans uploaded. Upload your own MP3 file to use as prayer notification.
        </p>
      ) : (
        <div className="space-y-3">
          {customAdhans.map((adhan) => (
            <div
              key={adhan.id}
              className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] space-y-3"
            >
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--accent-text)]"
                  onClick={() => handlePlay(adhan)}
                >
                  {playingId === adhan.id ? (
                    <Pause className="w-4 h-4 text-[var(--accent)]" />
                  ) : (
                    <Play className="w-4 h-4 text-[var(--accent)] ml-0.5" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--text-primary)] truncate">{adhan.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getAssignedPrayers(adhan.id).map(p => (
                      <span key={p} className="px-1.5 py-0.5 bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] text-[10px] font-bold rounded-full uppercase">
                        {p}
                      </span>
                    ))}
                    {getAssignedPrayers(adhan.id).length === 0 && (
                      <span className="text-[11px] text-[var(--text-secondary)] italic">
                        Not assigned to any prayer
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive opacity-60 hover:opacity-100 hover:bg-destructive/10 rounded-xl"
                  onClick={() => handleDelete(adhan.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="pt-2 border-t border-[var(--border)]/70">
                <p className="text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-bold mb-2">Assign to Prayer:</p>
                <div className="flex flex-wrap gap-1.5">
                  {PRAYERS.map(prayer => {
                    const active = isAssignedTo(adhan.id, prayer);
                    return (
                      <button
                        key={prayer}
                        type="button"
                        className={`h-7 text-xs px-2.5 rounded-lg font-semibold flex items-center gap-1 transition-all border ${
                          active
                            ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-[0_0_10px_var(--accent-glow)]'
                            : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-2)]'
                        }`}
                        onClick={() => handleAssignToPrayer(adhan.id, prayer)}
                      >
                        {prayer}
                        {active && <Check className="w-3 h-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--text-secondary)]">
        Assign custom audio to specific prayers. They will automatically play at prayer times.
      </p>
    </Card>
  );
}

// Export helper function for legacy support
export async function getSelectedCustomAdhanUrl(): Promise<string | null> {
  const selectedId = localStorage.getItem('selected-adhan');
  if (!selectedId || !selectedId.startsWith('custom-')) return null;
  return getCustomAdhanUrl(selectedId);
}
