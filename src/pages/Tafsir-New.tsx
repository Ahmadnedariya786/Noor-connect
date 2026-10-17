import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  Search,
  Sparkles,
  ChevronRight,
  MessageSquare,
  Bookmark,
  Share2,
  Filter,
  Edit3,
  History,
  FileText,
  Languages,
  MoreVertical,
  Type,
  Settings as SettingsIcon,
  ChevronDown,
  Info,
  Download,
  Wifi,
  WifiOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useI18n } from "@/hooks/useI18n";
import { PageTransition } from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { AppBar } from "@/components/AppBar";
import { useSettings } from "@/contexts/SettingsContext";
import { fetchSurahTafsir, TAFSIR_EDITIONS, type TafsirEdition } from "@/lib/tafsir";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Surah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface TafsirData {
  surah: number;
  ayah: number;
  text: string;
  arabic?: string;
  translation?: string;
}

interface SurahTafsir {
  surah: number;
  surahName: string;
  englishName: string;
  tafsirs: TafsirData[];
}


// Offline editions available locally
const OFFLINE_EDITIONS = [
  "en-tafisr-ibn-kathir",
  "ar-tafsir-ibn-kathir",
  "ur-tafseer-ibn-e-kaseer"
];

const Tafsir = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { t: ti18n } = useI18n();
  const { toast } = useToast();

  const [surahs, setSurahs] = useState<Surah[]>(() => {
    try {
      const cached = localStorage.getItem('quran-surahs-cache');
      if (cached) return JSON.parse(cached);
    } catch (error) {
      console.warn("localStorage cache load failed:", error);
    }
    return [];
  });

  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>(surahs);
  const [loading, setLoading] = useState(surahs.length === 0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [currentSurahTafsir, setCurrentSurahTafsir] = useState<SurahTafsir | null>(null);
  const [selectedEdition, setSelectedEdition] = useState<string>("en-tafisr-ibn-kathir");
  const [tafsirLoading, setTafsirLoading] = useState(false);
  const [bookmarks, setBookmarks] = useState<Array<{ surah: number, surahName: string }>>([]);
  const [searchTafsirQuery, setSearchTafsirQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [tafsirHistory, setTafsirHistory] = useState<Array<{ surah: number, surahName: string, timestamp: number }>>([]);
  const [personalNotes, setPersonalNotes] = useState<Record<string, string>>({});
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [currentAyahForNote, setCurrentAyahForNote] = useState<{ surah: number, ayah: number } | null>(null);
  const [activeTab, setActiveTab] = useState<"surahs" | "bookmarks" | "history">("surahs");
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl">("base");
  const [loadingFromOffline, setLoadingFromOffline] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { animationEnabled } = useSettings();

  const fontSizeClasses = {
    sm: "text-base leading-relaxed",
    base: "text-lg leading-[1.8]",
    lg: "text-xl leading-[1.8]",
    xl: "text-2xl leading-[1.8]"
  };

  useEffect(() => {
    const saved = localStorage.getItem('tafsir-bookmarks');
    if (saved) setBookmarks(JSON.parse(saved));

    const savedHistory = localStorage.getItem('tafsir-history');
    if (savedHistory) setTafsirHistory(JSON.parse(savedHistory));

    const savedNotes = localStorage.getItem('tafsir-notes');
    if (savedNotes) setPersonalNotes(JSON.parse(savedNotes));

    fetchSurahs();
  }, []);

  // Update filtered surahs whenever search query or surahs list changes (with debounce)
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  useEffect(() => {
    if (!surahs.length) return;

    const filtered = surahs.filter(
      (surah) =>
        surah.englishName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        surah.name.includes(debouncedSearchQuery) ||
        surah.number.toString().includes(debouncedSearchQuery)
    );
    setFilteredSurahs(filtered);
  }, [debouncedSearchQuery, surahs]);


  const fetchSurahs = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://api.alquran.cloud/v1/surah");
      const data = await response.json();
      setSurahs(data.data);
      // filteredSurahs will be updated by the useEffect above
      try { localStorage.setItem('quran-surahs-cache', JSON.stringify(data.data)); } catch (error) { console.warn("localStorage cache save failed:", error); }
    } catch (error) {
      console.error("Error fetching surahs:", error);
      toast({
        title: "Connection Error",
        description: "Failed To Load Surah List. Please Check Your Connection.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSurahSelect = async (surah: Surah) => {
    setSelectedSurah(surah);
    setTafsirLoading(true);
    setLoadingFromOffline(OFFLINE_EDITIONS.includes(selectedEdition));

    // Add to history
    const historyEntry = {
      surah: surah.number,
      surahName: surah.name,
      timestamp: Date.now()
    };

    setTafsirHistory(prev => {
      const filtered = prev.filter(h => h.surah !== surah.number);
      const newHistory = [historyEntry, ...filtered].slice(0, 10);
      try {
        localStorage.setItem('tafsir-history', JSON.stringify(newHistory));
      } catch (error) {
        console.warn("Failed to save history:", error);
      }
      return newHistory;
    });

    try {
      // Check cache first
      const cacheKey = `tafsir-surah-${selectedEdition}-${surah.number}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        setCurrentSurahTafsir(JSON.parse(cached));
        setTafsirLoading(false);
        setLoadingFromOffline(false);
        return;
      }

      // 1. Fetch complete Tafsir for the surah in ONE request (much faster)
      // 2. Fetch Arabic text & Translation for complete context (UX)
      const [tafsirData, quranData] = await Promise.all([
        fetchSurahTafsir(surah.number, selectedEdition),
        fetch(`https://api.alquran.cloud/v1/surah/${surah.number}/editions/quran-uthmani,en.sahih`).then(res => res.json())
      ]);

      if (!tafsirData || !quranData.data) {
        throw new Error("Failed to fetch complete data");
      }

      const arabicEdition = quranData.data[0];
      const translationEdition = quranData.data[1];

      // Merge Tafsir with Arabic and Translation for a "Premium" reading experience
      const arabicByAyah = new Map<number, string>();
      const translationByAyah = new Map<number, string>();

      if (Array.isArray(arabicEdition?.ayahs)) {
        arabicEdition.ayahs.forEach((a: any, idx: number) => {
          const n = Number(a?.numberInSurah ?? a?.number ?? idx + 1);
          if (Number.isFinite(n) && typeof a?.text === "string") {
            arabicByAyah.set(n, a.text);
          }
        });
      }

      if (Array.isArray(translationEdition?.ayahs)) {
        translationEdition.ayahs.forEach((a: any, idx: number) => {
          const n = Number(a?.numberInSurah ?? a?.number ?? idx + 1);
          if (Number.isFinite(n) && typeof a?.text === "string") {
            translationByAyah.set(n, a.text);
          }
        });
      }

      const mergedTafsirs: TafsirData[] = tafsirData.map((t, idx) => {
        const ayahNumber = Number(t.ayah ?? idx + 1);
        return {
          ...t,
          arabic: arabicByAyah.get(ayahNumber),
          translation: translationByAyah.get(ayahNumber),
        };
      });

      const surahTafsir: SurahTafsir = {
        surah: surah.number,
        surahName: surah.name,
        englishName: surah.englishName,
        tafsirs: mergedTafsirs
      };

      setCurrentSurahTafsir(surahTafsir);

      // Cache the result
      try {
        localStorage.setItem(cacheKey, JSON.stringify(surahTafsir));
      } catch (error) {
        console.warn("Failed to cache surah tafsir:", error);
      }
    } catch (error) {
      console.error("Error loading surah tafsir:", error);
      toast({
        title: "Error",
        description: "Failed to load Tafsir. Please check your internet.",
        variant: "destructive"
      });
    } finally {
      setTafsirLoading(false);
      setLoadingFromOffline(false);
    }
  };

  const handleBookmark = () => {
    if (!selectedSurah || !currentSurahTafsir) return;

    const bookmark = {
      surah: selectedSurah.number,
      surahName: selectedSurah.name
    };

    const exists = bookmarks.some(b => b.surah === bookmark.surah);

    if (exists) {
      setBookmarks(prev => prev.filter(b => b.surah !== bookmark.surah));
      toast({
        title: "Bookmark Removed",
        description: "Surah Tafsir has been removed from bookmarks"
      });
    } else {
      setBookmarks(prev => [...prev, bookmark]);
      toast({
        title: "Bookmarked",
        description: "Surah Tafsir has been bookmarked"
      });
    }

    try {
      const updated = exists ? bookmarks.filter(b => b.surah !== bookmark.surah) : [...bookmarks, bookmark];
      localStorage.setItem('tafsir-bookmarks', JSON.stringify(updated));
    } catch (error) {
      console.warn("Failed to save bookmarks:", error);
    }
  };

  const handleNote = (surah: number, ayah: number) => {
    setCurrentAyahForNote({ surah, ayah });
    setShowNotesEditor(true);
  };

  const saveNote = (note: string) => {
    if (!currentAyahForNote) return;

    const key = `${currentAyahForNote.surah}:${currentAyahForNote.ayah}`;
    const updatedNotes = { ...personalNotes, [key]: note };
    setPersonalNotes(updatedNotes);

    try {
      localStorage.setItem('tafsir-notes', JSON.stringify(updatedNotes));
    } catch (error) {
      console.warn("Failed to save notes:", error);
    }

    setShowNotesEditor(false);
    setCurrentAyahForNote(null);
    toast({
      title: "Note Saved",
      description: "Personal note has been saved"
    });
  };

  const filteredTafsirs = useMemo(() => {
    if (!currentSurahTafsir?.tafsirs) return [];
    if (!searchTafsirQuery) return currentSurahTafsir.tafsirs;

    return currentSurahTafsir.tafsirs.filter(tafsir =>
      tafsir.text?.toLowerCase().includes(searchTafsirQuery.toLowerCase())
    );
  }, [currentSurahTafsir, searchTafsirQuery]);


  const isBookmarked = selectedSurah &&
    bookmarks.some(b => b.surah === selectedSurah.number);

  const goBack = () => {
    if (currentSurahTafsir) {
      setCurrentSurahTafsir(null);
    } else {
      navigate('/services');
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-20" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}>
        <AppBar
          title={currentSurahTafsir ? currentSurahTafsir.englishName : selectedSurah ? selectedSurah.englishName : t("tafsir") || "Tafsir"}
          showBack={true}
          onBack={goBack}
          actions={
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" style={{ color: 'var(--accent)' }}>
                    <SettingsIcon className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72" style={{ background: 'var(--bg-elev)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
                  <div className="p-2">
                    <p className="text-xs font-semibold mb-2 px-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('appearance')}</p>
                    <div className="flex items-center justify-between px-2 py-1">
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{t('fontSize')}</span>
                      <div className="flex gap-1">
                        {(['sm', 'base', 'lg', 'xl'] as const).map((size) => (
                          <button
                            key={size}
                            onClick={() => setFontSize(size)}
                            className={cn(
                              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold border transition-all"
                            )}
                            style={fontSize === size ? {
                              background: 'var(--accent)',
                              color: 'var(--on-accent)',
                              borderColor: 'var(--accent)',
                            } : {
                              background: 'var(--surface-2)',
                              color: 'var(--text-secondary)',
                              borderColor: 'var(--border)',
                            }}
                          >
                            {size.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DropdownMenuSeparator style={{ background: 'var(--border)' }} />
                  <div className="p-2">
                    <p className="text-xs font-semibold mb-2 px-2 uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{t('tafsirEdition')}</p>
                    {TAFSIR_EDITIONS.map((edition) => (
                      <DropdownMenuItem
                        key={edition.id}
                        onClick={() => {
                          setSelectedEdition(edition.id);
                          if (selectedSurah) handleSurahSelect(selectedSurah);
                        }}
                        className="flex items-center justify-between rounded-xl py-2 px-2.5 cursor-pointer"
                        style={selectedEdition === edition.id ? {
                          background: 'var(--accent-soft)',
                          color: 'var(--accent-text)',
                        } : {
                          color: 'var(--text-primary)',
                        }}
                      >
                        <div className="flex flex-col text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{edition.name}</span>
                            {OFFLINE_EDITIONS.includes(edition.id) && (
                              <Badge className="text-[10px] px-1.5 py-0.5 flex items-center gap-1" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--border)' }}>
                                <Download className="w-2.5 h-2.5" />
                                Offline
                              </Badge>
                            )}
                          </div>
                          {edition.author && (
                            <span className="text-xs opacity-70">by {edition.author}</span>
                          )}
                        </div>
                        <span className="text-xs opacity-60 ml-2">{edition.language}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-10">
          {/* Dashboard Mode (Surah List) */}
          {!selectedSurah && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Modern Header Hero */}
              <div className="relative rounded-[2.5rem] bg-gradient-to-br from-[#115E59] via-[#0D9488] to-[#0891B2] p-8 shadow-2xl shadow-emerald-900/20 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-950/30 backdrop-blur-md flex items-center justify-center border border-emerald-400/30">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-white tracking-tight">{t('holyTafsir')}</h1>
                      <p className="text-emerald-100/70 text-sm font-medium">{t('exploreDepthsQuran')}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setActiveTab("history")}
                      className="bg-emerald-950/25 hover:bg-emerald-950/40 backdrop-blur-sm rounded-2xl p-3 border border-emerald-400/25 transition-all text-left group"
                    >
                      <History className="w-4 h-4 text-emerald-200 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-white text-xs font-bold uppercase tracking-tighter opacity-60">{t('history')}</p>
                      <p className="text-white text-lg font-black">{tafsirHistory.length}</p>
                    </button>
                    <button
                      onClick={() => setActiveTab("bookmarks")}
                      className="bg-emerald-950/25 hover:bg-emerald-950/40 backdrop-blur-sm rounded-2xl p-3 border border-emerald-400/25 transition-all text-left group"
                    >
                      <Bookmark className="w-4 h-4 text-emerald-200 mb-2 group-hover:scale-110 transition-transform" />
                      <p className="text-white text-xs font-bold uppercase tracking-tighter opacity-60">{t('saved')}</p>
                      <p className="text-white text-lg font-black">{bookmarks.length}</p>
                    </button>
                    <div className="bg-emerald-950/25 backdrop-blur-sm rounded-2xl p-3 border border-emerald-400/25 text-left">
                      <Edit3 className="w-4 h-4 text-emerald-200 mb-2" />
                      <p className="text-white text-xs font-bold uppercase tracking-tighter opacity-60">{t('notes')}</p>
                      <p className="text-white text-lg font-black">{Object.keys(personalNotes).length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Section */}
              <div className="sticky top-20 z-20 transition-all duration-300 space-y-4">
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] transition-colors" />
                  <Input
                    placeholder={t('searchBySurahNameOrNumber')}
                    className="h-14 pl-12 rounded-2xl border text-base"
                    style={{
                      background: 'var(--bg-elev)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                    }}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--surface-2)] transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4 text-[var(--text-secondary)] rotate-180" />
                    </button>
                  )}
                </div>

                {/* Tafsir Author Selector - Visible UI */}
                <div
                  className="rounded-3xl p-5 shadow-sm border flex flex-col gap-3"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                  }}
                >
                  <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--text-primary)' }}>
                    <Languages className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                    <span>{t('selectTafsirAuthor')}</span>
                  </div>
                  <Select
                    value={selectedEdition}
                    onValueChange={(value) => {
                      setSelectedEdition(value);
                      if (selectedSurah) handleSurahSelect(selectedSurah);
                    }}
                  >
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue placeholder={t('chooseTafsir')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl max-h-80 overflow-y-auto">
                      {TAFSIR_EDITIONS.map((edition) => (
                        <SelectItem key={edition.id} value={edition.id} className="rounded-xl py-3 px-3">
                          <div className="flex flex-col gap-1 w-full text-left">
                            <span className="font-bold text-sm text-[var(--text-primary)] leading-tight">{edition.name}</span>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: 'var(--accent-soft)',
                                  color: 'var(--accent-text)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {edition.language}
                              </span>
                              {OFFLINE_EDITIONS.includes(edition.id) && (
                                <span
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                                  style={{
                                    background: 'var(--accent-soft)',
                                    color: 'var(--accent-text)',
                                    border: '1px solid var(--border)',
                                  }}
                                >
                                  <Download className="w-3 h-3" />
                                  Offline
                                </span>
                              )}
                              {edition.author && (
                                <span className="text-xs text-[var(--text-secondary)]">by {edition.author}</span>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Navigation Tabs */}
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="w-full p-1 rounded-xl h-12" style={{ background: 'var(--bg-elev)', border: '1px solid var(--border)' }}>
                  <TabsTrigger
                    value="surahs"
                    className="flex-1 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-[var(--accent-soft)] data-[state=active]:text-[var(--accent-text)] text-[var(--text-secondary)]"
                  >
                    {t('allSurahs')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="bookmarks"
                    className="flex-1 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-[var(--accent-soft)] data-[state=active]:text-[var(--accent-text)] text-[var(--text-secondary)]"
                  >
                    {t('bookmarks')}
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="flex-1 rounded-lg text-xs font-bold transition-all data-[state=active]:bg-[var(--accent-soft)] data-[state=active]:text-[var(--accent-text)] text-[var(--text-secondary)]"
                  >
                    {t('history')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="surahs" className="mt-6 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {loading ? (
                      // Skeleton loader
                      Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-2xl border" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)' }} />
                      ))
                    ) : filteredSurahs.length === 0 ? (
                      <div className="text-center py-12 px-6 rounded-3xl border border-dashed" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
                          <Search className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('noSurahsFound')}</h3>
                        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t('tryAdjustingSearch')}</p>
                      </div>
                    ) : (
                      filteredSurahs.map((surah) => (
                        <button
                          key={surah.number}
                          onClick={() => handleSurahSelect(surah)}
                          className="group relative flex items-center p-5 rounded-2xl border transition-all text-left active:scale-[0.99]"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            boxShadow: 'inset 0 1px 0 var(--card-sheen)',
                          }}
                        >
                          <div
                            className="relative w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all overflow-hidden shrink-0"
                            style={{
                              background: 'var(--accent-soft)',
                              color: 'var(--accent-text)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            <span className="relative z-10">{surah.number}</span>
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <h3 className="font-bold text-base truncate transition-colors" style={{ color: 'var(--text-primary)' }}>
                              {surah.englishName}
                            </h3>
                            <p className="text-xs font-medium truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {surah.englishNameTranslation} • {surah.numberOfAyahs} {t('ayahs')}
                            </p>
                          </div>
                          <div className="text-right flex flex-col items-end shrink-0 ml-3">
                            <span className="font-arabic text-lg font-bold" style={{ color: 'var(--accent-text)' }}>{surah.name}</span>
                            <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-secondary)' }}>{surah.revelationType}</span>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="bookmarks" className="mt-6">
                  {bookmarks.length === 0 ? (
                    <div className="text-center py-12 px-6 rounded-3xl border border-dashed" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
                        <Bookmark className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>No bookmarks yet</h3>
                      <p className="text-sm max-w-[200px] mx-auto mt-2" style={{ color: 'var(--text-secondary)' }}>Save surahs you read frequently for quick access.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {bookmarks.map((bookmark) => (
                        <button
                          key={bookmark.surah}
                          onClick={() => {
                            const s = surahs.find(x => x.number === bookmark.surah);
                            if (s) handleSurahSelect(s);
                          }}
                          className="flex items-center p-4 rounded-2xl border transition-all text-left"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            boxShadow: 'inset 0 1px 0 var(--card-sheen)',
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
                            style={{
                              background: 'var(--accent-soft)',
                              color: 'var(--accent-text)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {bookmark.surah}
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{bookmark.surahName}</h3>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t('bookmarked')}</p>
                          </div>
                          <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="history" className="mt-6">
                  {tafsirHistory.length === 0 ? (
                    <div className="text-center py-12 px-6 rounded-3xl border border-dashed" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
                        <History className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
                      </div>
                      <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>{t('noHistoryAvailable')}</h3>
                      <p className="text-sm max-w-[200px] mx-auto mt-2" style={{ color: 'var(--text-secondary)' }}>{t('startExploringTafsir')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {tafsirHistory.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            const s = surahs.find(x => x.number === item.surah);
                            if (s) handleSurahSelect(s);
                          }}
                          className="flex items-center p-4 rounded-2xl border transition-all text-left"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            boxShadow: 'inset 0 1px 0 var(--card-sheen)',
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0"
                            style={{
                              background: 'var(--surface-2)',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border)',
                            }}
                          >
                            {item.surah}
                          </div>
                          <div className="ml-4 flex-1">
                            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{item.surahName}</h3>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{new Date(item.timestamp).toLocaleDateString()}</p>
                          </div>
                          <ChevronRight className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Reader Mode (Tafsir Content) */}
          {selectedSurah && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              {/* Reader Header Card */}
              <div
                className="relative rounded-3xl p-6 overflow-hidden border"
                style={{
                  background: 'var(--surface)',
                  borderColor: 'var(--border)',
                  boxShadow: 'inset 0 1px 0 var(--card-sheen), 0 10px 30px rgba(0,0,0,0.35)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-lg"
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--on-accent)',
                        boxShadow: '0 4px 16px var(--accent-glow)',
                      }}
                    >
                      {selectedSurah.number}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{selectedSurah.englishName}</h2>
                      <p className="text-xs font-bold uppercase tracking-widest mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                        {selectedSurah.revelationType} • {selectedSurah.numberOfAyahs} {t('ayahs')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl transition-all"
                      style={isBookmarked ? { background: 'var(--accent-soft)', color: 'var(--accent-text)' } : { color: 'var(--text-secondary)' }}
                      onClick={handleBookmark}
                    >
                      <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-current")} />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-xl" style={{ color: 'var(--text-secondary)' }}>
                      <Share2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <Separator className="mb-4" style={{ background: 'var(--border)' }} />

                <div className="flex flex-wrap items-center gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl h-10 px-4"
                        style={{
                          background: 'var(--bg-elev)',
                          borderColor: 'var(--border)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <Languages className="w-4 h-4 mr-2" style={{ color: 'var(--accent)' }} />
                        {TAFSIR_EDITIONS.find(e => e.id === selectedEdition)?.name.split(' ')[0] || "Author"}
                        <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-72 rounded-2xl max-h-80 overflow-y-auto"
                      style={{
                        background: 'var(--bg-elev)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {TAFSIR_EDITIONS.map((edition) => (
                        <DropdownMenuItem
                          key={edition.id}
                          onClick={() => {
                            setSelectedEdition(edition.id);
                            if (selectedSurah) handleSurahSelect(selectedSurah);
                          }}
                          className="flex items-center justify-between py-2.5 px-3 rounded-xl cursor-pointer"
                          style={selectedEdition === edition.id ? {
                            background: 'var(--accent-soft)',
                            color: 'var(--accent-text)',
                          } : {
                            color: 'var(--text-primary)',
                          }}
                        >
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm">{edition.name}</span>
                              {OFFLINE_EDITIONS.includes(edition.id) && (
                                <Badge className="text-[10px] flex items-center gap-1" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)', border: '1px solid var(--border)' }}>
                                  <Download className="w-2.5 h-2.5" />
                                  Offline
                                </Badge>
                              )}
                            </div>
                            {edition.author && (
                              <span className="text-xs opacity-70">by {edition.author}</span>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{edition.language}</Badge>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <Input
                      placeholder="Search in Tafsir..."
                      className="h-10 pl-9 rounded-xl border text-sm"
                      style={{
                        background: 'var(--bg-elev)',
                        borderColor: 'var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      value={searchTafsirQuery}
                      onChange={(e) => setSearchTafsirQuery(e.target.value)}
                    />
                  </div>
                </div>

              </div>

              {/* Loading State for Tafsir */}
              {tafsirLoading && (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 animate-spin" style={{ borderColor: 'var(--accent-soft)', borderTopColor: 'var(--accent)' }} />
                    <BookOpen className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('fetchingWisdom')}</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{t('loadingComprehensiveTafsir')} {selectedSurah.englishName}...</p>
                    {loadingFromOffline && (
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Download className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                        <p className="text-xs font-medium" style={{ color: 'var(--accent-text)' }}>Loading from offline storage</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tafsir Content List */}
              <div className="space-y-8">
                {filteredTafsirs.map((tafsir: TafsirData, idx) => {
                  const noteKey = `${tafsir.surah}:${tafsir.ayah}`;
                  const hasNote = personalNotes[noteKey];
                  const cardContent = (
                    <>
                      <div className="group relative">
                        <div
                          className="rounded-3xl border overflow-hidden"
                          style={{
                            background: 'var(--surface)',
                            borderColor: 'var(--border)',
                            boxShadow: 'inset 0 1px 0 var(--card-sheen), 0 10px 30px rgba(0,0,0,0.35)',
                          }}
                        >
                          {/* Ayah Reference Badge */}
                          <div
                            className="flex items-center justify-between px-6 py-4 border-b"
                            style={{
                              background: 'var(--surface-2)',
                              borderColor: 'var(--border)',
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md"
                                style={{
                                  background: 'var(--accent)',
                                  color: 'var(--on-accent)',
                                }}
                              >
                                {tafsir.ayah}
                              </span>
                              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>{t('ayah')} {tafsir.ayah}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl transition-colors"
                                style={hasNote ? { background: 'var(--accent-soft)', color: 'var(--accent-text)' } : { color: 'var(--text-secondary)' }}
                                onClick={() => handleNote(tafsir.surah, tafsir.ayah)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="p-6 md:p-8 space-y-8">
                            {/* Arabic Text Section */}
                            {tafsir.arabic && (
                              <div className="space-y-4">
                                <p
                                  className="text-2xl md:text-3xl text-right leading-[2.4] font-arabic"
                                  dir="rtl"
                                  style={{ color: 'var(--text-primary)', fontFamily: 'inherit' }}
                                >
                                  {tafsir.arabic}
                                </p>
                                {tafsir.translation && (
                                  <p
                                    className="text-base md:text-lg italic leading-relaxed pl-4 py-1.5"
                                    style={{
                                      color: 'var(--text-secondary)',
                                      borderLeft: '3px solid var(--accent)',
                                    }}
                                  >
                                    {tafsir.translation}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Tafsir Commentary Section */}
                            <div className="space-y-5">
                              <div className="flex items-center gap-2">
                                <Separator className="flex-1" style={{ background: 'var(--border)' }} />
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase tracking-widest font-bold px-3 py-1"
                                  style={{
                                    color: 'var(--accent-text)',
                                    borderColor: 'var(--border)',
                                    background: 'var(--surface-2)',
                                  }}
                                >
                                  {t('tafsirCommentary')}
                                </Badge>
                                <Separator className="flex-1" style={{ background: 'var(--border)' }} />
                              </div>

                              <div
                                className={cn(
                                  "text-justify leading-relaxed",
                                  fontSizeClasses[fontSize as keyof typeof fontSizeClasses] || fontSizeClasses.base
                                )}
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {tafsir.text}
                              </div>
                            </div>

                            {/* Personal Note Section */}
                            {hasNote && (
                              <div
                                className="p-5 rounded-2xl border space-y-2 relative overflow-hidden"
                                style={{
                                  background: 'var(--surface-2)',
                                  borderColor: 'var(--border)',
                                }}
                              >
                                <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--accent-text)' }}>
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {t('myReflection')}
                                </div>
                                <p className="text-sm italic leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                  {personalNotes[noteKey]}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  );

                  return animationEnabled ? (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative"
                    >
                      {cardContent}
                    </motion.div>
                  ) : (
                    <div key={idx} className="group relative">{cardContent}</div>
                  );
                })}
              </div>

              {/* No Results in Search */}
              {!tafsirLoading && filteredTafsirs.length === 0 && (
                <div className="text-center py-12 px-6 rounded-3xl border border-dashed" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface-2)' }}>
                    <Search className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
                  </div>
                  <h3 className="font-bold" style={{ color: 'var(--text-primary)' }}>No matches found</h3>
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Try searching for different keywords within this Tafsir.</p>
                </div>
              )}
            </div>
          )}

          {/* Note Editor Dialog */}
          <Dialog open={showNotesEditor} onOpenChange={setShowNotesEditor}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem]" style={{ background: 'var(--bg-elev)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                    <Edit3 className="w-5 h-5" />
                  </div>
                  Ayah Note
                </DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="p-3 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-secondary)' }}>Source Verse</p>
                  <p className="text-sm font-medium line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {currentAyahForNote && currentSurahTafsir?.tafsirs.find(t => t.ayah === currentAyahForNote.ayah)?.text}
                  </p>
                </div>
                <Textarea
                  placeholder="Reflect on this ayah..."
                  defaultValue={currentAyahForNote ? personalNotes[`${currentAyahForNote.surah}:${currentAyahForNote.ayah}`] || "" : ""}
                  className="min-h-[150px] rounded-2xl text-base"
                  style={{
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setShowNotesEditor(false)}
                  className="rounded-xl"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
                    if (textarea) saveNote(textarea.value);
                  }}
                  className="rounded-xl font-bold"
                  style={{
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                  }}
                >
                  Save Reflection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>



        </div>
      </div>
    </PageTransition>
  );
};

export default Tafsir;
