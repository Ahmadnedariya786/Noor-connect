import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext-new";
import type { ProphetSummary } from "@/lib/qisas";

interface ProphetCardProps {
  prophet: ProphetSummary;
  onClick: () => void;
  index: number;
}

const eraColors: Record<ProphetSummary["era"], string> = {
  "beginning-of-creation": "from-slate-500 to-slate-600",
  "pre-flood": "from-cyan-500 to-cyan-600",
  patriarchal: "from-amber-500 to-amber-600",
  israelite: "from-emerald-500 to-emerald-600",
  "post-israelite": "from-purple-500 to-purple-600",
};

export function ProphetCard({ prophet, onClick, index }: ProphetCardProps) {
  const { t } = useLanguage();

  const eraLabels: Record<ProphetSummary["era"], string> = {
    "beginning-of-creation": t("qisasEraBeginning"),
    "pre-flood": t("qisasEraPreFlood"),
    patriarchal: t("qisasEraPatriarchal"),
    israelite: t("qisasEraIsraelite"),
    "post-israelite": t("qisasEraPostIsraelite"),
  };

  const visibleMentions = prophet.quranMentions.slice(0, 3);
  const extraMentions = Math.max(0, prophet.quranMentions.length - visibleMentions.length);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card rounded-[28px] p-5 cursor-pointer border border-border/50 hover:border-[#10B981]/30 transition-all duration-300"
    >
      <div className="w-full h-16 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center mb-4 shadow-lg">
        <span className="font-arabic text-xl text-white" dir="rtl">
          {prophet.arabicName}
        </span>
      </div>

      <h3 className="text-foreground font-semibold text-lg mb-1">
        {prophet.name}
      </h3>

      <p className="text-muted-foreground text-sm mb-2">{prophet.title}</p>

      <p className="font-arabic text-base text-muted-foreground mb-3" dir="rtl">
        {prophet.arabicTitle}
      </p>

      {prophet.quranMentions.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-1">
            {t("qisasQuranMentions")}
          </p>
          <div className="flex flex-wrap gap-1">
            {visibleMentions.map((mention) => (
              <span
                key={mention}
                className="px-2 py-1 rounded-md text-xs border border-[#D4AF37]/30 text-[#D4AF37] font-medium"
              >
                {mention}
              </span>
            ))}
            {extraMentions > 0 && (
              <span className="px-2 py-1 rounded-md text-xs text-muted-foreground">
                +{extraMentions} {t("more")}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="inline-flex items-center mb-3">
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${eraColors[prophet.era]}`}
        >
          {eraLabels[prophet.era]}
        </span>
      </div>

      {prophet.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {prophet.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 rounded-md text-xs border border-border/60 text-muted-foreground"
            >
              {tag}
            </span>
          ))}
          {prophet.tags.length > 3 && (
            <span className="px-2 py-1 rounded-md text-xs text-muted-foreground">
              +{prophet.tags.length - 3} {t("more")}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}
