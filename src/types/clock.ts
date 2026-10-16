export type ClockStyleId =
  | 'digital-bold'
  | 'mosque-led'
  | 'crescent-moon'
  | 'ottoman-heritage'
  | 'reactor-ring'
  | 'prayer-arc';

export interface ClockPrayerInfo {
  name: string;
  time: string;
  progress?: number; // 0 to 1
  targetTime?: Date | null;
  date?: Date;
}

export interface ClockProps {
  now: Date;
  timeFormat: '12h' | '24h';
  hijriDate: string;
  nextPrayer: {
    name: string;
    time: string;
    progress: number; // 0 to 1
    targetTime?: Date | null;
  };
  previousPrayer: {
    name: string;
    time: string;
    date?: Date;
  };
  isStaticPreview?: boolean;
}

export interface ClockStyleDefinition {
  id: ClockStyleId;
  name: string;
  subtitle: string;
  description: string;
}

export const CLOCK_STYLES: ClockStyleDefinition[] = [
  {
    id: 'digital-bold',
    name: 'Digital Bold',
    subtitle: 'Classic Digital',
    description: 'Prominent white digits with Hijri calendar display',
  },
  {
    id: 'mosque-led',
    name: 'Mosque LED',
    subtitle: 'Amber LED Board',
    description: '7-segment amber digital glow with prayer countdown',
  },
  {
    id: 'crescent-moon',
    name: 'Crescent Moon',
    subtitle: 'Luxury Lunar Dial',
    description: 'Dark marble analog dial with real-time lunar phase window',
  },
  {
    id: 'ottoman-heritage',
    name: 'Ottoman Heritage',
    subtitle: 'Arabic-Indic Dial',
    description: 'Arabic-Indic numerals with ornate Arabesque centerpiece',
  },
  {
    id: 'reactor-ring',
    name: 'Reactor Ring',
    subtitle: '60-Minute Radial',
    description: 'Minimalist dial with 60 luminous gold minute segments',
  },
  {
    id: 'prayer-arc',
    name: 'Prayer Arc',
    subtitle: 'Interval Arc Dial',
    description: 'Dynamic gold arc spanning from previous prayer to next prayer',
  },
];
