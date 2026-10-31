import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Volume2, Repeat, Palette, Bookmark, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext-new';
import { getQuranGuideData, formatStepBadge } from '@/lib/quran-guide-i18n';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface QuranGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuranGuideModal: React.FC<QuranGuideModalProps> = ({ isOpen, onClose }) => {
  const { language, isRTL } = useLanguage();
  const guideData = useMemo(() => getQuranGuideData(language), [language]);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDismiss = () => {
    try {
      localStorage.setItem('noor_quran_guide_dismissed_v1', 'true');
      window.dispatchEvent(new CustomEvent('noorconnect:quran-guide-dismissed'));
    } catch {
      // Ignore quota error in private mode
    }
    onClose();
  };

  const getFeatureIcon = (id: string) => {
    switch (id) {
      case 'wbw':
        return <Volume2 size={20} style={{ color: 'var(--accent)' }} />;
      case 'tafsir':
        return <BookOpen size={20} style={{ color: 'var(--accent)' }} />;
      case 'hifz':
        return <Repeat size={20} style={{ color: 'var(--accent)' }} />;
      case 'modes':
        return <Palette size={20} style={{ color: 'var(--accent)' }} />;
      case 'khatmah':
        return <Bookmark size={20} style={{ color: 'var(--accent)' }} />;
      default:
        return <BookOpen size={20} style={{ color: 'var(--accent)' }} />;
    }
  };

  const lineHeight = isRTL ? 1.9 : 1.5;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={guideData.title}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9996,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleDismiss();
      }}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        className="sheet-scroll-contain"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-elev)',
          border: '1px solid var(--border)',
          borderRadius: '18px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
          overflow: 'hidden',
          overscrollBehavior: 'contain',
          animation: 'fadeScaleIn 0.22s ease-out',
          textAlign: isRTL ? 'right' : 'left',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--surface)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
                flexShrink: 0,
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  lineHeight: isRTL ? 1.6 : 1.2,
                }}
              >
                {guideData.title}
              </h2>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                  lineHeight: isRTL ? 1.6 : 1.2,
                }}
              >
                {guideData.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Close guide"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Cards */}
        <div
          style={{
            padding: '14px 16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {guideData.cards.map((card, idx) => (
            <div
              key={card.id}
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-soft)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getFeatureIcon(card.id)}
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      lineHeight: isRTL ? 1.6 : 1.25,
                    }}
                  >
                    {card.id === 'tafsir' ? (
                      <span>
                        <span dir="rtl" className="inline-block font-arabic text-[var(--accent-text)] mx-0.5">
                          ﴿١﴾
                        </span>{' '}
                        {card.title}
                      </span>
                    ) : (
                      card.title
                    )}
                  </h3>
                </div>
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    backgroundColor: 'var(--accent-soft)',
                    padding: '2px 7px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  {formatStepBadge(idx, language)}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.77rem',
                  lineHeight,
                  color: 'var(--text-secondary)',
                }}
              >
                {card.id === 'tafsir' ? (
                  <span>
                    {card.description}{' '}
                    <span dir="rtl" className="inline-block font-arabic text-[var(--accent-text)] mx-0.5">
                      ﴿١﴾
                    </span>
                  </span>
                ) : (
                  card.description
                )}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  backgroundColor: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.7rem',
                    lineHeight: 1.3,
                    color: 'var(--accent)',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  💡 Tip:
                </span>
                <span
                  style={{
                    fontSize: '0.71rem',
                    lineHeight,
                    color: 'var(--text-primary)',
                  }}
                >
                  {card.tip}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            backgroundColor: 'var(--surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', lineHeight: isRTL ? 1.5 : 1.2 }}>
            {guideData.footer} <strong style={{ color: 'var(--text-primary)' }}>{guideData.footerHighlight}</strong>
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              padding: '9px 18px',
              backgroundColor: 'var(--accent)',
              color: 'var(--on-accent)',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'transform 0.15s ease',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={16} />
            {guideData.gotIt}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
