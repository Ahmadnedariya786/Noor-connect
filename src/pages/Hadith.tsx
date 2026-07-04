import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Share2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import hadithData from "../data/hadith.json";
import { getDailyHadith as getDailyHadithFromCollections } from "@/lib/hadith";
import { PageTransition } from "@/components/PageTransition";

interface HadithData {
  hadith: string;
  translation?: string;
  book: string;
  number: string;
}

const Hadith = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [hadith, setHadith] = useState<HadithData | null>(null);
  const [loading, setLoading] = useState(true);

  // Emergency fallback array
  const fallbackHadiths = [
    { 
      hadith: "خيركم من تعلم القرآن وعلمه", 
      translation: "The best among you are those who learn the Quran and teach it.",
      book: "Sahih Bukhari", 
      number: "5027" 
    },
    { 
      hadith: "إنما الأعمال بالنيات", 
      translation: "Actions are but by intentions.",
      book: "Sahih Bukhari", 
      number: "1" 
    },
    { 
      hadith: "الدين النصيحة", 
      translation: "Religion is sincerity.",
      book: "Sahih Muslim", 
      number: "55" 
    }
  ];

  const fetchHadith = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const cachedDate = localStorage.getItem("lastHadithDate");
    const cachedData = localStorage.getItem("lastHadithData");

    // If we have today's hadith cached, use it
    if (cachedDate === today && cachedData) {
      try {
        setHadith(JSON.parse(cachedData));
        setLoading(false);
        return;
      } catch (e) {
        console.error("Error parsing cached hadith:", e);
      }
    }

    // Otherwise, pick a random hadith from local data
    setLoading(true);
    
    try {
      const importedHadith = await getDailyHadithFromCollections();
      let finalData: HadithData;

      if (importedHadith) {
        finalData = {
          hadith: importedHadith.arabic || importedHadith.arabicPlain || "No hadith text available",
          translation: importedHadith.englishTranslation || "",
          book: importedHadith.collection.replace(/[-_]/g, " "),
          number: String(importedHadith.hadithNumber || importedHadith.id),
        };
      } else {
        const randomIdx = Math.floor(Math.random() * hadithData.length);
        const item = hadithData[randomIdx];
        finalData = {
          hadith: item.text || 'No hadith text available',
          translation: item.translation || '',
          book: item.source || 'Unknown',
          number: String(item.number || randomIdx + 1),
        };
      }
      
      setHadith(finalData);
      localStorage.setItem("lastHadithDate", today);
      localStorage.setItem("lastHadithData", JSON.stringify(finalData));
      setLoading(false);
    } catch (e) {
      console.error('Hadith Selection Error:', e);
      // Emergency fallback
      const fallback = fallbackHadiths[Math.floor(Math.random() * fallbackHadiths.length)];
      const finalData = {
        hadith: fallback.hadith,
        translation: fallback.translation,
        book: fallback.book,
        number: fallback.number,
      };
            
      setHadith(finalData);
      localStorage.setItem("lastHadithDate", today);
      localStorage.setItem("lastHadithData", JSON.stringify(finalData));
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHadith();
  }, []);

  const handleShare = async () => {
    if (hadith) {
      const shareText = `"${hadith.hadith}"\n\nSource: ${hadith.book} #${hadith.number}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: "Hadith of the Day",
            text: shareText,
          });
        } catch (error) {
          console.error("Error sharing:", error);
        }
      } else {
        navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard",
          description: "Hadith has been copied to your clipboard",
        });
      }
    }
  };

  return (
    <PageTransition>
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Islamic geometric pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4af37' fill-opacity='1'%3E%3Cpath d='M30 30l15-15v30L30 30zm0 0L15 15v30l15-15z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="rounded-full backdrop-blur-sm bg-card/50 hover:bg-card/80 border border-border/50"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-serif">حديث اليوم</h1>
            <p className="text-sm text-muted-foreground">Daily Hadith</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-gold flex items-center justify-center shadow-glow">
            <BookOpen className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>

        {loading ? (
          <Card className="p-12 backdrop-blur-sm bg-card/80 border-border/50">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-gold animate-pulse" />
                <Loader2 className="w-8 h-8 animate-spin text-primary absolute top-1/2 inset-inline-start-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-muted-foreground">Loading Hadith...</p>
            </div>
          </Card>
        ) : hadith ? (
          <div className="space-y-4">
            {/* Main Hadith Card */}
            <Card className="relative overflow-hidden border-0 shadow-elegant max-h-[500px] overflow-y-auto">
              <div className="absolute inset-0 bg-gradient-primary" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
              
              <div className="relative p-8 text-primary-foreground">
                <div className="space-y-6">
                  {/* Header icon */}
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center border border-primary-foreground/30">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h2 className="text-sm uppercase tracking-widest opacity-90 font-medium">
                      Hadith of the Day
                    </h2>
                  </div>

                  {/* Hadith text */}
                  <blockquote className="text-lg leading-relaxed text-center font-serif italic">
                    "{hadith.hadith}"
                  </blockquote>

                  {/* Translation */}
                  {hadith.translation && (
                    <p className="text-base leading-relaxed text-center opacity-90 mt-4 px-2">
                      {hadith.translation}
                    </p>
                  )}

                  {/* Source */}
                  {hadith.book && (
                    <div className="pt-4 border-t border-primary-foreground/20 text-center">
                      <p className="text-xs opacity-75 tracking-wide">
                        {hadith.number ? `Reference: ${hadith.book} #${hadith.number}` : hadith.book}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleShare}
                className="flex-1 backdrop-blur-sm bg-card/80 text-foreground hover:bg-card border border-border/50"
                variant="outline"
              >
                <Share2 className="w-4 h-4 me-2" />
                Share Hadith
              </Button>
              <Button
                onClick={() => {
                  localStorage.removeItem("lastHadithDate");
                  fetchHadith();
                }}
                className="backdrop-blur-sm bg-card/80 text-foreground hover:bg-card border border-border/50"
                variant="outline"
                size="icon"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            {/* Footer message */}
            <Card className="p-4 backdrop-blur-sm bg-muted/30 border-border/50">
              <p className="text-xs text-center text-muted-foreground italic">
                May Allah (SWT) help us implement these teachings in our daily lives. Ameen.
              </p>
            </Card>
          </div>
        ) : (
          <Card className="p-8 text-center space-y-4 backdrop-blur-sm bg-card/80 border-border/50">
            <p className="text-muted-foreground">Unable to load hadith. Please try again later.</p>
            <Button onClick={fetchHadith} variant="outline" className="bg-gradient-gold text-primary-foreground border-0">
              Try Again
            </Button>
          </Card>
        )}
      </div>
    </div>
    </PageTransition>
  );
};

export default Hadith;
