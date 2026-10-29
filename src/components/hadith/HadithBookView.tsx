import { memo, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Search, BookOpen, Users, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCollectionByName, HadithCollection, HadithBook } from "@/data/hadith-collections";
import { getHadithCollectionMetadata } from "@/lib/hadith";
import { useContentLanguage, translateIslamicText } from "@/lib/content-translator";
import { ContentLanguageBar } from "@/components/ContentLanguageBar";

export function HadithBookView() {
  const { collection } = useParams<{ collection: string }>();
  const navigate = useNavigate();
  const { contentLang, isRtl } = useContentLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [remoteCollectionData, setRemoteCollectionData] = useState<HadithCollection | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [translatedCollectionDesc, setTranslatedCollectionDesc] = useState("");

  const staticCollectionData = useMemo(() => {
    return collection ? getCollectionByName(collection) : null;
  }, [collection]);

  useEffect(() => {
    if (!staticCollectionData?.description && !remoteCollectionData?.description) return;
    const desc = remoteCollectionData?.description || staticCollectionData?.description || "";
    if (contentLang === 'en' || !desc) {
      setTranslatedCollectionDesc(desc);
      return;
    }
    let isMounted = true;
    translateIslamicText(desc, contentLang).then((res) => {
      if (isMounted) setTranslatedCollectionDesc(res);
    });
    return () => { isMounted = false; };
  }, [contentLang, staticCollectionData?.description, remoteCollectionData?.description]);

  useEffect(() => {
    let isMounted = true;

    async function loadCollectionMetadata() {
      if (!collection) {
        setRemoteCollectionData(null);
        return;
      }

      setMetadataLoading(true);
      try {
        const metadata = await getHadithCollectionMetadata(collection);
        if (isMounted) {
          setRemoteCollectionData(metadata);
        }
      } catch (error) {
        console.warn('Failed to load metadata for %s:', collection, error);
        if (isMounted) {
          setRemoteCollectionData(null);
        }
      } finally {
        if (isMounted) {
          setMetadataLoading(false);
        }
      }
    }

    loadCollectionMetadata();

    return () => {
      isMounted = false;
    };
  }, [collection]);

  const collectionData = remoteCollectionData ?? staticCollectionData;

  const filteredBooks = useMemo(() => {
    if (!collectionData?.books?.length) return [];
    
    if (!searchTerm) return collectionData.books;
    
    const term = searchTerm.toLowerCase();
    return collectionData.books.filter(book =>
      book.name.toLowerCase().includes(term) ||
      book.arabicName.toLowerCase().includes(term) ||
      book.description?.toLowerCase().includes(term)
    );
  }, [collectionData, searchTerm]);

  interface BookCardProps {
  book: HadithBook;
  collection: string;
  navigate: ReturnType<typeof useNavigate>;
}

const BookCard = memo(function BookCard({ book, collection, navigate }: BookCardProps) {
  const { contentLang, isRtl } = useContentLanguage();
  const rawDisplayName = !book.name || !book.name.trim() || book.name.trim().toLowerCase() === "chapter"
    ? `Chapter ${book.number} • General Traditions`
    : book.name;
  const displayArabicName = !book.arabicName || !book.arabicName.trim() || book.arabicName.trim() === "باب"
    ? `الباب ${book.number}`
    : book.arabicName;

  const [translatedName, setTranslatedName] = useState(rawDisplayName);
  const [translatedDesc, setTranslatedDesc] = useState(book.description || "");

  useEffect(() => {
    if (contentLang === 'en') {
      setTranslatedName(rawDisplayName);
      setTranslatedDesc(book.description || "");
      return;
    }
    let isMounted = true;
    Promise.all([
      translateIslamicText(rawDisplayName, contentLang),
      book.description ? translateIslamicText(book.description, contentLang) : Promise.resolve(""),
    ]).then(([tName, tDesc]) => {
      if (isMounted) {
        setTranslatedName(tName);
        setTranslatedDesc(tDesc);
      }
    });
    return () => { isMounted = false; };
  }, [rawDisplayName, book.description, contentLang]);

  return (
    <Card
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] border-border/50 hover:border-primary/30"
      onClick={() => navigate(`/hadith/collections/${collection}/${book.number}`)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 group-hover:from-primary/30 group-hover:to-primary/20 transition-colors">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3
                className={`font-semibold text-foreground group-hover:text-primary transition-colors ${contentLang === 'ur' ? 'font-urdu text-right leading-[2.35]' : isRtl ? 'font-arabic text-right' : ''}`}
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                {translatedName}
              </h3>
              <p className="text-sm text-muted-foreground font-arabic" dir="rtl">
                {displayArabicName}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>

        {book.hadithCount && (
          <div className="flex items-center gap-2">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {book.hadithCount} {contentLang === 'ur' ? 'احادیث' : contentLang === 'gu' ? 'હદીસ' : contentLang === 'hi' ? 'हदीस' : 'hadith'}
            </span>
          </div>
        )}

        {book.description && (
          <p
            className={`text-xs text-muted-foreground line-clamp-2 ${contentLang === 'ur' ? 'font-urdu text-right leading-[2.35]' : isRtl ? 'font-arabic text-right' : ''}`}
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {translatedDesc || book.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

  // Show loading while fetching remote metadata
  if (metadataLoading && !remoteCollectionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-lg">Loading collection...</span>
        </div>
      </div>
    );
  }

  if (!collectionData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Collection Not Found
          </h2>
          <p className="text-muted-foreground">
            The requested Hadith collection could not be found.
          </p>
          <Button
            onClick={() => navigate("/hadith/collections")}
            className="mt-4"
          >
            Browse Collections
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Header with Row 1 (Back + Title + Authenticity) and Row 2 (Full-Width Language Bar) */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/hadith/collections")}
                className="rounded-xl shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{collectionData.title}</h1>
                <p className="text-muted-foreground font-arabic truncate" dir="rtl">
                  {collectionData.arabicTitle}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs shrink-0">
              {collectionData.authenticity}
            </Badge>
          </div>
          <ContentLanguageBar fullWidth />
        </div>

        {/* Collection Info */}
        <Card className="border-border/50">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {contentLang === 'ur' ? 'مؤلف' : contentLang === 'gu' ? 'સંકલનકર્તા' : contentLang === 'hi' ? 'संकलनकर्ता' : 'Compiler'}
                </h3>
                <p className="text-sm text-muted-foreground">{collectionData.author}</p>
                <p className="text-xs text-muted-foreground">{collectionData.compilerPeriod}</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {contentLang === 'ur' ? 'اعداد و شمار' : contentLang === 'gu' ? 'આંકડાકીય માહિતી' : contentLang === 'hi' ? 'आंकड़े' : 'Statistics'}
                </h3>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="font-medium">{collectionData.totalBooks}</span> {contentLang === 'ur' ? 'کتب' : contentLang === 'gu' ? 'પુસ્તકો' : contentLang === 'hi' ? 'किताबें' : 'Books'}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">{collectionData.totalHadith.toLocaleString()}</span> {contentLang === 'ur' ? 'احادیث' : contentLang === 'gu' ? 'હદીસ' : contentLang === 'hi' ? 'हदीस' : 'Hadith'}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  {contentLang === 'ur' ? 'تعارف و تفصیل' : contentLang === 'gu' ? 'વિગતો' : contentLang === 'hi' ? 'विवरण' : 'Description'}
                </h3>
                <p className={`text-sm text-muted-foreground leading-relaxed ${contentLang === 'ur' ? 'font-urdu leading-[2.35] text-right' : isRtl ? 'font-arabic text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
                  {translatedCollectionDesc || collectionData.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Bar */}
        <div className="relative max-w-md mx-auto mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={contentLang === 'ur' ? 'کتاب یا باب تلاش کریں...' : contentLang === 'gu' ? 'પુસ્તક શોધો...' : contentLang === 'hi' ? 'किताब खोजें...' : 'Search books...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl border-border/50 focus:border-primary/50"
          />
        </div>

        {/* Chapters/Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.number}
              book={book}
              collection={collection!}
              navigate={navigate}
            />
          ))}
        </div>

        {/* No Results - Only show after loading completes */}
        {!metadataLoading && filteredBooks.length === 0 && !searchTerm && collectionData.books.length === 0 && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Books Not Imported Yet
              </h3>
              <p className="text-muted-foreground">
                This collection is configured, but its books are not available locally yet.
              </p>
            </div>
          </div>
        )}

        {!metadataLoading && filteredBooks.length === 0 && (searchTerm || collectionData.books.length > 0) && (
          <div className="text-center py-12">
            <div className="max-w-md mx-auto">
              <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No Chapters Found
              </h3>
              <p className="text-muted-foreground">
                Try adjusting your search terms to find what you're looking for.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
