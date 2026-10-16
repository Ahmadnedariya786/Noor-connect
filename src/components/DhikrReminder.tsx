import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Clock, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showNotification, isNotificationsEnabled, requestNotificationPermission } from "@/lib/notifications";

interface Dhikr {
  arabic: string;
  transliteration: string;
  translation: string;
  virtue?: string;
}

const dhikrCollection: Dhikr[] = [
  { arabic: "سُبْحَانَ اللَّهِ", transliteration: "SubhanAllah", translation: "Glory be to Allah", virtue: "A tree is planted in Paradise for each recitation" },
  { arabic: "الْحَمْدُ لِلَّهِ", transliteration: "Alhamdulillah", translation: "All praise is due to Allah", virtue: "Fills the scales on the Day of Judgment" },
  { arabic: "اللَّهُ أَكْبَرُ", transliteration: "Allahu Akbar", translation: "Allah is the Greatest", virtue: "The most beloved words to Allah" },
  { arabic: "لَا إِلَهَ إِلَّا اللَّهُ", transliteration: "La ilaha illAllah", translation: "There is no god but Allah", virtue: "The best dhikr" },
  { arabic: "أَسْتَغْفِرُ اللَّهَ", transliteration: "Astaghfirullah", translation: "I seek forgiveness from Allah", virtue: "Removes worries and provides sustenance" },
  { arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", transliteration: "La hawla wa la quwwata illa billah", translation: "There is no power nor might except with Allah", virtue: "A treasure from Paradise" },
  { arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", transliteration: "SubhanAllahi wa bihamdihi", translation: "Glory be to Allah and His is the praise", virtue: "Sins fall away like leaves from a tree" },
  { arabic: "سُبْحَانَ اللَّهِ الْعَظِيمِ", transliteration: "SubhanAllahil Adheem", translation: "Glory be to Allah, the Magnificent", virtue: "Light on the tongue, heavy on the scales" },
];

const DHIKR_REMINDER_KEY = 'dhikr-reminder-settings';
const CURRENT_DHIKR_KEY = 'current-dhikr-index';

export function DhikrReminder() {
  const [enabled, setEnabled] = useState(false);
  const [interval, setInterval] = useState('60'); // minutes
  const [currentDhikr, setCurrentDhikr] = useState<Dhikr>(dhikrCollection[0]);

  useEffect(() => {
    // Load settings
    const saved = localStorage.getItem(DHIKR_REMINDER_KEY);
    if (saved) {
      const settings = JSON.parse(saved);
      setEnabled(settings.enabled);
      setInterval(settings.interval);
    }
    
    // Load current dhikr
    const savedIndex = parseInt(localStorage.getItem(CURRENT_DHIKR_KEY) || '0');
    setCurrentDhikr(dhikrCollection[savedIndex % dhikrCollection.length]);
  }, []);

  useEffect(() => {
    localStorage.setItem(DHIKR_REMINDER_KEY, JSON.stringify({ enabled, interval }));
    
    if (enabled) {
      const timer = window.setInterval(() => {
        const randomIndex = Math.floor(Math.random() * dhikrCollection.length);
        const dhikr = dhikrCollection[randomIndex];
        localStorage.setItem(CURRENT_DHIKR_KEY, randomIndex.toString());
        setCurrentDhikr(dhikr);
        
        if (isNotificationsEnabled()) {
          showNotification("Dhikr Reminder", {
            body: `${dhikr.transliteration}: "${dhikr.translation}"`,
            tag: 'dhikr-reminder',
          });
        }
      }, parseInt(interval) * 60 * 1000);
      
      return () => clearInterval(timer);
    }
  }, [enabled, interval]);

  const toggleReminder = async () => {
    if (!enabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        setEnabled(true);
      }
    } else {
      setEnabled(false);
    }
  };

  const refreshDhikr = () => {
    const randomIndex = Math.floor(Math.random() * dhikrCollection.length);
    localStorage.setItem(CURRENT_DHIKR_KEY, randomIndex.toString());
    setCurrentDhikr(dhikrCollection[randomIndex]);
  };

  return (
    <Card className="relative overflow-hidden bg-[var(--surface)] border border-[var(--border)] shadow-md">
      {/* Decorative top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent" />
      <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--accent)]/10 rounded-full blur-[20px] pointer-events-none" />
      
      <CardContent className="p-4 space-y-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--accent-soft)]">
              <Bell className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--text-primary)]">Dhikr Reminder</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl hover:bg-[var(--accent-soft)]"
              onClick={refreshDhikr}
            >
              <RefreshCw className="w-4 h-4 text-[var(--text-secondary)]" />
            </Button>
            <Button
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={toggleReminder}
              className={`gap-1 rounded-xl font-bold uppercase tracking-wider text-xs ${
                enabled
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] hover:opacity-90 border-none'
                  : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]'
              }`}
            >
              {enabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
              {enabled ? 'On' : 'Off'}
            </Button>
          </div>
        </div>

        {enabled && (
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[var(--accent)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">Remind every</span>
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="w-24 h-8 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="180">3 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Dhikr card */}
        <div className="bg-[var(--surface-2)] border border-[var(--border)] p-4 rounded-xl text-center backdrop-blur-sm">
          <p className="text-2xl font-arabic font-bold text-[var(--accent)] mb-2" dir="rtl">
            {currentDhikr.arabic}
          </p>
          <p className="text-sm font-bold text-[var(--text-primary)] tracking-wide">{currentDhikr.transliteration}</p>
          <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed mt-1">"{currentDhikr.translation}"</p>
          {currentDhikr.virtue && (
            <div className="mt-3 pt-2 border-t border-[var(--border)]">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)] flex items-center justify-center gap-1">
                <span className="text-base">✨</span> {currentDhikr.virtue}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default DhikrReminder;
