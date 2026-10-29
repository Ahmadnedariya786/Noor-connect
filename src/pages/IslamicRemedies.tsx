import { useState, useMemo, useEffect } from "react";
import { AppBar } from "@/components/AppBar";
import { PageTransition } from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { m } from "framer-motion";
import { Heart, Sparkles, BookOpen, Quote, Target, Play, Copy, Check, X, ArrowRight, Search, HeartHandshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { moods, type Mood, type MoodContent } from "@/data/mood-data";
import { useGlobalQuran } from "@/lib/global-quran";
import { useToast } from "@/hooks/use-toast";
import { pickNonRepeatingIndex } from "@/lib/non-repeating-picker";
import { remedyGamification } from "@/lib/remedy-gamification";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useContentLanguage, translateIslamicText } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";

const storageKeyForMood = (moodId: string) => `dashboard-mood-remedy-${moodId}`;

const pickMoodIndex = (mood: Mood, exclude: number[] = []) =>
  pickNonRepeatingIndex({
    storageKey: storageKeyForMood(mood.id),
    length: mood.content.length,
    maxRecent: 3,
    exclude,
  });

const toCopyText = (item: MoodContent) =>
  `${item.arabic ? `${item.arabic}\n\n` : ""}${item.text}\n${item.reference}`;

const TYPE_STYLES: Record<string, { bg: string; icon: React.ReactNode }> = {
  surah: { bg: "bg-blue-500", icon: <BookOpen className="h-3 w-3" /> },
  ayah: { bg: "bg-[var(--accent)]", icon: <Quote className="h-3 w-3" /> },
  dua: { bg: "bg-purple-500", icon: <Heart className="h-3 w-3" /> },
  hadith: { bg: "bg-orange-500", icon: <Sparkles className="h-3 w-3" /> },
  dhikr: { bg: "bg-teal-500", icon: <Target className="h-3 w-3" /> },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035 } },
};

const moodCardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
};

const viewerTextVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

interface RemediesI18n {
  title: string;
  howFeeling: string;
  selectMoodDesc: string;
  searchPlaceholder: string;
  allTab: string;
  surahTab: string;
  ayahTab: string;
  duaTab: string;
  hadithTab: string;
  dhikrTab: string;
  playSurah: string;
  copy: string;
  copied: string;
  next: string;
  chooseDifferentMood: string;
  todaysRemedy: string;
  remedyCompleteToast: string;
  copiedToast: string;
  savedFavoriteToast: string;
  removedFavoriteToast: string;
  moods: Record<string, string>;
}

