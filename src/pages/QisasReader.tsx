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
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { PageTransition } from "@/components/PageTransition";
import { goBackOrFallback } from "@/lib/navigation";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useContentLanguage, translateIslamicText, translateIslamicBatch } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";
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

const PROPHET_NAME_TRANSLATIONS: Record<string, { ur: string; gu: string; hi: string }> = {
  "prophet-adam": { ur: "حضرت آدم علیہ السلام", gu: "હઝરત આદમ (અ.સ.)", hi: "हज़रत आदम (अ.स.)" },
  "prophet-idris": { ur: "حضرت ادریس علیہ السلام", gu: "હઝરત ઇદરીસ (અ.સ.)", hi: "हज़रत इदरीस (अ.स.)" },
  "prophet-nuh": { ur: "حضرت نوح علیہ السلام", gu: "હઝરત નૂહ (અ.સ.)", hi: "हज़रत नूह (अ.स.)" },
  "prophet-hud": { ur: "حضرت ہود علیہ السلام", gu: "હઝરત હૂદ (અ.સ.)", hi: "हज़रत हूद (अ.स.)" },
  "prophet-saleh": { ur: "حضرت صالح علیہ السلام", gu: "હઝરત સાલેહ (અ.સ.)", hi: "हज़रत सालेह (अ.स.)" },
  "prophet-ibrahim": { ur: "حضرت ابراہیم علیہ السلام", gu: "હઝરત ઇબ્રાહીમ (અ.સ.)", hi: "हज़रत इब्राहीम (अ.स.)" },
  "prophet-ismail": { ur: "حضرت اسماعیل علیہ السلام", gu: "હઝરત ઇસ્માઇલ (અ.સ.)", hi: "हज़रत इस्माईल (अ.स.)" },
  "prophet-ishaq": { ur: "حضرت اسحاق علیہ السلام", gu: "હઝરત ઇસ્હાક (અ.સ.)", hi: "हज़रत इस्हाक़ (अ.स.)" },
  "prophet-yaqub": { ur: "حضرت یعقوب علیہ السلام", gu: "હઝરત યાકૂબ (અ.સ.)", hi: "हज़रत याक़ूब (अ.स.)" },
  "prophet-yusuf": { ur: "حضرت یوسف علیہ السلام", gu: "હઝરત યૂસુફ (અ.સ.)", hi: "हज़रत यूसुफ़ (अ.स.)" },
  "prophet-ayyub": { ur: "حضرت ایوب علیہ السلام", gu: "હઝરત અય્યૂબ (અ.સ.)", hi: "हज़रत अय्यूब (अ.स.)" },
  "prophet-shuayb": { ur: "حضرت شعیب علیہ السلام", gu: "હઝરત શુએબ (અ.સ.)", hi: "हज़रत शुऐब (अ.स.)" },
  "prophet-musa": { ur: "حضرت موسیٰ علیہ السلام", gu: "હઝરત મૂસા (અ.સ.)", hi: "हज़रत मूसा (अ.स.)" },
  "prophet-harun": { ur: "حضرت ہارون علیہ السلام", gu: "હઝરત હારૂન (અ.સ.)", hi: "हज़रत हारून (अ.स.)" },
  "prophet-dawud": { ur: "حضرت داؤد علیہ السلام", gu: "હઝરત દાઊદ (અ.સ.)", hi: "हज़रत दाऊद (अ.स.)" },
  "prophet-sulaiman": { ur: "حضرت سلیمان علیہ السلام", gu: "હઝરત સુલેમાન (અ.સ.)", hi: "हज़रत सुलेमान (अ.स.)" },
  "prophet-yunus": { ur: "حضرت یونس علیہ السلام", gu: "હઝરત યૂનુસ (અ.સ.)", hi: "हज़रत यूनुस (अ.स.)" },
  "prophet-ilyas": { ur: "حضرت الیاس علیہ السلام", gu: "હઝરત ઇલ્યાસ (અ.સ.)", hi: "हज़रत इलियास (अ.स.)" },
  "prophet-al-yasa": { ur: "حضرت الیسع علیہ السلام", gu: "હઝરત અલ-યસા (અ.સ.)", hi: "हज़रत अल-यसा (अ.स.)" },
  "prophet-dhul-kifl": { ur: "حضرت ذوالکفل علیہ السلام", gu: "હઝરત ઝુલ-કિફ્લ (અ.સ.)", hi: "हज़रत ज़ुल-किफ़्ल (अ.स.)" },
  "prophet-zakariyya": { ur: "حضرت زکریا علیہ السلام", gu: "હઝરત ઝકરિયા (અ.સ.)", hi: "हज़रत ज़करिया (अ.स.)" },
  "prophet-yahya": { ur: "حضرت یحییٰ علیہ السلام", gu: "હઝરત યાહ્યા (અ.સ.)", hi: "हज़रत याह्या (अ.स.)" },
  "prophet-isa": { ur: "حضرت عیسیٰ علیہ السلام", gu: "હઝરત ઈસા (અ.સ.)", hi: "हज़रत ईसा (अ.स.)" },
  "prophet-muhammad": { ur: "سیدنا محمد رسول اللہ ﷺ", gu: "હઝરત મુહમ્મદ ﷺ", hi: "हज़रत मुहम्मद ﷺ" },
};

