import { memo } from "react";
import { BookOpen, Grid3X3, Building } from "lucide-react";
import { m } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext-new";

interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: any;
  gradient: string;
  route: string;
  stats: string;
}

interface FeatureCardsProps {
  onNavigate: (route: string) => void;
}

export const FeatureCards = memo(function FeatureCards({ onNavigate }: FeatureCardsProps) {
  const { t } = useLanguage();

  const featureCards: FeatureCard[] = [
    {
      id: 'quran',
      title: t('quran') || 'Quran',
      description: t('readAndListen') || 'Read & Listen',
      icon: BookOpen,
      gradient: 'from-[var(--surface)] to-[var(--surface-2)]',
      route: '/quran',
      stats: t('surahsCount') || '114 Surahs'
    },
    {
      id: 'prayer',
      title: t('prayer') || 'Prayer',
      description: t('prayerTimes') || 'Times',
      icon: Building,
      gradient: 'from-[var(--surface)] to-[var(--surface-2)]',
      route: '/prayer-times',
      stats: t('dailyPrayers') || '5 Daily'
    },
    {
      id: 'services',
      title: t('services') || 'Services',
      description: t('allFeatures') || 'All Features',
      icon: Grid3X3,
      gradient: 'from-[var(--surface)] to-[var(--surface-2)]',
      route: '/services',
      stats: t('featuresCount') || '15+ Features'
    }
  ];

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {featureCards.map((card) => (
        <m.button
          key={card.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onNavigate(card.route)}
          className="relative overflow-hidden rounded-2xl p-4 text-left group active:scale-[0.98] transition-transform border border-[var(--border)] shadow-md"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <card.icon className="w-6 h-6 text-[var(--accent)] mb-2" />
            <h3 className="text-[var(--text-primary)] font-bold font-serif italic text-base mb-1">{card.title}</h3>
            <p className="text-[var(--text-secondary)] text-xs font-medium">{card.description}</p>
            <p className="text-[var(--accent)] text-xs mt-2 font-bold uppercase tracking-widest">{card.stats}</p>
          </div>
        </m.button>
      ))}
    </div>
  );
});