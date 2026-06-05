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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { PageTransition } from "@/components/PageTransition";
import { goBackOrFallback } from "@/lib/navigation";
import {
  loadProphetList,
  loadProphetStory,
  type ProphetStory,
  type ProphetSummary,
} from "@/lib/qisas";
import {
  getFontSize,
  getReadingProgress,
  isBookmarked as checkBookmarked,
  setFontSize,
  setLastRead,
  setReadingProgress,
  toggleBookmark,
} from "@/lib/reading-storage";

type EraKey = ProphetSummary["era"];

export default function QisasReader() {
  const { prophetId } = useParams<{ prophetId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [prophet, setProphet] = useState<ProphetStory | null>(null);
  const [allProphets, setAllProphets] = useState<ProphetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSizeState] = useState(16);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFontSlider, setShowFontSlider] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const eraLabels: Record<EraKey, string> = useMemo(
    () => ({
      "beginning-of-creation": t("qisasEraBeginning"),
      "pre-flood": t("qisasEraPreFlood"),
      patriarchal: t("qisasEraPatriarchal"),
      israelite: t("qisasEraIsraelite"),
      "post-israelite": t("qisasEraPostIsraelite"),
    }),
    [t]
  );

  useEffect(() => {
    async function loadData() {
      if (!prophetId) return;

      setLoading(true);
      try {
        const [prophetData, list] = await Promise.all([
          loadProphetStory(prophetId),
          loadProphetList(),
        ]);

        setProphet(prophetData);
        setAllProphets(list);
        setLastRead(prophetId, "qisas");
        setIsBookmarked(checkBookmarked(prophetId, "qisas"));
        setFontSizeState(getFontSize("qisas"));
        setScrollProgress(getReadingProgress(prophetId, "qisas"));
      } catch (error) {
        console.error("Failed to load prophet story:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [prophetId]);

  useEffect(() => {
    const element = contentRef.current;
    if (!element) return;

    const handleScroll = () => {
      const scrollTop = element.scrollTop;
      const scrollHeight = element.scrollHeight - element.clientHeight;
      const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 100;

      setScrollProgress(Math.min(100, Math.max(0, progress)));
      setReadingProgress(prophetId || "", progress, "qisas");
      setShowBackToTop(scrollTop > 300);
    };

    element.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => element.removeEventListener("scroll", handleScroll);
  }, [prophetId, prophet]);

  const handleFontSizeChange = (value: number[]) => {
    const size = value[0];
    setFontSizeState(size);
    setFontSize(size, "qisas");
  };

  const handleBookmarkToggle = () => {
    if (!prophetId) return;
    const bookmarked = toggleBookmark(prophetId, "qisas");
    setIsBookmarked(bookmarked);
  };

  const scrollToTop = () => {
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPrevProphet = () => {
    if (!prophet) return;
    const currentIndex = allProphets.findIndex((item) => item.id === prophet.id);
    if (currentIndex > 0) {
      navigate(`/qisas/${allProphets[currentIndex - 1].id}`);
    }
  };

  const goToNextProphet = () => {
    if (!prophet) return;
    const currentIndex = allProphets.findIndex((item) => item.id === prophet.id);
    if (currentIndex < allProphets.length - 1) {
      navigate(`/qisas/${allProphets[currentIndex + 1].id}`);
    }
  };

  const handleQuranRefClick = (ref: string) => {
    const [surahPart] = ref.split(":");
    const surahNum = Number.parseInt(surahPart, 10);
    if (!Number.isNaN(surahNum)) {
      navigate(`/mushaf/surah/${surahNum}`);
    }
  };

  const parseContent = (content: string) => {
    return content.split("\n\n").map((paragraph, index) => {
      const quranRefMatch = paragraph.match(/^\d+:\d+(?:-\d+)?$/);

      if (quranRefMatch) {
        return (
          <div
            key={index}
            className="my-4 p-4 bg-gradient-to-r from-[#D4AF37]/10 to-[#10B981]/10 border-l-4 border-[#D4AF37] rounded-r-lg cursor-pointer hover:from-[#D4AF37]/20 hover:to-[#10B981]/20 transition-all"
            onClick={() => handleQuranRefClick(paragraph)}
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

  if (!prophet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t("notFound")}</div>
      </div>
    );
  }

  const currentIndex = allProphets.findIndex((item) => item.id === prophet.id);
  const visibleMentions = prophet.quranMentions.slice(0, 3);
  const extraMentions = Math.max(0, prophet.quranMentions.length - visibleMentions.length);

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
                onClick={() => goBackOrFallback(navigate, '/qisas')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-foreground truncate">
                  {prophet.name}
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
          <div
            className="w-full h-20 rounded-xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center mb-4 shadow-lg"
          >
            <span className="font-arabic text-3xl text-white" dir="rtl">
              {prophet.arabicName}
            </span>
          </div>

          <h2 className="text-3xl font-bold text-foreground mb-2">
            {prophet.name}
          </h2>
          <p className="text-xl text-muted-foreground mb-2">{prophet.title}</p>
          <p className="font-arabic text-2xl text-foreground mb-4" dir="rtl">
            {prophet.arabicTitle}
          </p>

          <div className="inline-flex items-center mb-4">
            <span className="px-3 py-1 rounded-full text-sm font-medium text-white bg-[#10B981]">
              {eraLabels[prophet.era]}
            </span>
          </div>

          {prophet.quranMentions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                {t("qisasQuranMentions")}
              </p>
              <div className="flex flex-wrap gap-2">
                {visibleMentions.map((mention) => (
                  <Badge
                    key={mention}
                    variant="outline"
                    className="border-[#D4AF37]/30 text-[#D4AF37] cursor-pointer hover:bg-[#D4AF37]/10"
                    onClick={() => handleQuranRefClick(mention)}
                  >
                    {mention}
                  </Badge>
                ))}
                {extraMentions > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    +{extraMentions} {t("more")}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {prophet.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {prophet.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="text-sm text-muted-foreground mb-4">
            {t("qisasProphetOf")} {prophet.number} / {allProphets.length}
          </div>
        </div>

        <div
          ref={contentRef}
          className="max-w-3xl mx-auto px-4 py-6 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 300px)" }}
        >
          <div className="text-foreground" style={{ fontSize: `${fontSize}px` }}>
            {parseContent(prophet.story)}
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
            onClick={goToPrevProphet}
            disabled={currentIndex === 0}
            className="rounded-xl"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t("previous")}
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1} / {allProphets.length}
          </span>
          <Button
            variant="outline"
            onClick={goToNextProphet}
            disabled={currentIndex === allProphets.length - 1}
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
