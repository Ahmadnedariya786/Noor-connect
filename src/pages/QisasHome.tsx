import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";
import { ProphetCard } from "@/components/qisas/ProphetCard";
import { goBackOrFallback } from "@/lib/navigation";
import { getLastRead, getReadingProgress } from "@/lib/reading-storage";
import { useLanguage } from "@/contexts/LanguageContext-new";
import { useContentLanguage, translateIslamicText } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";
import {
  loadProphetList,
  loadQisasMetadata,
  type ProphetSummary,
  type QisasMetadata,
} from "@/lib/qisas";

type EraFilter =
  | "all"
  | "beginning-of-creation"
  | "pre-flood"
  | "patriarchal"
  | "israelite"
  | "post-israelite";

export default function QisasHome() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { contentLang, isRtl } = useContentLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [eraFilter, setEraFilter] = useState<EraFilter>("all");
  const [metadata, setMetadata] = useState<QisasMetadata | null>(null);
  const [prophets, setProphets] = useState<ProphetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [translatedMetaTitle, setTranslatedMetaTitle] = useState("");
  const [translatedMetaDesc, setTranslatedMetaDesc] = useState("");

  useEffect(() => {
    if (!metadata) return;
    if (contentLang === 'en') {
      setTranslatedMetaTitle(metadata.title);
      setTranslatedMetaDesc(metadata.description);
      return;
    }
    let isMounted = true;
    Promise.all([
      translateIslamicText(metadata.title, contentLang),
      translateIslamicText(metadata.description, contentLang),
    ]).then(([tTitle, tDesc]) => {
      if (isMounted) {
        setTranslatedMetaTitle(tTitle);
        setTranslatedMetaDesc(tDesc);
      }
    });
    return () => { isMounted = false; };
  }, [metadata, contentLang]);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [meta, list] = await Promise.all([
          loadQisasMetadata(),
          loadProphetList(),
        ]);
        setMetadata(meta);
        setProphets(list);
      } catch (error) {
        console.error("Failed to load Qisas data:", error);
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

  const eraLabels: Record<EraFilter, string> = useMemo(() => {
    if (contentLang === 'ur') {
      return {
        all: "تمام ادوار",
        "beginning-of-creation": "ابتدائے آفرینش",
        "pre-flood": "طوفانِ نوح سے قبل",
        patriarchal: "دورِ ابراہیمی",
        israelite: "بنی اسرائیل کا دور",
        "post-israelite": "مابعد بنی اسرائیل",
      };
    }
    if (contentLang === 'gu') {
      return {
        all: "બધા",
        "beginning-of-creation": "શરૂઆતનો સમય",
        "pre-flood": "નૂહ પૂર પહેલાં",
        patriarchal: "ઇબ્રાહીમ દોર",
        israelite: "ઇઝરાયલી દોર",
        "post-israelite": "અન્ય પયગંબરો",
      };
    }
    if (contentLang === 'hi') {
      return {
        all: "सभी",
        "beginning-of-creation": "सृष्टि का आरंभ",
        "pre-flood": "तूफ़ान-ए-नूह से पूर्व",
        patriarchal: "इब्राहीमी दौर",
        israelite: "बनी इस्राईल का दौर",
        "post-israelite": "अन्य नबी",
      };
    }
    return {
      all: t("all"),
      "beginning-of-creation": t("qisasEraBeginning"),
      "pre-flood": t("qisasEraPreFlood"),
      patriarchal: t("qisasEraPatriarchal"),
      israelite: t("qisasEraIsraelite"),
      "post-israelite": t("qisasEraPostIsraelite"),
    };
  }, [contentLang, t]);

  const searchPlaceholder = useMemo(() => {
    if (contentLang === 'ur') return "انبیاء کرام کے مبارک واقعات تلاش کریں...";
    if (contentLang === 'gu') return "પયગંબરોની વાતો શોધો...";
    if (contentLang === 'hi') return "नबियों की मुबारक दास्तानें खोजें...";
    return t("search");
  }, [contentLang, t]);

  const filteredProphets = useMemo(() => {
    let result = prophets;

    if (eraFilter !== "all") {
      result = result.filter((prophet) => prophet.era === eraFilter);
    }

    if (debouncedSearchTerm) {
      result = result.filter(
        (prophet) =>
          prophet.name.toLowerCase().includes(debouncedSearchTerm) ||
          prophet.arabicName.includes(debouncedSearchTerm) ||
          prophet.title.toLowerCase().includes(debouncedSearchTerm) ||
          prophet.tags.some((tag) => tag.toLowerCase().includes(debouncedSearchTerm))
      );
    }

    return result;
  }, [debouncedSearchTerm, eraFilter, prophets]);

  const handleProphetClick = (prophetId: string) => {
    navigate(`/qisas/${prophetId}`);
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background pb-24">
          <div className="max-w-6xl mx-auto px-4 py-6">
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
          {/* Header with Row 1 (Back + Title) and Row 2 (Full-Width Language Bar) */}
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => goBackOrFallback(navigate, '/services')}
                className="rounded-xl"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-foreground truncate">{t("qisas")}</h1>
                <p className="text-muted-foreground text-sm truncate">{t("qisasDescription")}</p>
              </div>
            </div>
            <ContentLanguageBar fullWidth />
          </div>

          {/* Continue Reading */}
          {(() => {
            const lastReadId = getLastRead("qisas");
            const lastReadProphet = lastReadId ? prophets.find(p => p.id === lastReadId) : null;
            if (lastReadProphet && !loading) {
              const progress = getReadingProgress(lastReadId!, "qisas");
              const continueLabel = contentLang === 'ur' ? 'مطالعہ جاری رکھیں' : contentLang === 'gu' ? 'વાંચન ચાલુ રાખો' : contentLang === 'hi' ? 'पढ़ना जारी रखें' : 'Continue Reading';
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card
                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors border-[var(--border)] bg-gradient-to-r from-[var(--surface-2)] to-transparent"
                    onClick={() => handleProphetClick(lastReadProphet.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-[var(--accent-soft)]">
                        <BookOpen className="w-5 h-5 text-[var(--accent)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-0.5">{continueLabel}</p>
                        <p className={`text-sm font-semibold truncate ${contentLang === 'ur' ? 'font-urdu' : ''}`}>{lastReadProphet.name}</p>
                        {progress > 0 && (
                          <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        )}
                      </div>
                      <BookOpen className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    </div>
                  </Card>
                </motion.div>
              );
            }
            return null;
          })()}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[32px] border border-[var(--border)] shadow-xl mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)]" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent)]/10 rounded-full blur-[20px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[var(--accent-2)]/10 rounded-full blur-[20px] translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-[var(--surface)]/10 backdrop-blur-[1px]" />

            <div className="relative z-10 p-8">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[var(--accent)]" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[var(--accent)]">
                  {t("qisas")}
                </span>
              </div>

              <h2
                className={`text-3xl font-bold text-[var(--text-primary)] mb-2 ${contentLang === 'ur' ? 'font-urdu text-right leading-[2.35]' : isRtl ? 'font-arabic text-right' : ''}`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {translatedMetaTitle || metadata?.title || "Stories of the Prophets"}
              </h2>
              <p className="font-arabic text-2xl text-[var(--text-secondary)] mb-4" dir="rtl">
                {metadata?.arabicTitle || "قصص الأنبياء"}
              </p>

              {(metadata?.author || metadata?.arabicAuthor) && (
                <div className="flex items-center gap-4 mb-4">
                  {metadata?.author && <span className="text-[var(--text-secondary)] text-sm">{metadata.author}</span>}
                  {metadata?.author && metadata?.arabicAuthor && <span className="text-muted-foreground text-sm">•</span>}
                  {metadata?.arabicAuthor && <span className="text-[var(--text-secondary)] text-sm">{metadata.arabicAuthor}</span>}
                </div>
              )}

              <p
                className={`text-[var(--text-secondary)] text-sm mb-6 ${contentLang === 'ur' ? 'font-urdu text-right text-base leading-[2.35]' : isRtl ? 'font-arabic text-right text-base' : ''}`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {translatedMetaDesc || metadata?.description || "Stories of the Prophets from Adam to Isa (peace be upon them all)."}
              </p>

              <div className="flex items-center gap-4">
                <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)]">
                  {metadata?.totalProphets || prophets.length || 24} {t("qisasProphets")}
                </Badge>
                <Badge className="bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] font-semibold">
                  EN • اردو • ગુજ • हिं
                </Badge>
              </div>
            </div>
          </motion.div>

          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {(Object.keys(eraLabels) as EraFilter[]).map((era) => (
              <Button
                key={era}
                variant={eraFilter === era ? "default" : "outline"}
                size="sm"
                onClick={() => setEraFilter(era)}
                className={
                  eraFilter === era
                    ? "bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]"
                    : ""
                }
              >
                {eraLabels[era]}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredProphets.map((prophet, index) => (
              <ProphetCard
                key={prophet.id}
                prophet={prophet}
                onClick={() => handleProphetClick(prophet.id)}
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent)]">
                  {metadata?.totalProphets || prophets.length || 24}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("qisasProphets")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-500">
                  {prophets.filter((prophet) => prophet.era === "beginning-of-creation").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("qisasEraBeginning")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-500">
                  {prophets.filter((prophet) => prophet.era === "pre-flood").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("qisasEraPreFlood")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">
                  {prophets.filter((prophet) => prophet.era === "patriarchal").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("qisasEraPatriarchal")}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[var(--accent)]">
                  {prophets.filter((prophet) => prophet.era === "israelite").length}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t("qisasEraIsraelite")}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
}
