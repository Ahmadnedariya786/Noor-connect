import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/PageTransition";
import { SeerahChapterCard } from "@/components/seerah/SeerahChapterCard";
import { goBackOrFallback } from "@/lib/navigation";
import {
  loadSeerahChapterList,
  loadSeerahMetadata,
  type SeerahChapterSummary,
  type SeerahMetadata,
} from "@/lib/seerah";

type PeriodFilter = "all" | "pre-prophethood" | "makkan" | "madinan" | "final-days";

export default function SeerahHome() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [metadata, setMetadata] = useState<SeerahMetadata | null>(null);
  const [chapters, setChapters] = useState<SeerahChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [meta, chaps] = await Promise.all([
          loadSeerahMetadata(),
          loadSeerahChapterList(),
        ]);
        setMetadata(meta);
        setChapters(chaps);
      } catch (error) {
        console.error("Failed to load Seerah data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, 200);

    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  const periodLabels: Record<PeriodFilter, string> = {
    all: t("all"),
    "pre-prophethood": t("seerahPeriodPreProphethood"),
    makkan: t("seerahPeriodMakkan"),
    madinan: t("seerahPeriodMadinan"),
    "final-days": t("seerahPeriodFinalDays"),
  };

  const filteredChapters = useMemo(() => {
    let result = chapters;

    if (periodFilter !== "all") {
      result = result.filter((chapter) => chapter.period === periodFilter);
    }

    if (debouncedSearchTerm) {
      result = result.filter(
        (chapter) =>
          chapter.title.toLowerCase().includes(debouncedSearchTerm) ||
          chapter.arabicTitle.includes(debouncedSearchTerm) ||
          chapter.tags.some((tag) => tag.toLowerCase().includes(debouncedSearchTerm))
      );
    }

    return result;
  }, [chapters, debouncedSearchTerm, periodFilter]);

  const handleChapterClick = (chapterId: string) => {
    navigate(`/seerah/${chapterId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goBackOrFallback(navigate, '/services')}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{t("seerah")}</h1>
              <p className="text-muted-foreground">{t("seerahDescription")}</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-blue-900/20 mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />

            <div className="relative z-10 p-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-[#e0c097]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                  {t("seerah")}
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-2">
                {metadata?.title}
              </h2>
              <p className="font-arabic text-2xl text-white/90 mb-4" dir="rtl">
                {metadata?.arabicTitle}
              </p>

              <div className="flex items-center gap-4 mb-4">
                <span className="text-white/60 text-sm">{metadata?.author}</span>
                <span className="text-white/40 text-sm">•</span>
                <span className="text-white/60 text-sm">{metadata?.arabicAuthor}</span>
              </div>

              <p className="text-white/70 text-sm mb-6">{metadata?.description}</p>

              <div className="flex items-center gap-4">
                <Badge className="bg-white/10 text-white/80 border-white/10">
                  {metadata?.totalChapters} {t("seerahChapters")}
                </Badge>
                <Badge className="bg-white/10 text-white/80 border-white/10">
                  {metadata?.language}
                </Badge>
              </div>
            </div>
          </motion.div>

          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("search")}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(periodLabels) as PeriodFilter[]).map((period) => (
              <Button
                key={period}
                variant={periodFilter === period ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriodFilter(period)}
                className={
                  periodFilter === period
                    ? "bg-[#D4AF37] text-white border-[#D4AF37]"
                    : ""
                }
              >
                {periodLabels[period]}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredChapters.map((chapter, index) => (
              <SeerahChapterCard
                key={chapter.id}
                chapter={chapter}
                onClick={() => handleChapterClick(chapter.id)}
                index={index}
              />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-[28px] p-6 border border-border/50"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">
              {t("overview")}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#D4AF37]">
                  {metadata?.totalChapters}
                </div>
                <div className="text-sm text-muted-foreground">{t("seerahChapters")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">
                  {chapters.filter((chapter) => chapter.period === "pre-prophethood").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("seerahPeriodPreProphethood")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">
                  {chapters.filter((chapter) => chapter.period === "makkan").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("seerahPeriodMakkan")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">
                  {chapters.filter((chapter) => chapter.period === "madinan").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("seerahPeriodMadinan")}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
