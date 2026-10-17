
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  CATEGORY_THEMES, BookCategory, cleanTitle, 
  extractAuthor, generateSubtitle, getDecorationElements 
} from "@/lib/book-themes";
import { formatFileSize } from "@/lib/ebooks-storage";

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
  const theme = CATEGORY_THEMES[category];
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
        <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
          {/* Top: Category badge */}
          <div className="flex items-start justify-between">
            <Badge 
              variant="secondary" 
              className="bg-white/10 backdrop-blur-sm border-0 text-xs text-white/90 font-medium px-1.5 py-0.5"
            >
              <span className="mr-1">{theme.icon}</span>
              {category}
            </Badge>
            {size && (
              <span className="text-xs text-white/60 bg-black/20 px-1.5 py-0.5 rounded">
                {formatFileSize(parseInt(size))}
              </span>
            )}
          </div>
          
          {/* Center: Title and icon */}
          <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
              <span className="text-2xl">{theme.icon}</span>
            </div>
            <h3 className="text-xs font-semibold leading-tight line-clamp-3 drop-shadow-sm">
              {clean}
            </h3>
            {author && (
              <p className="text-xs text-white/70 mt-1 line-clamp-1">{author}</p>
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
