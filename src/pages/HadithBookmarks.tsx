import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Trash2, BookOpen, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageTransition } from "@/components/PageTransition";
import { useHadithBookmarks } from "@/hooks/useHadithBookmarks";

export function HadithBookmarksPage() {
  const navigate = useNavigate();
  const { bookmarks, removeBookmark, clearBookmarks } = useHadithBookmarks();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/hadith/collections")}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Bookmarked Hadith</h1>
              <p className="text-sm text-muted-foreground">
                {bookmarks.length} {bookmarks.length === 1 ? "hadith" : "hadiths"} saved
              </p>
            </div>
            {bookmarks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearBookmarks}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 me-2" />
                Clear All
              </Button>
            )}
          </div>

          {bookmarks.length === 0 ? (
            <Card className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                <Bookmark className="w-8 h-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold">No bookmarks yet</h2>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Start browsing hadith collections and bookmark your favorites for quick access.
              </p>
              <Button onClick={() => navigate("/hadith/collections")}>
                <BookOpen className="w-4 h-4 me-2" />
                Browse Collections
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((bookmark) => (
                <Card
                  key={bookmark.id}
                  className="cursor-pointer hover:bg-accent/5 transition-colors border-border/50"
                  onClick={() =>
                    navigate(
                      `/hadith/collections/${bookmark.collection}/${bookmark.bookNumber}/${bookmark.hadithNumber}`
                    )
                  }
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <p
                          className="text-lg font-arabic leading-relaxed text-right"
                          dir="rtl"
                        >
                          {bookmark.arabic}
                        </p>
                        {bookmark.englishTranslation && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {bookmark.englishTranslation}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {bookmark.collection.replace(/[-_]/g, " ")}
                          </span>
                          {bookmark.bookName && (
                            <>
                              <span>·</span>
                              <span>{bookmark.bookName}</span>
                            </>
                          )}
                          <span>·</span>
                          <span>#{bookmark.hadithNumber}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(
                              `/hadith/collections/${bookmark.collection}/${bookmark.bookNumber}/${bookmark.hadithNumber}`
                            );
                          }}
                        >
                          <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeBookmark(bookmark.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}

export default HadithBookmarksPage;