export default function QisasReader() {
  const { prophetId } = useParams<{ prophetId: string }>();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [prophet, setProphet] = useState<ProphetStory | null>(null);
  const [allProphets, setAllProphets] = useState<ProphetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSizeState] = useState(16);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showFontSlider, setShowFontSlider] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  const { contentLang, isRtl } = useContentLanguage();
  const [translatedName, setTranslatedName] = useState("");
  const [translatedTitle, setTranslatedTitle] = useState("");
  const [translatedStory, setTranslatedStory] = useState("");
  const [translatedTags, setTranslatedTags] = useState<string[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    if (!prophet) return;

    // Check curated honorifics first
    const curated = (contentLang === 'ur' || contentLang === 'gu' || contentLang === 'hi')
      ? PROPHET_NAME_TRANSLATIONS[prophet.id]?.[contentLang]
      : null;

    if (contentLang === 'en') {
      setTranslatedName(prophet.name);
      setTranslatedTitle(prophet.title);
      setTranslatedStory(prophet.story);
      setTranslatedTags(prophet.tags || []);
      setIsTranslating(false);
      return;
    }

    let isMounted = true;
    setIsTranslating(true);
    if (curated) {
      setTranslatedName(curated);
    }

    const paragraphs = prophet.story.split("\n\n").filter(p => p.trim());

    Promise.all([
      curated ? Promise.resolve(curated) : translateIslamicText(prophet.name, contentLang),
      translateIslamicText(prophet.title, contentLang),
      translateIslamicBatch(paragraphs, contentLang),
      prophet.tags?.length ? translateIslamicBatch(prophet.tags, contentLang) : Promise.resolve([]),
    ])
      .then(([tName, tTitle, tParas, tTags]) => {
        if (isMounted) {
          setTranslatedName(tName);
          setTranslatedTitle(tTitle);
          setTranslatedStory(tParas.join("\n\n"));
          setTranslatedTags(tTags);
          setIsTranslating(false);
        }
      })
      .catch((err) => {
        console.warn("Qisas translation error:", err);
        if (isMounted) {
          setTranslatedName(curated || prophet.name);
          setTranslatedTitle(prophet.title);
          setTranslatedStory(prophet.story);
          setTranslatedTags(prophet.tags || []);
          setIsTranslating(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [prophet?.id, contentLang, prophet]);

  const eraLabels: Record<EraKey, string> = useMemo(() => {
    if (contentLang === 'ur') {
      return {
        "beginning-of-creation": "ابتدائے آفرینش",
        "pre-flood": "طوفانِ نوح سے قبل",
        patriarchal: "دورِ ابراہیمی",
        israelite: "بنی اسرائیل کا دور",
        "post-israelite": "مابعد بنی اسرائیل",
      };
    }
    if (contentLang === 'gu') {
      return {
        "beginning-of-creation": "શરૂઆતનો સમય",
        "pre-flood": "નૂહ પૂર પહેલાં",
        patriarchal: "ઇબ્રાહીમ દોર",
        israelite: "ઇઝરાયલી દોર",
        "post-israelite": "અન્ય પયગંબરો",
      };
    }
    if (contentLang === 'hi') {
      return {
        "beginning-of-creation": "सृष्टि का आरंभ",
        "pre-flood": "तूफ़ान-ए-नूह से पूर्व",
        patriarchal: "इब्राहीमी दौर",
        israelite: "बनी इस्राईल का दौर",
        "post-israelite": "अन्य नबी",
      };
    }
    return {
      "beginning-of-creation": t("qisasEraBeginning"),
      "pre-flood": t("qisasEraPreFlood"),
      patriarchal: t("qisasEraPatriarchal"),
      israelite: t("qisasEraIsraelite"),
      "post-israelite": t("qisasEraPostIsraelite"),
    };
  }, [contentLang, t]);

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

  const { toast } = useToast();

  const handleShare = async () => {
    const url = window.location.href;
    const title = prophet?.name ?? "";
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied to clipboard" });
    }
  };

  const handleBookmarkToggle = () => {
    if (!prophetId) return;
    const bookmarked = toggleBookmark(prophetId, "qisas");
    setIsBookmarked(bookmarked);
    toast({ title: bookmarked ? "Bookmarked" : "Bookmark removed" });
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
            className="my-4 p-4 bg-gradient-to-r from-[var(--accent)]/10 to-[var(--accent-2)]/10 border-l-4 border-[var(--accent)] rounded-r-lg cursor-pointer hover:from-[var(--accent)]/20 hover:to-[var(--accent-2)]/20 transition-all"
            onClick={() => handleQuranRefClick(paragraph)}
          >
            <p className="font-arabic text-lg text-foreground" dir="rtl">
              {paragraph}
            </p>
          </div>
        );
      }

      return (
        <p
          key={index}
          className={`mb-5 ${contentLang === 'ur' ? 'font-urdu leading-[2.35] py-1 text-right text-base sm:text-lg' : isRtl ? 'font-arabic leading-[2.1] text-right text-base sm:text-lg' : 'leading-[1.8]'}`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
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
            className="h-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-2)] transition-all duration-150"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        <div className="sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/50 z-40 safe-top">
          <div className="max-w-3xl mx-auto px-4 pt-3 pb-2 space-y-2.5">
            {/* Row 1: Back Button & Story Title & Action Buttons */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => goBackOrFallback(navigate, '/qisas')}
                  className="rounded-xl shrink-0"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="flex-1 min-w-0">
                  <h2
                    className={`text-base sm:text-lg font-semibold text-foreground truncate ${contentLang === 'ur' ? 'font-urdu text-right leading-[2.35]' : isRtl ? 'font-arabic text-right' : ''}`}
                    dir={isRtl ? 'rtl' : 'ltr'}
                  >
                    {translatedName || prophet.name}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowFontSlider((current) => !current)}
                  className="rounded-xl h-9 w-9"
                  title="Font Size"
                >
                  <Type className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleShare}
                  className="rounded-xl h-9 w-9"
                  title="Share"
                >
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBookmarkToggle}
                  className="rounded-xl h-9 w-9"
                  title="Bookmark"
                >
                  {isBookmarked ? (
                    <BookMarked className="w-4 h-4 text-[#D4AF37]" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Row 2: Full-Width Language Selector Bar */}
            <ContentLanguageBar fullWidth />
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
            className="w-full h-20 rounded-xl bg-gradient-to-br from-[var(--surface-2)] to-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-4 shadow-sm"
          >
            <span className="font-arabic text-3xl text-[var(--accent)]" dir="rtl">
              {prophet.arabicName}
            </span>
          </div>

          <h2
            className={`text-2xl sm:text-3xl font-bold text-foreground mb-2 ${contentLang === 'ur' ? 'font-urdu text-right leading-[2.35]' : isRtl ? 'font-arabic text-right' : ''}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {translatedName || prophet.name}
          </h2>
          <p
            className={`text-lg sm:text-xl text-muted-foreground mb-2 ${contentLang === 'ur' ? 'font-urdu text-right leading-[2.35]' : isRtl ? 'font-arabic text-right' : ''}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {translatedTitle || prophet.title}
          </p>
          <p className="font-arabic text-2xl text-foreground mb-4" dir="rtl">
            {prophet.arabicTitle}
          </p>

          <div className="inline-flex items-center mb-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium text-[var(--accent-text)] bg-[var(--accent-soft)] border border-[var(--border)] ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
              {eraLabels[prophet.era]}
            </span>
          </div>

          {prophet.quranMentions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2">
                {contentLang === 'ur' ? 'قرآن مجید میں تذکرہ:' : contentLang === 'gu' ? 'કુરાનમાં ઉલ્લેખ:' : contentLang === 'hi' ? 'क़ुरआन में ज़िक्र:' : t("qisasQuranMentions")}
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

          {(translatedTags.length ? translatedTags : prophet.tags).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {(translatedTags.length ? translatedTags : prophet.tags).map((tag) => (
                <Badge key={tag} variant="outline" className={`text-xs ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="text-sm text-muted-foreground mb-4">
            {contentLang === 'ur' ? 'سلسلہ انبیاء کرام' : contentLang === 'gu' ? 'પયગંબર નંબર' : contentLang === 'hi' ? 'पैग़म्बर क्रम' : t("qisasProphetOf")} {prophet.number} / {allProphets.length}
          </div>
        </div>

        <div
          ref={contentRef}
          className="max-w-3xl mx-auto px-4 py-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 220px)", paddingBottom: "160px" }}
        >
          {isTranslating ? (
            <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)]/60 backdrop-blur-sm space-y-3 animate-pulse text-center my-6">
              <div className="flex items-center justify-center gap-2 text-sm text-[var(--accent-text)] font-semibold">
                <Sparkles className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>
                  {contentLang === 'ur'
                    ? 'قصص الانبیاءؑ کا مبارک واقعہ اردو میں ترجمہ ہو رہا ہے...'
                    : contentLang === 'gu'
                    ? 'પયગંબરની મુબારક વાર્તાનો અનુવાદ થઈ રહ્યો છે...'
                    : contentLang === 'hi'
                    ? 'नबी का मुबारक क़िस्सा अनुवाद हो रहा है...'
                    : 'Translating prophet story...'}
                </span>
              </div>
              <div className="h-4 bg-muted/40 rounded w-3/4 mx-auto" />
              <div className="h-4 bg-muted/30 rounded w-5/6 mx-auto" />
              <div className="h-4 bg-muted/40 rounded w-2/3 mx-auto" />
            </div>
          ) : (
            <div
              className={`text-foreground ${contentLang === 'ur' ? 'font-urdu text-right leading-[2.35] text-lg' : isRtl ? 'font-arabic text-right leading-loose text-lg' : ''}`}
              dir={isRtl ? 'rtl' : 'ltr'}
              style={{ fontSize: `${fontSize}px` }}
            >
              {parseContent(translatedStory || prophet.story)}
            </div>
          )}
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
