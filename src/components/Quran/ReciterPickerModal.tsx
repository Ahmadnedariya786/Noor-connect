/**
 * Noor Connect — Searchable & Filterable 45+ Quran Reciters Modal
 *
 * Provides instant search and style filtering across 45+ world-renowned Qaris:
 * Murattal, Mujawwad, and Teacher / Muallim (Pedagogical Hifz repetitions).
 */

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Check, Sparkles, Volume2 } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { QURAN_RECITERS, type AuthenticReciter, type ReciterStyle } from '@/lib/quran-reciters';

interface ReciterPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedReciterId: string;
  onSelectReciter: (reciter: AuthenticReciter) => void;
}

type StyleFilter = 'All' | ReciterStyle;

export const ReciterPickerModal: React.FC<ReciterPickerModalProps> = ({
  isOpen,
  onClose,
  selectedReciterId,
  onSelectReciter,
}) => {
  useBodyScrollLock(isOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<StyleFilter>('All');

  const filteredReciters = useMemo(() => {
    let list = QURAN_RECITERS;

    if (activeFilter !== 'All') {
      list = list.filter((r) => r.style === activeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.arabicName.includes(q) ||
          r.shortName.toLowerCase().includes(q) ||
          (r.note && r.note.toLowerCase().includes(q)) ||
          (r.country && r.country.toLowerCase().includes(q))
      );
    }

    return list;
  }, [searchQuery, activeFilter]);

  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reciter-modal-title"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-lg max-h-[88vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] border border-[var(--border)] overflow-hidden shadow-2xl transition-all"
        style={{
          backgroundColor: 'var(--surface)',
          color: 'var(--text-primary)',
          boxShadow: '0 20px 45px rgba(0,0,0,0.45)',
        }}
      >
        {/* Header */}
        <div className="p-3.5 sm:p-5 border-b border-[var(--border)] shrink-0 flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border border-[var(--border)]"
              style={{
                backgroundColor: 'var(--surface-2)',
                color: 'var(--accent)',
              }}
            >
              <Volume2 className="w-4.5 h-4.5 text-[var(--accent-text)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <h2
                  id="reciter-modal-title"
                  className="tracking-tight text-[var(--text-primary)]"
                  style={{ fontSize: '0.92rem', fontWeight: 800, whiteSpace: 'nowrap' }}
                >
                  47 Authentic Reciters
                </h2>
                <span
                  className="uppercase bg-[var(--accent)]/15 text-[var(--accent-text)] border border-[var(--accent)]/30"
                  style={{
                    fontSize: '0.60rem',
                    fontWeight: 800,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  HD AUDIO
                </span>
              </div>
              <p
                className="text-[var(--text-secondary)] leading-tight mt-0.5"
                style={{
                  fontSize: '0.70rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                EveryAyah CDN • Murattal & Mujawwad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close reciter selection"
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-transform"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Style Filters */}
        <div className="p-3 sm:p-4 space-y-2.5 border-b border-[var(--border)] bg-[var(--bg-base)]/50 shrink-0">
          {/* Instant Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 47 authentic reciters..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:outline-none focus:border-[var(--accent)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Style Filter Pills: Strict 4-Column Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '6px',
              width: '100%',
            }}
          >
            {[
              { key: 'All' as StyleFilter, label: 'All' },
              { key: 'Murattal' as StyleFilter, label: 'Murattal' },
              { key: 'Mujawwad' as StyleFilter, label: 'Mujawwad' },
              { key: 'Teacher (Muallim)' as StyleFilter, label: 'Muallim' },
            ].map(({ key, label }) => {
              const isActive = activeFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(key)}
                  className={`rounded-full transition-all border ${
                    isActive
                      ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-[var(--accent)]/40'
                  }`}
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '6px 4px',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reciters List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 no-scrollbar">
          {filteredReciters.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--text-secondary)]">
              No reciters found matching "{searchQuery}"
            </div>
          ) : (
            filteredReciters.map((reciter) => {
              const isSelected = reciter.id === selectedReciterId;
              return (
                <button
                  key={reciter.id}
                  onClick={() => {
                    onSelectReciter(reciter);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 group active:scale-[0.99] ${
                    isSelected
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)] shadow-sm'
                      : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--accent)]/40'
                  }`}
                  style={{
                    boxShadow: isSelected ? 'inset 0 1px 0 var(--card-sheen)' : undefined,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                        {reciter.name}
                      </span>
                      {isSelected && (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--accent)] text-[var(--on-accent)]">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        dir="rtl"
                        className="font-arabic text-xs font-medium text-[var(--accent-text)] truncate"
                      >
                        {reciter.arabicName}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">•</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0">
                        {reciter.style}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0 hidden sm:inline-block">
                        {reciter.bitrate}
                      </span>
                    </div>
                    {reciter.note && (
                      <p className="text-[10.5px] text-[var(--text-secondary)]/80 mt-1 truncate">
                        {reciter.note}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center justify-center">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-[var(--on-accent)] flex items-center justify-center shadow-md">
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full border border-[var(--border)] bg-[var(--surface-2)]/60 group-hover:border-[var(--accent)]/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent-text)]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer info strip */}
        <div className="p-3 border-t border-[var(--border)] bg-[var(--bg-base)]/40 text-center text-[10.5px] text-[var(--text-secondary)] shrink-0">
          Showing {filteredReciters.length} of {QURAN_RECITERS.length} Reciters • Full Quran Audio Available
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