const REMEDIES_I18N: Record<string, RemediesI18n> = {
  en: {
    title: "Islamic Wellness & Remedies",
    howFeeling: "How are you feeling?",
    selectMoodDesc: "Select your mood to receive guidance from the Quran and Sunnah.",
    searchPlaceholder: "Search moods or remedies...",
    allTab: "All",
    surahTab: "Surah",
    ayahTab: "Ayah",
    duaTab: "Dua",
    hadithTab: "Hadith",
    dhikrTab: "Dhikr",
    playSurah: "Play Surah",
    copy: "Copy",
    copied: "Copied!",
    next: "Next",
    chooseDifferentMood: "Choose a different mood",
    todaysRemedy: "Today's Remedy",
    remedyCompleteToast: "Daily remedy complete! +25 XP",
    copiedToast: "Copied to clipboard",
    savedFavoriteToast: "Saved to favorites",
    removedFavoriteToast: "Removed from favorites",
    moods: {
      anxious: "Anxious",
      sad: "Sad",
      happy: "Happy",
      lost: "Lost",
      tired: "Tired",
      stressed: "Stressed",
      angry: "Angry",
      confused: "Confused",
      lonely: "Lonely",
      sick: "Sick",
      motivated: "Motivated",
    },
  },
  ar: {
    title: "السكينة والعلاج الإسلامي",
    howFeeling: "كيف تشعر اليوم؟",
    selectMoodDesc: "اختر حالتك لتتلقى إرشادات من القرآن والسنة النبوية.",
    searchPlaceholder: "ابحث في المشاعر أو الأدعية...",
    allTab: "الكل",
    surahTab: "سورة",
    ayahTab: "آية",
    duaTab: "دعاء",
    hadithTab: "حديث",
    dhikrTab: "ذكر",
    playSurah: "تشغيل السورة",
    copy: "نسخ",
    copied: "تم النسخ!",
    next: "التالي",
    chooseDifferentMood: "اختر حالة أخرى",
    todaysRemedy: "علاج اليوم",
    remedyCompleteToast: "تم إكمال علاج اليوم! +25 XP",
    copiedToast: "تم النسخ إلى الحافظة",
    savedFavoriteToast: "تم الحفظ في المفضلة",
    removedFavoriteToast: "تمت الإزالة من المفضلة",
    moods: {
      anxious: "قلق",
      sad: "حزين",
      happy: "سعيد",
      lost: "تائه",
      tired: "متعب",
      stressed: "مضغوط",
      angry: "غاضب",
      confused: "محتار",
      lonely: "وحيد",
      sick: "مريض",
      motivated: "متحمس",
    },
  },
  ur: {
    title: "اسلامی سکون و علاج",
    howFeeling: "آپ کیسا محسوس کر رہے ہیں؟",
    selectMoodDesc: "قرآن و سنت سے رہنمائی حاصل کرنے کے لیے اپنا موڈ منتخب کریں۔",
    searchPlaceholder: "موڈ یا علاج تلاش کریں...",
    allTab: "سب",
    surahTab: "سورۃ",
    ayahTab: "آیت",
    duaTab: "دعا",
    hadithTab: "حدیث",
    dhikrTab: "ذکر",
    playSurah: "سورۃ سنیں",
    copy: "کاپی",
    copied: "!کاپی ہو گیا",
    next: "اگلا",
    chooseDifferentMood: "مختلف موڈ منتخب کریں",
    todaysRemedy: "آج کا علاج",
    remedyCompleteToast: "آج کا علاج مکمل! +25 XP",
    copiedToast: "کلپ بورڈ پر کاپی ہو گیا",
    savedFavoriteToast: "پسندیدہ میں محفوظ کر لیا گیا",
    removedFavoriteToast: "پسندیدہ سے ہٹا دیا گیا",
    moods: {
      anxious: "بے چین",
      sad: "اداس",
      happy: "خوش",
      lost: "راہ گم",
      tired: "تھکا ہوا",
      stressed: "پریشان",
      angry: "غصے میں",
      confused: "الجھن زدہ",
      lonely: "تنہا",
      sick: "بیمار",
      motivated: "پرعزم",
    },
  },
  gu: {
    title: "ઇસ્લામિક ઉપચાર અને સુખાકારી",
    howFeeling: "તમે કેવું અનુભવી રહ્યા છો?",
    selectMoodDesc: "કુરાન અને સુન્નતમાંથી માર્ગદર્શન મેળવવા માટે તમારો મૂડ પસંદ કરો.",
    searchPlaceholder: "મૂડ અથવા ઉપાયો શોધો...",
    allTab: "બધા",
    surahTab: "સૂરા",
    ayahTab: "આયત",
    duaTab: "દુઆ",
    hadithTab: "હદીસ",
    dhikrTab: "ઝિક્ર",
    playSurah: "સૂરા ચલાવો",
    copy: "કૉપિ",
    copied: "કૉપિ થઈ ગયું!",
    next: "આગળ",
    chooseDifferentMood: "બીજો મૂડ પસંદ કરો",
    todaysRemedy: "આજનો ઉપાય",
    remedyCompleteToast: "દૈનિક ઉપાય પૂર્ણ! +25 XP",
    copiedToast: "ક્લિપબોર્ડ પર કૉપિ થઈ ગયું",
    savedFavoriteToast: "મનપસંદમાં સાચવ્યું",
    removedFavoriteToast: "મનપસંદમાંથી હટાવ્યું",
    moods: {
      anxious: "ચિંતિત",
      sad: "ઉદાસ",
      happy: "ખુશ",
      lost: "દિશાહીન",
      tired: "થાકેલું",
      stressed: "તણાવગ્રસ્ત",
      angry: "ગુસ્સામાં",
      confused: "મૂંઝવણમાં",
      lonely: "એકલવાયું",
      sick: "બીમાર",
      motivated: "પ્રેરિત",
    },
  },
  hi: {
    title: "इस्लामिक सुकून व उपचार",
    howFeeling: "आप कैसा महसूस कर रहे हैं?",
    selectMoodDesc: "क़ुरआन और सुन्नत से मार्गदर्शन पाने के लिए अपना मूड चुनें।",
    searchPlaceholder: "मूड या उपाय खोजें...",
    allTab: "सभी",
    surahTab: "सूरा",
    ayahTab: "आयत",
    duaTab: "दुआ",
    hadithTab: "हदीस",
    dhikrTab: "ज़िक्र",
    playSurah: "सूरा सुनें",
    copy: "कॉपी",
    copied: "कॉपी हो गया!",
    next: "अगला",
    chooseDifferentMood: "अलग मूड चुनें",
    todaysRemedy: "आज का उपाय",
    remedyCompleteToast: "दैनिक उपाय पूरा हुआ! +25 XP",
    copiedToast: "क्लिपबोर्ड पर कॉपी हो गया",
    savedFavoriteToast: "पसंदीदा में सहेजा गया",
    removedFavoriteToast: "पसंदीदा से हटाया गया",
    moods: {
      anxious: "चिंतित",
      sad: "उदास",
      happy: "प्रसन्न",
      lost: "दिशाहीन",
      tired: "थका हुआ",
      stressed: "तनावग्रस्त",
      angry: "क्रोधित",
      confused: "उलझन में",
      lonely: "अकेला",
      sick: "बीमार",
      motivated: "प्रेरित",
    },
  },
  bn: {
    title: "ইসলামিক নিরাময় ও সুস্থতা",
    howFeeling: "আপনি কেমন অনুভব করছেন?",
    selectMoodDesc: "কোরআন ও সুন্নাহ থেকে নির্দেশনা পেতে আপনার অনুভূতি নির্বাচন করুন।",
    searchPlaceholder: "অনুভূতি বা প্রতিকার খুঁজুন...",
    allTab: "সব",
    surahTab: "সূরা",
    ayahTab: "আয়াত",
    duaTab: "দোয়া",
    hadithTab: "হাদিস",
    dhikrTab: "যিকির",
    playSurah: "সূরা শুনুন",
    copy: "কপি",
    copied: "কপি হয়েছে!",
    next: "পরবর্তী",
    chooseDifferentMood: "অন্য অনুভূতি নির্বাচন করুন",
    todaysRemedy: "আজকের সমাধান",
    remedyCompleteToast: "আজকের প্রতিকার সম্পন্ন! +২৫ XP",
    copiedToast: "ক্লিপবোর্ডে কপি করা হয়েছে",
    savedFavoriteToast: "পছন্দতালিকায় সংরক্ষিত",
    removedFavoriteToast: "পছন্দতালিকা থেকে অপসারিত",
    moods: {
      anxious: "উদ্বিগ্ন",
      sad: "দুঃখিত",
      happy: "খুশি",
      lost: "দিশেহারা",
      tired: "ক্লান্ত",
      stressed: "চাপগ্রস্ত",
      angry: "ক্রোধান্বিত",
      confused: "বিভ্রান্ত",
      lonely: "একাকী",
      sick: "অসুস্থ",
      motivated: "অনুপ্রাণিত",
    },
  },
  ru: {
    title: "Исламское исцеление и покой",
    howFeeling: "Как вы себя чувствуете?",
    selectMoodDesc: "Выберите своё состояние, чтобы получить наставление из Корана и Сунны.",
    searchPlaceholder: "Поиск по состояниям или дуа...",
    allTab: "Все",
    surahTab: "Сура",
    ayahTab: "Аят",
    duaTab: "Дуа",
    hadithTab: "Хадис",
    dhikrTab: "Зикр",
    playSurah: "Включить суру",
    copy: "Копировать",
    copied: "Скопировано!",
    next: "Далее",
    chooseDifferentMood: "Выбрать другое состояние",
    todaysRemedy: "Напоминание дня",
    remedyCompleteToast: "Напоминание выполнено! +25 XP",
    copiedToast: "Скопировано в буфер",
    savedFavoriteToast: "Добавлено в избранное",
    removedFavoriteToast: "Удалено из избранного",
    moods: {
      anxious: "Тревога",
      sad: "Грусть",
      happy: "Радость",
      lost: "Растерянность",
      tired: "Усталость",
      stressed: "Стресс",
      angry: "Гнев",
      confused: "Замешательство",
      lonely: "Одиночество",
      sick: "Болезнь",
      motivated: "Мотивация",
    },
  },
  fr: {
    title: "Bien-être et remèdes islamiques",
    howFeeling: "Comment vous sentez-vous ?",
    selectMoodDesc: "Sélectionnez votre humeur pour recevoir des conseils du Coran et de la Sunna.",
    searchPlaceholder: "Rechercher une humeur ou un remède...",
    allTab: "Tout",
    surahTab: "Sourate",
    ayahTab: "Verset",
    duaTab: "Invocation",
    hadithTab: "Hadith",
    dhikrTab: "Dhikr",
    playSurah: "Écouter la sourate",
    copy: "Copier",
    copied: "Copié !",
    next: "Suivant",
    chooseDifferentMood: "Choisir une autre humeur",
    todaysRemedy: "Remède du jour",
    remedyCompleteToast: "Remède quotidien complété ! +25 XP",
    copiedToast: "Copié dans le presse-papiers",
    savedFavoriteToast: "Enregistré dans les favoris",
    removedFavoriteToast: "Retiré des favoris",
    moods: {
      anxious: "Anxieux",
      sad: "Triste",
      happy: "Heureux",
      lost: "Perdu",
      tired: "Fatigué",
      stressed: "Stressé",
      angry: "En colère",
      confused: "Confus",
      lonely: "Seul",
      sick: "Malade",
      motivated: "Motivé",
    },
  },
};

