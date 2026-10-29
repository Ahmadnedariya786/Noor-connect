/**
 * ContentLanguageBar Component
 * ─────────────────────────────────────────────────────────────
 * Royal 4-pill language selector: [ English ] [ اردو ] [ ગુજરાતી ] [ हिन्दी ]
 * Strictly consumes Noor Connect CSS variable tokens:
 *   Active:   var(--accent), var(--on-accent)
 *   Inactive: var(--surface-2), var(--border), var(--text-secondary)
 */

import React from 'react';
import {
  CONTENT_LANGUAGES,
  type ContentLang,
  useContentLanguage,
} from '@/lib/content-translator';

interface ContentLanguageBarProps {
  value?: ContentLang;
  onChange?: (lang: ContentLang) => void;
  compact?: boolean;
  fullWidth?: boolean;
  className?: string;
  label?: string;
}

export const ContentLanguageBar: React.FC<ContentLanguageBarProps> = ({
  value,
  onChange,
  compact = false,
  fullWidth = false,
  className = '',
  label,
}) => {
  const { contentLang, setContentLang } = useContentLanguage();
  const activeLang = value ?? contentLang;

  const handleSelect = (code: ContentLang) => {
    if (onChange) {
      onChange(code);
    } else {
      setContentLang(code);
    }
  };

  return (
    <div
      className={`${
        fullWidth
          ? 'grid grid-cols-4 w-full gap-1.5 p-1 rounded-2xl'
          : 'inline-flex items-center gap-1.5 p-1 rounded-full'
      } border border-[var(--border)] backdrop-blur-md select-none transition-all ${className}`}
      style={{
        background: 'var(--surface-2)',
        boxShadow: 'inset 0 1px 0 var(--card-sheen)',
      }}
      role="radiogroup"
      aria-label={label || 'Select Content Language'}
    >
      {CONTENT_LANGUAGES.map((opt) => {
        const isActive = activeLang === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => handleSelect(opt.code)}
            className={`cursor-pointer transition-all duration-200 rounded-full font-medium active:scale-95 flex items-center justify-center ${
              fullWidth
                ? 'w-full py-1.5 text-xs font-semibold'
                : compact
                ? 'px-2.5 py-0.5 text-[11px] leading-tight min-w-[32px]'
                : 'px-3 py-1 text-xs leading-normal min-w-[56px]'
            } ${opt.code === 'ur' ? 'font-urdu' : ''}`}
            style={{
              background: isActive ? 'var(--accent)' : 'transparent',
              color: isActive ? 'var(--on-accent)' : 'var(--text-secondary)',
              fontWeight: isActive ? 700 : 500,
              boxShadow: isActive ? '0 2px 8px var(--accent-glow)' : 'none',
              fontFamily: opt.code === 'ur' ? 'var(--font-urdu)' : 'inherit',
            }}
          >
            {compact && !fullWidth ? opt.shortLabel : opt.nativeLabel}
          </button>
        );
      })}
    </div>
  );
};

export default ContentLanguageBar;

