import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext-new";
import type { SeerahChapterSummary } from "@/lib/seerah";

interface SeerahChapterCardProps {
  chapter: SeerahChapterSummary;
  onClick: () => void;
  index: number;
}

const periodColors: Record<SeerahChapterSummary["period"], string> = {
  "pre-prophethood": "from-blue-500 to-blue-600",
  makkan: "from-amber-500 to-amber-600",
  madinan: "from-emerald-500 to-emerald-600",
  "final-days": "from-purple-500 to-purple-600",
};

export function SeerahChapterCard({ chapter, onClick, index }: SeerahChapterCardProps) {
  const { t } = useLanguage();

  const periodLabels: Record<SeerahChapterSummary["period"], string> = {
    "pre-prophethood": t("seerahPeriodPreProphethood"),
    makkan: t("seerahPeriodMakkan"),
    madinan: t("seerahPeriodMadinan"),
    "final-days": t("seerahPeriodFinalDays"),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-[28px] p-5 cursor-pointer border border-border/50 hover:border-[#D4AF37]/30 transition-all duration-300"
    >
      <div
        className={`w-12 h-12 rounded-full bg-gradient-to-br ${periodColors[chapter.period]} flex items-center justify-center mb-4 shadow-lg`}
      >
        <span className="text-white font-bold text-lg">{chapter.number}</span>
      </div>

      <h3 className="text-foreground font-semibold text-lg mb-1">
        {chapter.title}
      </h3>

      <p className="font-arabic text-xl text-muted-foreground mb-3" dir="rtl">
        {chapter.arabicTitle}
      </p>

      <div className="inline-flex items-center mb-3">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${periodColors[chapter.period]}`}
        >
          {periodLabels[chapter.period]}
        </span>
      </div>

      {chapter.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chapter.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-md text-xs border border-border/60 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {chapter.tags.length > 3 && (
            <span className="px-2 py-1 rounded-md text-xs text-muted-foreground">
              +{chapter.tags.length - 3} {t("more")}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