export default function IslamicRemedies() {
  const { language } = useLanguage();
  const strings = useMemo(() => {
    const code = (language || "en").toLowerCase().split("-")[0];
    return REMEDIES_I18N[code] || REMEDIES_I18N.en;
  }, [language]);

  const navigate = useNavigate();
  const [phase, setPhase] = useState<"prompt" | "viewing">("prompt");
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [activeIndexes, setActiveIndexes] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { playSurah, reciter } = useGlobalQuran();
  const { toast } = useToast();

  const dailyRemedy = useMemo(() => remedyGamification.getDailyRemedy(), [phase]);
  const favorites = useMemo(() => remedyGamification.getFavorites(), [phase]);

  const currentIndex = selectedMood ? activeIndexes[selectedMood.id] ?? 0 : 0;
  const currentItem = selectedMood ? selectedMood.content[currentIndex] ?? selectedMood.content[0] : null;
  const remedyId = selectedMood ? `${selectedMood.id}-${currentIndex}` : "";
  const isFav = currentItem && selectedMood ? remedyGamification.isFavorite(remedyId) : false;

  const { contentLang, isRtl } = useContentLanguage();
  const [translatedRemedyText, setTranslatedRemedyText] = useState("");

  useEffect(() => {
    if (!currentItem?.text) return;
    if (contentLang === 'en') {
      setTranslatedRemedyText(currentItem.text);
      return;
    }
    let isMounted = true;
    translateIslamicText(currentItem.text, contentLang).then(t => {
      if (isMounted) setTranslatedRemedyText(t);
    });
    return () => { isMounted = false; };
  }, [currentItem?.text, contentLang]);

  const getTypeStyle = (type: string) => TYPE_STYLES[type] || TYPE_STYLES.ayah;

  const filteredMoods = useMemo(() => {
    if (!searchQuery && typeFilter === "all") return moods;
    return moods.filter(m => {
      const localizedMood = strings.moods[m.id] || m.label;
      const matchesSearch = !searchQuery ||
        m.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        localizedMood.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.some(c => c.text.toLowerCase().includes(searchQuery.toLowerCase()) || c.reference.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || m.content.some(c => c.type === typeFilter);
      return matchesSearch && matchesType;
    });
  }, [searchQuery, typeFilter, strings.moods]);

  const handleMoodClick = (mood: Mood) => {
    setSelectedMood(mood);
    setActiveIndexes(prev => {
      if (typeof prev[mood.id] === "number") return prev;
      return { ...prev, [mood.id]: pickMoodIndex(mood) };
    });
    setPhase("viewing");
  };

  const handleNext = () => {
    if (!selectedMood) return;
    const nextIndex = pickMoodIndex(selectedMood, [currentIndex]);
    setActiveIndexes(prev => ({ ...prev, [selectedMood.id]: nextIndex }));
    if (currentItem) {
      remedyGamification.updateStats(selectedMood.id, currentItem.type);
    }
  };

  const handlePlaySurah = () => {
    if (!selectedMood || !currentItem?.surahNumber) return;
    if (!reciter) {
      toast({ title: "Reciter loading", description: "Please wait for the Quran player to initialize.", variant: "destructive" });
      return;
    }
    playSurah(currentItem.surahNumber, currentItem.reference, reciter);
    toast({ title: strings.playSurah, description: `Now playing ${currentItem.reference}.` });
  };

  const handleCopy = async () => {
    if (!currentItem) return;
    try {
      await navigator.clipboard.writeText(toCopyText(currentItem));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      toast({ title: strings.copiedToast });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard is not available on this device.", variant: "destructive" });
    }
  };

  const handleToggleFavorite = () => {
    if (!currentItem || !selectedMood) return;
    if (isFav) {
      remedyGamification.removeFromFavorites(remedyId);
      toast({ title: strings.removedFavoriteToast });
    } else {
      remedyGamification.addToFavorites({
        id: remedyId,
        moodId: selectedMood.id,
        text: currentItem.text,
        arabic: currentItem.arabic,
        reference: currentItem.reference,
        type: currentItem.type,
      });
      toast({ title: strings.savedFavoriteToast });
    }
  };

  const handleCloseViewer = () => {
    setPhase("prompt");
    setSelectedMood(null);
  };

  if (phase === "viewing" && selectedMood && currentItem) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gradient-to-b from-background via-primary/[0.03] to-primary/[0.08] flex flex-col">
          <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-5 py-6 space-y-6">
            <div className="flex items-center gap-2">
              <button onClick={handleCloseViewer} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-muted/70 transition-colors shrink-0">
                <X className="w-5 h-5" />
              </button>
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shrink-0 shadow-md", selectedMood.gradient)}>
                <selectedMood.icon className={cn("w-5 h-5", selectedMood.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{strings.moods[selectedMood.id] || selectedMood.label}</p>
                <p className="text-xs text-muted-foreground truncate">{currentItem.reference}</p>
              </div>
              <ContentLanguageBar compact />
              <button onClick={handleToggleFavorite} className={cn("w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0", isFav ? "bg-rose-500/15 text-rose-500" : "bg-muted text-muted-foreground hover:text-rose-500")}>
                <Heart className={cn("w-5 h-5", isFav && "fill-current")} />
              </button>
            </div>

            <m.div
              key={currentIndex}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="flex-1 flex flex-col justify-center space-y-6"
            >
              {currentItem.arabic && (
                <m.div variants={viewerTextVariants} className="rounded-3xl bg-gradient-to-br from-primary/[0.06] via-muted/40 to-transparent p-6 border border-primary/10 shadow-lg shadow-primary/[0.03]">
                  <p className="text-right font-arabic text-3xl md:text-4xl leading-[2.2] text-foreground" dir="rtl">
                    {currentItem.arabic}
                  </p>
                </m.div>
              )}

              <m.div variants={viewerTextVariants} className="bg-card border border-border/60 rounded-3xl p-5 space-y-4 shadow-sm">
                <p
                  className={`text-base leading-relaxed text-foreground/90 ${isRtl ? 'font-arabic text-right text-lg leading-loose' : ''}`}
                  dir={isRtl ? 'rtl' : 'ltr'}
                >
                  {translatedRemedyText || currentItem.text}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={cn("rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1", getTypeStyle(currentItem.type).bg)}>
                    {getTypeStyle(currentItem.type).icon}
                    {currentItem.type}
                  </div>
                  {currentItem.category && (
                    <Badge variant="outline" className="text-xs px-2">{currentItem.category}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground ml-auto">{currentItem.reference}</span>
                </div>
              </m.div>
            </m.div>

            <m.div variants={viewerTextVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-3 pt-2">
              {currentItem.type === "surah" && currentItem.surahNumber && (
                <button onClick={handlePlaySurah} className="flex items-center gap-2 rounded-full px-5 py-2.5 bg-[var(--accent)] hover:brightness-105 text-[var(--on-accent)] text-xs font-bold transition-all shadow-md shadow-black/20">
                  <Play className="w-3.5 h-3.5" /> {strings.playSurah}
                </button>
              )}
              <button onClick={handleCopy} className="flex items-center gap-2 rounded-full px-5 py-2.5 border border-border bg-card hover:bg-muted text-xs font-bold text-foreground transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? strings.copied : strings.copy}
              </button>
              <button onClick={handleNext} className="flex items-center gap-2 rounded-full px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors shadow-lg shadow-primary/20 ml-auto">
                {strings.next} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </button>
            </m.div>

            <m.div variants={viewerTextVariants} initial="hidden" animate="visible" className="text-center">
              <button onClick={handleCloseViewer} className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2">
                {strings.chooseDifferentMood}
              </button>
            </m.div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background pb-32">
        <AppBar
          title={strings.title}
          showBack={true}
          actions={
            <div className="flex items-center gap-2">
              <ContentLanguageBar compact />
              <button onClick={() => navigate("/remedy-favorites")} className="relative">
                <Heart className="w-5 h-5 text-foreground/80" />
                {favorites.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-xs font-bold text-white flex items-center justify-center">
                    {favorites.length > 9 ? "9+" : favorites.length}
                  </span>
                )}
              </button>
            </div>
          }
        />

        <div className="px-5 pt-4 space-y-5">
          {dailyRemedy && !dailyRemedy.completed && (
            <div className="bg-gradient-to-r from-primary/[0.12] to-primary/[0.06] border border-primary/20 rounded-2xl p-4 flex items-center gap-4 shadow-sm shadow-primary/5">
              <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-0.5">{strings.todaysRemedy}</p>
                <p className="text-sm font-medium text-foreground truncate">{dailyRemedy.content}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{dailyRemedy.reference}</p>
              </div>
              <button
                onClick={() => {
                  remedyGamification.completeDailyRemedy();
                  toast({ title: strings.remedyCompleteToast });
                }}
                className="shrink-0 w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center hover:bg-primary/25 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Check className="w-4 h-4 text-primary" />
              </button>
            </div>
          )}

          <div className="space-y-5">
            <div className="text-center py-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/20 to-primary/5 rounded-full flex items-center justify-center mb-3 border border-primary/10 shadow-inner">
                <HeartHandshake className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black text-foreground tracking-tight">
                {strings.howFeeling}
              </h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                {strings.selectMoodDesc}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {[
                  { id: "all", label: `${strings.allTab} (${moods.length})` },
                  { id: "surah", label: strings.surahTab },
                  { id: "ayah", label: strings.ayahTab },
                  { id: "dua", label: strings.duaTab },
                  { id: "hadith", label: strings.hadithTab },
                  { id: "dhikr", label: strings.dhikrTab },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setTypeFilter(id)}
                    className={cn(
                      "shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all border",
                      typeFilter === id
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card text-muted-foreground border-border/60 hover:border-primary/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={strings.searchPlaceholder}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full ps-10 pe-4 py-2 rounded-2xl bg-card border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            <m.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {filteredMoods.map(mood => {
                const Icon = mood.icon;
                return (
                  <m.button
                    key={mood.id}
                    variants={moodCardVariants}
                    onClick={() => handleMoodClick(mood)}
                    className="group flex flex-col items-center gap-3 p-5 rounded-3xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 hover:ring-2 hover:ring-primary/10 transition-all duration-300"
                  >
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-md",
                      mood.gradient
                    )}>
                      <Icon className={cn("w-7 h-7", mood.color)} />
                    </div>
                    <span className="text-xs font-bold text-foreground text-center leading-tight">
                      {strings.moods[mood.id] || mood.label}
                    </span>
                  </m.button>
                );
              })}
            </m.div>

            {filteredMoods.length === 0 && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No moods match your search. Try a different term.
              </div>
            )}

            <div className="flex gap-3 justify-center pt-1">
              <Button variant="ghost" size="sm" onClick={() => navigate("/remedy-favorites")} className="rounded-full text-xs gap-2">
                <Heart className="w-3.5 h-3.5" /> Saved ({favorites.length})
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}