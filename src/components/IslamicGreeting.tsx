import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";

interface IslamicEvent {
  name: string;
  greeting: string;
  arabicGreeting: string;
  hijriMonth: number;
  hijriDay: number;
}

const islamicEvents: IslamicEvent[] = [
  { name: "Eid al-Fitr", greeting: "Eid Mubarak!", arabicGreeting: "عيد مبارك", hijriMonth: 10, hijriDay: 1 },
  { name: "Eid al-Adha", greeting: "Eid Mubarak!", arabicGreeting: "عيد مبارك", hijriMonth: 12, hijriDay: 10 },
  { name: "Ramadan", greeting: "Ramadan Mubarak!", arabicGreeting: "رمضان مبارك", hijriMonth: 9, hijriDay: 1 },
  { name: "Islamic New Year", greeting: "Happy Islamic New Year!", arabicGreeting: "سنة هجرية مباركة", hijriMonth: 1, hijriDay: 1 },
  { name: "Ashura", greeting: "Blessed Ashura!", arabicGreeting: "عاشوراء مبارك", hijriMonth: 1, hijriDay: 10 },
  { name: "Laylat al-Qadr", greeting: "Laylat al-Qadr Mubarak!", arabicGreeting: "ليلة القدر مباركة", hijriMonth: 9, hijriDay: 27 },
  { name: "Arafah Day", greeting: "Day of Arafah", arabicGreeting: "يوم عرفة", hijriMonth: 12, hijriDay: 9 },
];

export function IslamicGreeting() {
  const [greeting, setGreeting] = useState<IslamicEvent | null>(null);

  useEffect(() => {
    const fetchGreeting = async () => {
      try {
        const { islamicCalendarService } = await import('@/lib/islamic-calendar-service');
        const today = new Date();
        const islamicDate = await islamicCalendarService.getIslamicDate(today);
        const todayHijriMonth = parseInt(islamicDate.hijri.month.number.toString());
        const todayHijriDay = parseInt(islamicDate.hijri.day);

        // Check Jumu'ah first (Friday)
        if (today.getDay() === 5) {
          setGreeting({
            name: "Jumu'ah",
            greeting: "Jumu'ah Mubarak!",
            arabicGreeting: "جمعة مباركة",
            hijriMonth: todayHijriMonth,
            hijriDay: todayHijriDay,
          });
          return;
        }

        // Check for special Hijri dates
        const event = islamicEvents.find(
          e => e.hijriMonth === todayHijriMonth && e.hijriDay === todayHijriDay
        );
        if (event) {
          setGreeting(event);
        }
      } catch {
        // Silently fail — no greeting shown if API unavailable
      }
    };

    fetchGreeting();
  }, []);

  if (!greeting) return null;

  return (
    <div className="mb-4">
      <div className="relative overflow-hidden rounded-full bg-gradient-to-r from-primary/20 via-primary/10 to-primary/5 border border-primary/20 p-1 shadow-sm">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
        <div className="relative flex items-center justify-center gap-4 py-2 px-6">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
          <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center">
            <span className="text-lg font-bold font-arabic text-primary leading-none mt-1">{greeting.arabicGreeting}</span>
            <span className="hidden sm:inline text-primary/30">•</span>
            <span className="text-sm font-medium text-foreground">{greeting.greeting}</span>
          </div>
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default IslamicGreeting;
