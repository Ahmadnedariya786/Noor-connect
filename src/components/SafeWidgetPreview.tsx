/**
 * SafeWidgetPreview
 * Rich, accurate mini-previews for every dashboard widget.
 * Wraps everything in an ErrorBoundary so a crash in a preview never
 * takes down the entire WidgetCustomizer page.
 */

import React, { Component, type ReactNode, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─────────────────────────────────────────────────────────────
// Error Boundary
// ─────────────────────────────────────────────────────────────
interface EBProps { children: ReactNode; widgetName: string; onEnable?: () => void; }
interface EBState { hasError: boolean; }

class WidgetErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): EBState { return { hasError: true }; }
  componentDidCatch(error: Error) {
    console.error(`[SafeWidgetPreview] ${this.props.widgetName}:`, error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <Card className="overflow-hidden border-dashed border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/20">
          <CardContent className="p-4 flex flex-col items-center text-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">Preview unavailable</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7"
                onClick={() => this.setState({ hasError: false })}>Retry</Button>
              {this.props.onEnable && (
                <Button size="sm" className="text-xs h-7" onClick={this.props.onEnable}>Add Anyway</Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────
// Mini preview helpers
// ─────────────────────────────────────────────────────────────

const Row = ({ label, value, active }: { label: string; value: string; active?: boolean }) => (
  <div className={`flex justify-between items-center px-2 py-1 rounded-lg text-xs ${active ? 'bg-amber-400/20 font-bold' : ''}`}>
    <span className={active ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'}>{label}</span>
    <span className={active ? 'text-amber-700 dark:text-amber-300' : 'text-foreground font-medium'}>{value}</span>
  </div>
);

// ── Prayer Times ──────────────────────────────────────────────
const PrayerTimesPreview = () => {
  const prayers = [
    { n: 'Fajr', t: '05:12', active: false },
    { n: 'Dhuhr', t: '12:30', active: false },
    { n: 'Asr', t: '15:48', active: true },
    { n: 'Maghrib', t: '18:45', active: false },
    { n: 'Isha', t: '20:15', active: false },
  ];
  return (
    <div className="rounded-xl border border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-blue-50/20 dark:from-blue-950/30 dark:to-blue-950/10 p-3 space-y-1">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold text-blue-700 dark:text-blue-300">Prayer Times</span>
        <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">Next: Asr</Badge>
      </div>
      {prayers.map(p => <Row key={p.n} label={p.n} value={p.t} active={p.active} />)}
    </div>
  );
};

// ── Daily Ayah ────────────────────────────────────────────────
const DailyAyahPreview = () => (
  <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-50/20 dark:from-emerald-950/30 dark:to-emerald-950/10 p-3 space-y-2">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Daily Ayah</span>
      <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600 dark:text-emerald-400">Al-Baqarah</Badge>
    </div>
    <p className="text-right text-base font-arabic leading-relaxed text-emerald-900 dark:text-emerald-200 line-clamp-2">
      ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ
    </p>
    <p className="text-xs text-muted-foreground line-clamp-2">
      "Allah — there is no deity except Him, the Ever-Living, the Sustainer of existence."
    </p>
    <p className="text-xs text-emerald-600 dark:text-emerald-400 text-right italic">— Ayat al-Kursi (2:255)</p>
  </div>
);

// ── Daily Hadith ──────────────────────────────────────────────
const DailyHadithPreview = () => (
  <div className="rounded-xl border border-indigo-200/60 bg-gradient-to-br from-indigo-50/80 to-indigo-50/20 dark:from-indigo-950/30 dark:to-indigo-950/10 p-3 space-y-2">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">Daily Hadith</span>
      <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600">Bukhari</Badge>
    </div>
    <p className="text-xs text-foreground line-clamp-3 leading-relaxed">
      "The best of you are those who learn the Quran and teach it to others."
    </p>
    <p className="text-xs text-muted-foreground">Narrated by Uthman ibn Affan (RA)</p>
  </div>
);

// ── Qibla ─────────────────────────────────────────────────────
const QiblaPreview = () => (
  <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-amber-50/20 dark:from-amber-950/30 dark:to-amber-950/10 p-3">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Qibla Direction</span>
      <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">NW</Badge>
    </div>
    <div className="flex items-center justify-center py-2">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-amber-300/60 dark:border-amber-700/60" />
        <div className="absolute inset-2 rounded-full border border-amber-200/40 dark:border-amber-800/40" />
        {/* Compass needle */}
        <div className="absolute inset-0 flex items-center justify-center" style={{ transform: 'rotate(-42deg)' }}>
          <div className="w-1 h-6 bg-gradient-to-t from-red-500 to-transparent rounded-full" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
      </div>
    </div>
    <p className="text-center text-xs text-muted-foreground">295° · 6,847 km to Makkah</p>
  </div>
);

// ── Tasbeeh ───────────────────────────────────────────────────
const TasbeehPreview = () => {
  const [count, setCount] = useState(33);
  return (
    <div className="rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/80 to-teal-50/20 dark:from-teal-950/30 dark:to-teal-950/10 p-3 text-center">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-teal-700 dark:text-teal-300">Tasbeeh Counter</span>
        <Badge variant="outline" className="text-xs border-teal-300 text-teal-600">سُبْحَانَ ٱللَّٰهِ</Badge>
      </div>
      <div
        className="w-16 h-16 mx-auto rounded-full bg-teal-500 flex items-center justify-center shadow-lg cursor-pointer select-none active:scale-95 transition-transform"
        onClick={() => setCount(c => c + 1)}
      >
        <span className="text-2xl font-bold text-white">{count}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Tap to count · Goal: 99</p>
      <Progress value={(count / 99) * 100} className="h-1.5 mt-1" />
    </div>
  );
};

// ── Ramadan ───────────────────────────────────────────────────
const RamadanPreview = () => (
  <div className="rounded-xl border border-emerald-300/60 bg-gradient-to-br from-emerald-600/10 to-emerald-600/5 dark:from-emerald-900/30 dark:to-emerald-900/10 p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">🌙 Ramadan</span>
      <Badge variant="outline" className="text-xs border-emerald-400 text-emerald-700">Day 15</Badge>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-emerald-100/60 dark:bg-emerald-900/30 p-2 text-center">
        <p className="text-xs text-muted-foreground">Suhoor ends</p>
        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">04:48 AM</p>
      </div>
      <div className="rounded-lg bg-emerald-100/60 dark:bg-emerald-900/30 p-2 text-center">
        <p className="text-xs text-muted-foreground">Iftar at</p>
        <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">06:52 PM</p>
      </div>
    </div>
    <Progress value={60} className="h-1.5" />
    <p className="text-xs text-center text-muted-foreground">60% of day fasted</p>
  </div>
);

// ── Salah Tracker ─────────────────────────────────────────────
const SalahTrackerPreview = () => {
  const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  const done = [true, true, true, false, false];
  return (
    <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-violet-50/20 dark:from-violet-950/30 dark:to-violet-950/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-violet-700 dark:text-violet-300">Today's Salah</span>
        <Badge variant="outline" className="text-xs border-violet-300 text-violet-600">3/5</Badge>
      </div>
      <div className="flex gap-1.5">
        {prayers.map((p, i) => (
          <div key={p} className="flex-1 text-center">
            <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-xs font-bold ${
              done[i]
                ? 'bg-violet-500 text-white'
                : 'bg-muted text-muted-foreground border border-border'
            }`}>
              {done[i] ? '✓' : ''}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.slice(0, 3)}</p>
          </div>
        ))}
      </div>
      <Progress value={60} className="h-1.5" />
    </div>
  );
};

// ── Weekly Progress Chart ─────────────────────────────────────
const WeeklyChartPreview = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const scores = [5, 4, 5, 3, 5, 2, 4];
  const max = 5;
  return (
    <div className="rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-sky-50/20 dark:from-sky-950/30 dark:to-sky-950/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-sky-700 dark:text-sky-300">Weekly Progress</span>
        <Badge variant="outline" className="text-xs border-sky-300 text-sky-600">28/35</Badge>
      </div>
      <div className="flex items-end gap-1 h-12">
        {days.map((d, i) => (
          <div key={d} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-sm bg-sky-500"
              style={{ height: `${(scores[i] / max) * 100}%` }}
            />
            <p className="text-xs text-muted-foreground">{d[0]}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Quran Progress ────────────────────────────────────────────
const QuranProgressPreview = () => (
  <div className="rounded-xl border border-green-200/60 bg-gradient-to-br from-green-50/80 to-green-50/20 dark:from-green-950/30 dark:to-green-950/10 p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-green-700 dark:text-green-300">Quran Progress</span>
      <Badge variant="outline" className="text-xs border-green-300 text-green-600">42%</Badge>
    </div>
    <div className="flex items-center gap-3">
      {/* Mini circular progress */}
      <div className="relative w-12 h-12 shrink-0">
        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted" />
          <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 14}`}
            strokeDashoffset={`${2 * Math.PI * 14 * (1 - 0.42)}`}
            className="text-green-500 transition-all" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">42%</div>
      </div>
      <div>
        <p className="text-sm font-bold text-foreground">48 / 114</p>
        <p className="text-xs text-muted-foreground">Surahs completed</p>
        <p className="text-xs text-muted-foreground">2,840 / 6,236 ayahs</p>
      </div>
    </div>
  </div>
);

// ── Islamic Events ────────────────────────────────────────────
const IslamicEventsPreview = () => (
  <div className="rounded-xl border border-orange-200/60 bg-gradient-to-br from-orange-50/80 to-orange-50/20 dark:from-orange-950/30 dark:to-orange-950/10 p-3 space-y-2">
    <span className="text-xs font-bold text-orange-700 dark:text-orange-300">Islamic Events</span>
    <div className="space-y-1.5">
      {[
        { n: 'Laylat al-Qadr', d: '3 days', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
        { n: 'Eid al-Fitr', d: '12 days', color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
      ].map(e => (
        <div key={e.n} className={`flex justify-between items-center rounded-lg px-2 py-1.5 ${e.color}`}>
          <span className="text-xs font-medium">{e.n}</span>
          <Badge variant="outline" className="text-xs border-current">{e.d}</Badge>
        </div>
      ))}
    </div>
  </div>
);

// ── Prayer Stats ──────────────────────────────────────────────
const PrayerStatsPreview = () => (
  <div className="rounded-xl border border-purple-200/60 bg-gradient-to-br from-purple-50/80 to-purple-50/20 dark:from-purple-950/30 dark:to-purple-950/10 p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-purple-700 dark:text-purple-300">Prayer Statistics</span>
      <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">This week</Badge>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-purple-100/60 dark:bg-purple-900/30 p-2 text-center">
        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">28</p>
        <p className="text-xs text-muted-foreground">Completed</p>
        <p className="text-xs text-purple-600">80%</p>
      </div>
      <div className="rounded-lg bg-purple-100/60 dark:bg-purple-900/30 p-2 text-center">
        <p className="text-lg font-bold text-purple-700 dark:text-purple-300">🔥 7</p>
        <p className="text-xs text-muted-foreground">Day Streak</p>
      </div>
    </div>
    <Progress value={80} className="h-1.5" />
  </div>
);

// ── Qaza Tracker ──────────────────────────────────────────────
const QazaTrackerPreview = () => (
  <div className="rounded-xl border border-rose-200/60 bg-gradient-to-br from-rose-50/80 to-rose-50/20 dark:from-rose-950/30 dark:to-rose-950/10 p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Qaza Tracker</span>
      <Badge variant="outline" className="text-xs border-rose-300 text-rose-600">12 remaining</Badge>
    </div>
    <div className="space-y-1">
      {[
        { n: 'Fajr', count: 5 },
        { n: 'Dhuhr', count: 3 },
        { n: 'Asr', count: 4 },
      ].map(p => (
        <div key={p.n} className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground w-12">{p.n}</span>
          <Progress value={(p.count / 10) * 100} className="flex-1 h-1.5" />
          <span className="text-xs font-medium text-rose-700 dark:text-rose-300">{p.count}</span>
        </div>
      ))}
    </div>
  </div>
);

// ── Dhikr Reminder ────────────────────────────────────────────
const DhikrReminderPreview = () => (
  <div className="rounded-xl border border-cyan-200/60 bg-gradient-to-br from-cyan-50/80 to-cyan-50/20 dark:from-cyan-950/30 dark:to-cyan-950/10 p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300">Dhikr Reminder</span>
      <Badge variant="outline" className="text-xs border-cyan-300 text-cyan-600">Morning</Badge>
    </div>
    <div className="rounded-lg bg-cyan-100/60 dark:bg-cyan-900/30 p-2.5 text-center space-y-1">
      <p className="text-base font-arabic text-cyan-900 dark:text-cyan-200">سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ</p>
      <p className="text-xs text-muted-foreground">"Glory be to Allah and His is the praise"</p>
    </div>
    <div className="flex gap-1.5">
      {['SubhanAllah', 'Alhamdulillah', 'AllahuAkbar'].map(d => (
        <div key={d} className="flex-1 rounded-lg bg-cyan-200/50 dark:bg-cyan-900/40 px-1 py-1 text-center">
          <p className="text-xs text-cyan-700 dark:text-cyan-300 font-medium truncate">{d.slice(0, 7)}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Quran Radio ─────────────────────────────────────────────
const QuranRadioPreview = () => (
  <div className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50/80 to-emerald-50/20 dark:from-emerald-950/30 dark:to-emerald-950/10 p-3 space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Quran Radio</span>
      <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">Live</Badge>
    </div>
    <div className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
         <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1" />
       </div>
       <div className="flex-1 min-w-0">
         <p className="text-sm font-bold text-foreground truncate">Surah Al-Baqarah</p>
         <p className="text-xs text-muted-foreground truncate">Mishary Rashid Alafasy</p>
       </div>
    </div>
    <div className="flex justify-between items-center bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg px-2 py-1">
      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
      <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">BUFFERING STREAM...</span>
      <div className="flex gap-1">
        <div className="w-0.5 h-2 bg-emerald-400" />
        <div className="w-0.5 h-3 bg-emerald-500" />
        <div className="w-0.5 h-2.5 bg-emerald-400" />
      </div>
    </div>
  </div>
);

// ── Islamic Remedy (Mood-based) ─────────────────────────────
const RemedyPreview = () => {
  const moods = ['😔 Sad', '😰 Anxious', '😡 Angry', '😴 Tired', '🙏 Grateful'];
  return (
    <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-amber-50/20 dark:from-amber-950/30 dark:to-amber-950/10 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Quick Remedy</span>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-semibold">How do you feel?</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {moods.slice(0, 3).map(m => (
          <div key={m} className="rounded-lg bg-amber-100/60 dark:bg-amber-900/30 px-1.5 py-1.5 text-center">
            <p className="text-base leading-none">{m.split(' ')[0]}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 font-medium truncate">{m.split(' ')[1]}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-amber-500/10 border border-amber-300/40 p-2 text-center">
        <p className="text-xs text-amber-800 dark:text-amber-200 font-arabic leading-relaxed">رَبَّنَا لَا تُزِغْ قُلُوبَنَا</p>
        <p className="text-xs text-muted-foreground mt-0.5">Quran 3:8 · Tap mood for remedy</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Master map
// ─────────────────────────────────────────────────────────────
const PREVIEW_MAP: Record<string, React.FC> = {
  'prayer-times':   PrayerTimesPreview,
  'daily-ayah':     DailyAyahPreview,
  'daily-hadith':   DailyHadithPreview,
  'qibla-quick':    QiblaPreview,
  'tasbeeh-quick':  TasbeehPreview,
  'ramadan':        RamadanPreview,
  'salah-tracker':  SalahTrackerPreview,
  'weekly-chart':   WeeklyChartPreview,
  'quran-progress': QuranProgressPreview,
  'islamic-events': IslamicEventsPreview,
  'prayer-stats':   PrayerStatsPreview,
  'qaza-tracker':   QazaTrackerPreview,
  'dhikr-reminder': DhikrReminderPreview,
  'quran-radio':    QuranRadioPreview,
  'remedy':         RemedyPreview,
};

// ─────────────────────────────────────────────────────────────
// Public component
// ─────────────────────────────────────────────────────────────
interface SafeWidgetPreviewProps {
  widgetId: string;
  isVisible: boolean;
  onEnable?: () => void;
}

export function SafeWidgetPreview({ widgetId, isVisible, onEnable }: SafeWidgetPreviewProps) {
  const Preview = PREVIEW_MAP[widgetId];

  const content = Preview ? (
    <Preview />
  ) : (
    // Graceful fallback for any future unknown widget IDs
    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-center">
      <p className="text-sm text-muted-foreground">Widget preview</p>
      <p className="text-xs text-muted-foreground/70 mt-1">Will appear on your dashboard</p>
    </div>
  );

  return (
    <div className={isVisible ? '' : 'opacity-80'}>
      <WidgetErrorBoundary widgetName={widgetId} onEnable={onEnable}>
        {content}
      </WidgetErrorBoundary>
    </div>
  );
}

export default SafeWidgetPreview;
