import { Home, BookOpen, Compass, LayoutGrid, Settings as SettingsIcon, Clock, Trophy, Star, Search, Loader2, Heart, ToggleLeft, ToggleRight, Sparkles, MessageCircle, Activity, Building, Grid3X3, Calendar, Info, Moon, Sun, Cloud, CloudMoon, Sunset } from "lucide-react";

export const prayerIcons = {
  Fajr: <Moon className="w-5 h-5 text-indigo-400" />,
  Dhuhr: <Sun className="w-5 h-5 text-amber-400" />,
  Asr: <Cloud className="w-5 h-5 text-blue-400" />,
  Maghrib: <Sunset className="w-5 h-5 text-orange-400" />,
  Isha: <CloudMoon className="w-5 h-5 text-purple-400" />,
};

export const featureCards = [
  {
    id: 'quran',
    title: 'Quran',
    description: 'Read & Listen',
    icon: BookOpen,
    gradient: 'from-[#10b981] via-[#059669] to-[#047857]', // Rich emerald
    route: '/quran',
    stats: '114 Surahs'
  },
  {
    id: 'prayer',
    title: 'Prayer',
    description: 'Times & Qibla',
    icon: Building,
    gradient: 'from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]', // Deep blue
    route: '/qibla',
    stats: '5 Daily'
  },
  {
    id: 'services',
    title: 'Services',
    description: 'All Features',
    icon: Grid3X3,
    gradient: 'from-[#f59e0b] via-[#d97706] to-[#b45309]', // Vibrant amber
    route: '/services',
    stats: '15+ Features'
  }
];

export const premiumGradients = {
  gold: 'from-[#e0c097] via-[#d4af37] to-[#c4a647]',
  emerald: 'from-[#10b981] via-[#059669] to-[#047857]',
  sapphire: 'from-[#2563eb] via-[#1d4ed8] to-[#1e40af]',
  amethyst: 'from-[#6366f1] via-[#4f46e5] to-[#4338ca]',
  ruby: 'from-[#ef4444] via-[#dc2626] to-[#b91c1c]',
  obsidian: 'from-[#111827] via-[#0f172a] to-[#1e293b]',
  pearl: 'from-[#f3f4f6] via-[#e5e7eb] to-[#d1d5db]',
  onyx: 'from-[#0f0f0f] via-[#000000] to-[#1a1a1a]'
};