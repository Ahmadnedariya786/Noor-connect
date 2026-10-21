import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Search, Bookmark } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";
import { SeerahChapterCard } from "@/components/seerah/SeerahChapterCard";
import { goBackOrFallback } from "@/lib/navigation";
import { getLastRead, getReadingProgress, type ReadingFeature } from "@/lib/reading-storage";
import { useLanguage } from "@/contexts/LanguageContext-new";
import {
  loadSeerahChapterList,
  loadSeerahMetadata,
  type SeerahChapterSummary,
  type SeerahMetadata,
} from "@/lib/seerah";

type PeriodFilter = "all" | "pre-prophethood" | "makkan" | "madinan" | "final-days";

export default function SeerahHome() {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      <PageTransition>
        <div className="min-h-screen bg-background pb-24">
          <div className="max-w-5xl mx-auto px-4 py-6">
            <div className="h-8 w-32 bg-muted rounded-lg animate-pulse mb-8" />
            <div className="h-48 bg-muted/50 rounded-[28px] animate-pulse mb-6" />
            <div className="h-10 bg-muted/50 rounded-xl animate-pulse mb-6 max-w-md mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="h-36 bg-muted/50 rounded-[20px] animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24 safe-top">
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />

            <div className="relative z-10 p-8">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-[#e0c097]" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
                  {t("seerah")}
                </span>
              </div>

              <h2 className="text-3xl font-bold text-white mb-2">
                {metadata?.title || "Ar-Raheeq Al-Makhtum (The Sealed Nectar)"}
              </h2>
              <p className="font-arabic text-2xl text-white/90 mb-4" dir="rtl">
                {metadata?.arabicTitle || "الرحيق المختوم"}
              </p>

              {(metadata?.author || metadata?.arabicAuthor) && (
                <div className="flex items-center gap-4 mb-4">
                  {metadata?.author && <span className="text-white/60 text-sm">{metadata.author}</span>}
                  {metadata?.author && metadata?.arabicAuthor && <span className="text-white/40 text-sm">•</span>}
                  {metadata?.arabicAuthor && <span className="text-white/60 text-sm">{metadata.arabicAuthor}</span>}
                </div>
              )}

              <p className="text-white/70 text-sm mb-6">
                {metadata?.description || "A comprehensive biography of Prophet Muhammad (peace be upon him)."}
              </p>

              <div className="flex items-center gap-4">
                <Badge className="bg-blue-950/40 text-blue-200 border border-blue-500/30">
                  {metadata?.totalChapters || chapters.length || 17} {t("seerahChapters")}
                </Badge>
                <Badge className="bg-blue-950/40 text-blue-200 border border-blue-500/30">
                  {metadata?.language || "en"}
                </Badge>
              </div>
            </div>
          </motion.div>

          {/* Continue Reading */}
          {(() => {
            const lastReadId = getLastRead("seerah");
            const lastReadChapter = lastReadId ? chapters.find(c => c.id === lastReadId) : null;
            if (lastReadChapter && !loading) {
              const progress = getReadingProgress(lastReadId!, "seerah");
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4"
                >
                  <Card
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-primary/20 bg-gradient-to-r from-primary/5 to-transparent"
                    onClick={() => handleChapterClick(lastReadChapter.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Bookmark className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">Continue Reading</p>
                        <p className="text-sm font-semibold truncate">{lastReadChapter.title}</p>
                        {progress > 0 && (
                          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                      <BookOpen className="w-4 h-4 text-primary shrink-0" />
                    </div>
                  </Card>
                </motion.div>
              );
            }
            return null;
          })()}

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
                  {metadata?.totalChapters || chapters.length || 17}
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
                <div className="text-2xl font-bold text-[var(--accent)]">
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
