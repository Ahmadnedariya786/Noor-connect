import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageTransition } from "@/components/PageTransition";
import { ProphetCard } from "@/components/qisas/ProphetCard";
import { goBackOrFallback } from "@/lib/navigation";
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
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [eraFilter, setEraFilter] = useState<EraFilter>("all");
  const [metadata, setMetadata] = useState<QisasMetadata | null>(null);
  const [prophets, setProphets] = useState<ProphetSummary[]>([]);
  const [loading, setLoading] = useState(true);

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

  const eraLabels: Record<EraFilter, string> = {
    all: t("all"),
    "beginning-of-creation": t("qisasEraBeginning"),
    "pre-flood": t("qisasEraPreFlood"),
    patriarchal: t("qisasEraPatriarchal"),
    israelite: t("qisasEraIsraelite"),
    "post-israelite": t("qisasEraPostIsraelite"),
  };

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
              <h1 className="text-2xl font-bold text-foreground">{t("qisas")}</h1>
              <p className="text-muted-foreground">{t("qisasDescription")}</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[32px] shadow-2xl shadow-emerald-900/20 mb-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 to-emerald-800" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#10B981]/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />
            <div className="absolute inset-0 bg-white/[0.02] backdrop-blur-[1px]" />

            <div className="relative z-10 p-8">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-[#e0c097]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90">
                  {t("qisas")}
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
                  {metadata?.totalProphets} {t("qisasProphets")}
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
            {(Object.keys(eraLabels) as EraFilter[]).map((era) => (
              <Button
                key={era}
                variant={eraFilter === era ? "default" : "outline"}
                size="sm"
                onClick={() => setEraFilter(era)}
                className={
                  eraFilter === era
                    ? "bg-[#10B981] text-white border-[#10B981]"
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
                <div className="text-2xl font-bold text-[#10B981]">
                  {metadata?.totalProphets}
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
                <div className="text-2xl font-bold text-emerald-500">
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
