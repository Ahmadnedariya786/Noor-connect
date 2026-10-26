import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Volume2, Repeat, Palette, Bookmark, CheckCircle2 } from 'lucide-react';

interface QuranGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface GuideFeature {
  id: string;
  icon: React.ReactNode;
  badge: string;
  title: string;
  description: string;
  tip: string;
}

export const QuranGuideModal: React.FC<QuranGuideModalProps> = ({ isOpen, onClose }) => {
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
    } catch {
      // Ignore quota error in private mode
    }
    onClose();
  };

  const features: GuideFeature[] = [
    {
      id: 'wbw',
      icon: <Volume2 size={20} style={{ color: 'var(--accent)' }} />,
      badge: 'Word Study',
      title: '👆 Word-by-Word Study & Audio',
      description: 'Tap any Arabic word on the Mushaf page to view its exact English meaning, transliteration, and root word.',
      tip: 'Tap the audio button in the popup to hear that exact word pronounced clearly by the Qari.',
    },
    {
      id: 'tafsir',
      icon: <BookOpen size={20} style={{ color: 'var(--accent)' }} />,
      badge: 'Tafsir & Translations',
      title: '﴿١﴾ Tafsir & Multi-Translation',
      description: 'Tap any verse number medallion ﴿١﴾ or the top 📚 Study button to open comprehensive verse study.',
      tip: "Switch between English (Sahih Int'l, Pickthall), Urdu & Hindi, plus Ibn Kathir & Ma'arif al-Qur'an Tafsirs.",
    },
    {
      id: 'hifz',
      icon: <Repeat size={20} style={{ color: 'var(--accent)' }} />,
      badge: 'Hifz Engine',
      title: '🔁 Hifz (Memorization) Engine',
      description: 'Inside 📚 Study → Hifz, loop any verse or custom verse range 3× to 10× to commit it to memory.',
      tip: 'Enable Recite Pause to recite aloud after the Qari, and use the Blur Words slider to test recall.',
    },
    {
      id: 'modes',
      icon: <Palette size={20} style={{ color: 'var(--accent)' }} />,
      badge: '4 Reading Modes',
      title: '🎨 4 Reading Modes & Tajweed Colours',
      description: 'Choose your preferred Mushaf experience: Jewel (deep luxury), Paper (Madinah cream), Night (OLED black), or Scan (original print).',
      tip: 'Tap 🎨 Tajweed to color-code Ghunnah, Idgham, Qalqalah & Madd recitation rules with the interactive rules guide.',
    },
    {
      id: 'khatmah',
      icon: <Bookmark size={20} style={{ color: 'var(--accent)' }} />,
      badge: 'Smart Progress',
      title: '📖 Smart Khatmah & 5-Colour Auto-Bookmarks',
      description: 'Set a 30, 60, or 90-day Khatmah goal that automatically recalibrates daily targets if you read extra or miss a day.',
      tip: 'Assign 5 distinct colored bookmarks (Emerald, Ruby, Amber, etc.) with Auto-move so your ribbon advances with each page turn.',
    },
  ];

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quran Feature Guide"
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
    >
      <div
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
          animation: 'fadeScaleIn 0.22s ease-out',
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
                }}
              >
                Quran Features Guide
              </h2>
              <p
                style={{
                  margin: '2px 0 0 0',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Tap-to-learn interactive tools & smart workflows
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
          {features.map((feature, idx) => (
            <div
              key={feature.id}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                    {feature.icon}
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    {feature.title}
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
                  }}
                >
                  Step {idx + 1}
                </span>
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.77rem',
                  lineHeight: 1.45,
                  color: 'var(--text-secondary)',
                }}
              >
                {feature.description}
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
                    lineHeight: 1.35,
                    color: 'var(--text-primary)',
                  }}
                >
                  {feature.tip}
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
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Available anytime via <strong style={{ color: 'var(--text-primary)' }}>? Guide</strong>
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
            }}
          >
            <CheckCircle2 size={16} />
            Got It
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
