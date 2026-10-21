
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  CATEGORY_THEMES, BookCategory, cleanTitle, 
  extractAuthor, generateSubtitle, getDecorationElements 
} from "@/lib/book-themes";
import { formatFileSize } from "@/lib/ebooks-storage";
import { BookOpen, Scroll, Scale, Landmark, Moon, User, Heart, Users, History, Lightbulb, Library } from "lucide-react";

export function getBookCategoryVectorIcon(category: BookCategory, className: string = "w-3.5 h-3.5") {
  switch (category) {
    case 'Quran & Tafsir': return <BookOpen className={className} />;
    case 'Hadith': return <Scroll className={className} />;
    case 'Fiqh': return <Scale className={className} />;
    case 'Aqeedah': return <Landmark className={className} />;
    case 'Seerah': return <Moon className={className} />;
    case 'Biography': return <User className={className} />;
    case 'Dua & Dhikr': return <Heart className={className} />;
    case 'Family & Women': return <Users className={className} />;
    case 'History': return <History className={className} />;
    case 'Knowledge': return <Lightbulb className={className} />;
    default: return <Library className={className} />;
  }
}

interface BookCoverProps {
  title: string;
  category: BookCategory;
  size?: string;
  progress?: number;
  showProgress?: boolean;
  className?: string;
}

export const BookCover = memo(({ 
  title, 
  category, 
  size,
  progress = 0,
  showProgress = true,
  className = ""
}: BookCoverProps) => {
  const theme = CATEGORY_THEMES[category] || CATEGORY_THEMES['General'];
  const clean = cleanTitle(title);
  const author = extractAuthor(title);
  const subtitle = generateSubtitle(title, category);
  
  return (
    <div className={`relative group ${className}`}>
      <div 
        className={`w-full h-full rounded-lg bg-gradient-to-br ${theme.gradient} shadow-lg overflow-hidden relative`}
        style={{ aspectRatio: '2/3' }}
      >
        {/* Pattern overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{ backgroundImage: theme.pattern, backgroundSize: '30px 30px' }}
        />
        
        {/* Decorative corner */}
        <div 
          className="absolute top-0 left-0 w-16 h-16 opacity-20"
          style={{ backgroundImage: getDecorationElements(theme.decoration).corner, backgroundSize: '100% 100%' }}
        />
        <div 
          className="absolute bottom-0 right-0 w-16 h-16 opacity-20 transform rotate-180"
          style={{ backgroundImage: getDecorationElements(theme.decoration).corner, backgroundSize: '100% 100%' }}
        />
        
        {/* Spine effect */}
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-r from-white/20 to-transparent" />
        
        {/* Content */}
        <div className="absolute inset-0 p-2.5 flex flex-col justify-between text-white overflow-hidden">
          {/* Top: Category badge and file size */}
          <div className="flex items-center justify-between gap-1 w-full min-w-0">
            <Badge 
              variant="secondary" 
              className="bg-white/15 backdrop-blur-sm border-0 text-[10px] text-white/95 font-medium px-1.5 py-0.5 flex items-center gap-1 shrink truncate max-w-[55%]"
            >
              {getBookCategoryVectorIcon(category, "w-3 h-3 shrink-0")}
              <span className="truncate">{category}</span>
            </Badge>
            {size && (
              <span 
                className="text-white/80 bg-black/40 rounded font-semibold truncate shrink-0"
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  maxWidth: '45%',
                  lineHeight: '1',
                }}
              >
                {formatFileSize(parseInt(size))}
              </span>
            )}
          </div>
          
          {/* Center: Title and icon */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1 my-1">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-1.5 shadow-sm">
              {getBookCategoryVectorIcon(category, "w-5 h-5 text-white/90")}
            </div>
            <h3 className="text-xs font-semibold leading-tight line-clamp-3 drop-shadow-sm">
              {clean}
            </h3>
            {author && (
              <p className="text-[10px] text-white/70 mt-1 line-clamp-1">{author}</p>
            )}
          </div>
          
          {/* Bottom: Subtitle */}
          <p className="text-xs text-white/60 text-center line-clamp-1">
            {subtitle}
          </p>
        </div>
        
        {/* Progress bar */}
        {showProgress && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div 
              className="h-full bg-[var(--accent)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </div>
  );
});

BookCover.displayName = 'BookCover';
