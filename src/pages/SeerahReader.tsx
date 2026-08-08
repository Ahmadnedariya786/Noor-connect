import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUp,
  BookMarked,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Type,
  Share2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { PageTransition } from "@/components/PageTransition";
import { goBackOrFallback } from "@/lib/navigation";
import { useLanguage } from "@/contexts/LanguageContext-new";
import {
  loadSeerahChapter,
  loadSeerahChapterList,
  type SeerahChapter,
  type SeerahChapterSummary,
} from "@/lib/seerah";
import {
  getFontSize,
  getReadingProgress,
  isBookmarked as checkBookmarked,
  setFontSize,
  setLastRead,
  setReadingProgress,
  toggleBookmark,
} from "@/lib/reading-storage";

type PeriodKey = SeerahChapterSummary["period"];

export default function SeerahReader() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [chapter, setChapter] = useState<SeerahChapter | null>(null);
  const [allChapters, setAllChapters] = useState<SeerahChapterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSizeState] = useState(16);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFontSlider, setShowFontSlider] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const periodLabels: Record<PeriodKey, string> = useMemo(
    () => ({
      "pre-prophethood": t("seerahPeriodPreProphethood"),
      makkan: t("seerahPeriodMakkan"),
      madinan: t("seerahPeriodMadinan"),
      "final-days": t("seerahPeriodFinalDays"),
    }),
    [t]
  );

  useEffect(() => {
    async function loadData() {
      if (!chapterId) return;

      setLoading(true);
      try {
        const [chapterData, chapterList] = await Promise.all([
          loadSeerahChapter(chapterId),
          loadSeerahChapterList(),
        ]);

        setChapter(chapterData);
        setAllChapters(chapterList);
        setLastRead(chapterId, "seerah");
        setIsBookmarked(checkBookmarked(chapterId, "seerah"));
        setFontSizeState(getFontSize("seerah"));
        setScrollProgress(getReadingProgress(chapterId, "seerah"));
      } catch (error) {
        console.error("Failed to load chapter:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [chapterId]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const handleScroll = () => {
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 100;

      setScrollProgress(Math.min(100, Math.max(0, progress)));
      setReadingProgress(chapterId || "", progress, "seerah");
      setShowBackToTop(scrollTop > 300);
    };

    element.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => element.removeEventListener("scroll", handleScroll);
  }, [chapterId, chapter]);

  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    setFontSizeState(size);
    setFontSize(size, "seerah");
  };

  const { toast } = useToast();

  const handleShare = async () => {
    const url = window.location.href;
    const title = chapter?.title ?? "";
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const handleBookmarkToggle = () => {
    if (!chapterId) return;
    const bookmarked = toggleBookmark(chapterId, "seerah");
    setIsBookmarked(bookmarked);
    toast({ title: bookmarked ? "Bookmarked" : "Bookmark removed" });
  };

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPrevChapter = () => {
    if (!chapter) return;
    const currentIndex = allChapters.findIndex((item) => item.id === chapter.id);
    if (currentIndex > 0) {
      navigate(`/seerah/${allChapters[currentIndex - 1].id}`);
    }
  };

  const goToNextChapter = () => {
    if (!chapter) return;
    const currentIndex = allChapters.findIndex((item) => item.id === chapter.id);
    if (currentIndex < allChapters.length - 1) {
      navigate(`/seerah/${allChapters[currentIndex + 1].id}`);
    }
  };

  const parseContent = (content: string) => {
    return content.split("\n\n").map((paragraph, index) => {
      const quranRefMatch = paragraph.match(/^\d+:\d+(?:-\d+)?$/);

      if (quranRefMatch) {
        return (
          <div
            key={index}
            className="my-4 p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#10B981]/10 border-l-4 border-[#D4AF37] rounded-r-lg"
          >
            <p className="font-arabic text-lg text-foreground" dir="rtl">
              {paragraph}
            </p>
          </div>
        );
      }

      return (
        <p key={index} className="mb-4 leading-[1.8]">
          {paragraph}
        </p>
      );
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("loading")}</div>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("notFound")}</div>
      </div>
    );
  }

  const currentIndex = allChapters.findIndex((item) => item.id === chapter.id);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-24">
        <div className="fixed top-0 left-0 right-0 h-1 bg-background z-50">
          <div
            className="h-full bg-gradient-to-r from-[#D4AF37] to-[#10B981] transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/50 z-40">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goBackOrFallback(navigate, '/seerah')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {chapter.title}
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowFontSlider((current) => !current)}
                className="rounded-xl"
              >
                <Type className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="rounded-xl"
              >
                <Share2 className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBookmarkToggle}
                className="rounded-xl"
              >
                {isBookmarked ? (
                  <BookMarked className="w-5 h-5 text-[#D4AF37]" />
                ) : (
                  <Bookmark className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {showFontSlider && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 pb-4"
              >
                <div className="max-w-3xl mx-auto bg-card rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground w-16">
                      {t("fontSize")}
                    </span>
                    <Slider
                      value={[fontSize]}
                      onValueChange={handleFontSizeChange}
                      min={14}
                      max={24}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {fontSize}px
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <span className="font-medium">{periodLabels[chapter.period]}</span>
            <span>→</span>
            <span>
              {t("chapter")} {chapter.number} / {allChapters.length}
            </span>
          </div>
          <p className="font-arabic text-2xl text-foreground mb-4" dir="rtl">
            {chapter.arabicTitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {chapter.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div
          ref={contentRef}
          className="max-w-3xl mx-auto px-4 py-6 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 200px)" }}
        >
          <div className="text-foreground" style={{ fontSize: `${fontSize}px` }}>
            {parseContent(chapter.content)}
          </div>
        </div>

        <AnimatePresence>
          {showBackToTop && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-24 right-4 z-50"
            >
              <Button
                size="icon"
                onClick={scrollToTop}
                className="rounded-full shadow-lg bg-[#D4AF37] hover:bg-[#B8962E]"
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center justify-between border-t border-border/50">
          <Button
            variant="outline"
            onClick={goToPrevChapter}
            disabled={currentIndex === 0}
            className="rounded-xl"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {allChapters.length}
          </span>
          <Button
            variant="outline"
            onClick={goToNextChapter}
            disabled={currentIndex === allChapters.length - 1}
            className="rounded-xl"
          >
            {t("next")}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </PageTransition>
  );
}
