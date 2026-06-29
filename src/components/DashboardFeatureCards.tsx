import { memo } from "react";
import { BookOpen, Grid3X3, Building } from "lucide-react";
import { m } from "framer-motion";

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
  const featureCards: FeatureCard[] = [
    {
      id: 'quran',
      title: 'Quran',
      description: 'Read & Listen',
      icon: BookOpen,
      gradient: 'from-[#10b981] via-[#059669] to-[#047857]',
      route: '/quran',
      stats: '114 Surahs'
    },
    {
      id: 'prayer',
      title: 'Prayer',
      description: 'Times',
      icon: Building,
      gradient: 'from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]',
      route: '/prayer-times',
      stats: '5 Daily'
    },
    {
      id: 'services',
      title: 'Services',
      description: 'All Features',
      icon: Grid3X3,
      gradient: 'from-[#f59e0b] via-[#d97706] to-[#b45309]',
      route: '/services',
      stats: '15+ Features'
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
          className="relative overflow-hidden rounded-2xl p-4 text-left group active:scale-[0.98] transition-transform"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`} />
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <card.icon className="w-6 h-6 text-white mb-2" />
            <h3 className="text-white font-black text-sm mb-1">{card.title}</h3>
            <p className="text-white/80 text-[10px] font-medium">{card.description}</p>
            <p className="text-white/60 text-[9px] mt-2 font-bold uppercase tracking-wider">{card.stats}</p>
          </div>
        </m.button>
      ))}
    </div>
  );
});