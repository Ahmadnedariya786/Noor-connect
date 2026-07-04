import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, BookOpen, Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getHadithBookData } from "@/lib/hadith";
import type { EnhancedHadith } from "@/data/hadith-collections";

export function HadithDetail() {
  const { collection, book, hadithNumber } = useParams<{ collection: string; book: string; hadithNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [hadith, setHadith] = useState<EnhancedHadith | null>(location.state?.hadith ?? null);
  const [loading, setLoading] = useState(!hadith);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (hadith) return;

    async function loadHadith() {
      if (!collection || !book || !hadithNumber) return;
      setLoading(true);
      try {
        const data = await getHadithBookData(collection, book);
        if (Array.isArray(data)) {
          const found = data.find(
            (h) => String(h.hadithNumber) === hadithNumber || String(h.id) === hadithNumber
          );
          if (found) setHadith(found);
        }
      } catch (err) {
        console.warn("Failed to load hadith detail:", err);
      } finally {
        setLoading(false);
      }
    }

    loadHadith();
  }, [collection, book, hadithNumber, hadith]);

  const handleCopy = async () => {
    if (!hadith) return;
    const text = `${hadith.arabic}\n\n${hadith.englishTranslation || ""}\n\n— ${hadith.collection ?? collection} (${hadith.hadithNumber})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!hadith) return;
    const text = `${hadith.arabic}\n\n${hadith.englishTranslation || ""}\n\n— ${hadith.collection ?? collection} (${hadith.hadithNumber})`;
    try {
      await navigator.share({ title: "Hadith", text });
    } catch {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          <div className="h-8 w-32 bg-muted rounded-lg animate-pulse" />
          <div className="h-48 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!hadith) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Hadith Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested hadith could not be found.</p>
          <Button onClick={() => navigate(`/hadith/collections/${collection}/${book}`)}>Back to Book</Button>
        </div>
      </div>
    );
  }

  const tags = Array.isArray(hadith.tags) ? hadith.tags : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Hadith Detail</h1>
            <p className="text-sm text-muted-foreground">
              {hadith.collection ?? collection} — {hadith.bookName ?? `Book ${book}`} (#{hadith.hadithNumber})
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleCopy} className="rounded-xl">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleShare} className="rounded-xl">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="border-border/50">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline">#{hadith.hadithNumber}</Badge>
              {hadith.grade && <Badge variant="secondary">{hadith.grade}</Badge>}
            </div>

            <div className="glass-card p-6 rounded-xl">
              <p className="text-2xl font-arabic text-right leading-loose text-foreground" dir="rtl">
                {hadith.arabic}
              </p>
            </div>

            {hadith.englishTranslation && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Translation</h3>
                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                  {hadith.englishTranslation}
                </p>
              </div>
            )}

            {hadith.narrator && (
              <p className="text-sm font-semibold text-primary">Narrated by: {hadith.narrator}</p>
            )}

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div><span className="font-medium text-foreground">Collection:</span> {hadith.collection ?? collection}</div>
              {hadith.chapterName && <div><span className="font-medium text-foreground">Chapter:</span> {hadith.chapterName}</div>}
              {hadith.bookName && <div><span className="font-medium text-foreground">Book:</span> {hadith.bookName}</div>}
              <div><span className="font-medium text-foreground">Hadith Number:</span> {hadith.hadithNumber}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
