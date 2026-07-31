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
      gradient: 'from-[#1A1A1A] to-[#1A1A1A]',
      route: '/quran',
      stats: t('surahsCount') || '114 Surahs'
    },
    {
      id: 'prayer',
      title: t('prayer') || 'Prayer',
      description: t('prayerTimes') || 'Times',
      icon: Building,
      gradient: 'from-[#1A1A1A] to-[#1A1A1A]',
      route: '/prayer-times',
      stats: t('dailyPrayers') || '5 Daily'
    },
    {
      id: 'services',
      title: t('services') || 'Services',
      description: t('allFeatures') || 'All Features',
      icon: Grid3X3,
      gradient: 'from-[#1A1A1A] to-[#1A1A1A]',
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
          className="relative overflow-hidden rounded-2xl p-4 text-left group active:scale-[0.98] transition-transform border border-[#C9860A]/30 shadow-md"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9860A]/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <card.icon className="w-6 h-6 text-[#C9860A] mb-2" />
            <h3 className="text-white font-bold font-serif italic text-base mb-1">{card.title}</h3>
            <p className="text-white/60 text-xs font-medium">{card.description}</p>
            <p className="text-[#C9860A] text-xs mt-2 font-bold uppercase tracking-widest">{card.stats}</p>
          </div>
        </m.button>
      ))}
    </div>
  );
});