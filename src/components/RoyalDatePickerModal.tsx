import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Calendar, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import {
  getDetailedHijriDate,
  getDateWiseQazaList,
  toggleDatePrayerQaza,
  type QazaPrayerName,
  type DateWiseQazaRecord,
} from '@/lib/qaza-tracker';

const PRAYERS: { name: QazaPrayerName; label: string; arabicLabel: string }[] = [
  { name: 'fajr', label: 'Fajr', arabicLabel: 'الفجر' },
  { name: 'dhuhr', label: 'Dhuhr', arabicLabel: 'الظهر' },
  { name: 'asr', label: 'Asr', arabicLabel: 'العصر' },
  { name: 'maghrib', label: 'Maghrib', arabicLabel: 'المغرب' },
  { name: 'isha', label: 'Isha', arabicLabel: 'العشاء' },
  { name: 'witr', label: 'Witr', arabicLabel: 'الوتر' },
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface RoyalDatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

export const RoyalDatePickerModal: React.FC<RoyalDatePickerModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  onSelectDate,
}) => {
  useBodyScrollLock(isOpen);

  const [activeDate, setActiveDate] = useState<string>(selectedDate);
  const [viewYear, setViewYear] = useState<number>(() => {
    const parts = (selectedDate || '').split('-');
    return parts.length === 3 ? parseInt(parts[0], 10) : new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState<number>(() => {
    const parts = (selectedDate || '').split('-');
    return parts.length === 3 ? parseInt(parts[1], 10) - 1 : new Date().getMonth();
  });
  const [dateRecords, setDateRecords] = useState<DateWiseQazaRecord[]>(() => getDateWiseQazaList());

  // Real-time synchronization of date records
  const refreshRecords = useCallback(() => {
    setDateRecords(getDateWiseQazaList());
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveDate(selectedDate);
      const parts = (selectedDate || '').split('-');
      if (parts.length === 3) {
        setViewYear(parseInt(parts[0], 10));
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
      refreshRecords();
    }
  }, [isOpen, selectedDate, refreshRecords]);

  useEffect(() => {
    window.addEventListener('qaza-date-updated', refreshRecords);
    window.addEventListener('qaza-updated', refreshRecords);
    window.addEventListener('noor-qaza-updated', refreshRecords);
    return () => {
      window.removeEventListener('qaza-date-updated', refreshRecords);
      window.removeEventListener('qaza-updated', refreshRecords);
      window.removeEventListener('noor-qaza-updated', refreshRecords);
    };
  }, [refreshRecords]);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const todayIso = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const yesterdayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const twoDaysAgoIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const lastJumuahIso = useMemo(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day >= 5 ? day - 5 : day + 2;
    d.setDate(d.getDate() - diff);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  // Detailed Hijri Date for the currently highlighted active date
  const detailedDate = useMemo(() => {
    return getDetailedHijriDate(activeDate);
  }, [activeDate]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: { day: number | null; dateIso: string | null }[] = [];

    // Empty cells before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: null, dateIso: null });
    }

    // Days in current month
    for (let d = 1; d <= totalDays; d++) {
      const dateIso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ day: d, dateIso });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Check if a date has pending Qaza
  const hasPendingQaza = useCallback(
    (dateIso: string) => {
      const rec = dateRecords.find((r) => r.date === dateIso);
      return rec ? Object.values(rec.prayers).some((status) => status === 'pending') : false;
    },
    [dateRecords]
  );

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const isNextMonthDisabled = viewYear > currentYear || (viewYear === currentYear && viewMonth >= currentMonth);

  const handleNextMonth = () => {
    if (isNextMonthDisabled) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectPreset = (dateIso: string) => {
    setActiveDate(dateIso);
    const parts = dateIso.split('-');
    if (parts.length === 3) {
      setViewYear(parseInt(parts[0], 10));
      setViewMonth(parseInt(parts[1], 10) - 1);
    }
  };

  const handleDayClick = (dateIso: string) => {
    if (dateIso > todayIso) return;
    setActiveDate(dateIso);
  };

  const currentRecord = useMemo(() => {
    return dateRecords.find((r) => r.date === activeDate);
  }, [dateRecords, activeDate]);

  const handleTogglePrayer = (prayerName: QazaPrayerName) => {
    toggleDatePrayerQaza(activeDate, prayerName);
    refreshRecords();
  };

  const handleSaveAndDone = () => {
    onSelectDate(activeDate);
    onClose();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="royal-date-picker-title"
      className="fixed inset-0 z-[99995] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99995,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(6px)',
      }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-[20px] border border-[var(--border)] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          width: '100%',
          maxWidth: '348px',
          maxHeight: 'calc(100vh - 48px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '14px',
          borderRadius: '20px',
          background: 'var(--bg-elev)',
          border: '1.5px solid var(--border)',
          boxSizing: 'border-box',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85), inset 0 1px 0 var(--card-sheen)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1: Top Header + Close Button */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              <Calendar className="w-3 h-3 text-[var(--accent)] shrink-0" />
              <span id="royal-date-picker-title" className="truncate">Royal Islamic Date Picker</span>
            </div>
            <h2 className="text-sm font-extrabold text-[var(--text-primary)] leading-tight truncate mt-0.5">
              {detailedDate.gregorianDay}, {detailedDate.gregorian}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shrink-0"
            aria-label="Close date picker"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Hijri Date Pill */}
        <div
          style={{
            padding: '7px 14px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
        >
          <span
            dir="ltr"
            className="text-[var(--accent-text)]"
            style={{
              fontSize: '0.62rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
              flex: '1 1 auto',
            }}
          >
            🌙 {detailedDate.hijriEn}
          </span>
          <span
            dir="rtl"
            className="text-[var(--accent-text)]"
            style={{
              fontFamily: 'var(--font-urdu), sans-serif',
              fontSize: '0.68rem',
              lineHeight: 1.4,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              paddingRight: '4px',
              paddingLeft: '2px',
            }}
          >
            {detailedDate.hijriArUr}
          </span>
        </div>

        {/* Row 3: 4 Preset Pills in strict grid grid-cols-4 gap-1.5 w-full */}
        <div className="grid grid-cols-4 gap-1.5 w-full">
          <button
            type="button"
            onClick={() => handleSelectPreset(todayIso)}
            className={`rounded-lg border transition-all cursor-pointer text-center ${
              activeDate === todayIso
                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
            }`}
            style={{ fontSize: '0.66rem', fontWeight: 700, padding: '5px 2px', whiteSpace: 'nowrap' }}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(yesterdayIso)}
            className={`rounded-lg border transition-all cursor-pointer text-center ${
              activeDate === yesterdayIso
                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
            }`}
            style={{ fontSize: '0.66rem', fontWeight: 700, padding: '5px 2px', whiteSpace: 'nowrap' }}
          >
            Yesterday
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(twoDaysAgoIso)}
            className={`rounded-lg border transition-all cursor-pointer text-center ${
              activeDate === twoDaysAgoIso
                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
            }`}
            style={{ fontSize: '0.66rem', fontWeight: 700, padding: '5px 2px', whiteSpace: 'nowrap' }}
          >
            -2 Days
          </button>
          <button
            type="button"
            onClick={() => handleSelectPreset(lastJumuahIso)}
            className={`rounded-lg border transition-all cursor-pointer text-center ${
              activeDate === lastJumuahIso
                ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
            }`}
            style={{ fontSize: '0.66rem', fontWeight: 700, padding: '5px 2px', whiteSpace: 'nowrap' }}
          >
            Jumu&apos;ah
          </button>
        </div>

        {/* Row 4: Compact Month Bar + 7-Column Calendar Grid */}
        <div className="w-full space-y-1">
          {/* Month & Year Navigator */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center justify-center text-xs"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-[var(--accent)]" />
            </button>

            <span className="text-xs font-extrabold text-[var(--text-primary)]">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className="p-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center justify-center text-xs disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next month"
            >
              <ChevronRight className="w-3.5 h-3.5 text-[var(--accent)]" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((wd, idx) => (
              <span
                key={wd}
                className={`text-[9px] font-extrabold tracking-wider ${
                  idx === 5 ? 'text-[var(--accent-text)]' : 'text-[var(--text-secondary)]'
                }`}
              >
                {wd}
              </span>
            ))}
          </div>

          {/* Days Matrix */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((item, idx) => {
              if (!item.day || !item.dateIso) {
                return <div key={`empty-${idx}`} style={{ height: '32px' }} className="rounded-lg" />;
              }

              const isFuture = item.dateIso > todayIso;
              const isSelected = item.dateIso === activeDate;
              const isToday = item.dateIso === todayIso;
              const hasPending = hasPendingQaza(item.dateIso);

              return (
                <button
                  key={item.dateIso}
                  type="button"
                  disabled={isFuture}
                  onClick={() => handleDayClick(item.dateIso!)}
                  className={`rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                    isFuture
                      ? 'opacity-25 cursor-not-allowed'
                      : isSelected
                      ? 'font-extrabold shadow-md'
                      : 'hover:bg-[var(--surface-2)]'
                  }`}
                  style={{
                    height: '32px',
                    fontSize: '0.76rem',
                    ...(isSelected
                      ? {
                          background: 'var(--accent)',
                          color: 'var(--on-accent)',
                          boxShadow: '0 0 10px var(--accent-glow)',
                        }
                      : {
                          background: isToday ? 'var(--surface-2)' : 'transparent',
                          color: 'var(--text-primary)',
                          border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                        }),
                  }}
                >
                  <span className="font-bold leading-none">{item.day}</span>
                  {hasPending && (
                    <span
                      className="w-1.5 h-1.5 rounded-full qaza-dot-blink inline-block mt-0.5"
                      style={{
                        background: isSelected ? 'var(--on-accent)' : 'var(--warning, #f59e0b)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 5: All 6 Prayers (Fajr to Witr) Visible Without Scrolling! */}
        <div
          className="w-full rounded-xl border border-[var(--border)] p-2 space-y-1.5"
          style={{ background: 'var(--surface-2)' }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              marginBottom: '8px',
              width: '100%',
              minWidth: 0,
            }}
          >
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                color: 'var(--text-primary)',
              }}
            >
              Missed Prayers • {detailedDate.gregorian}
            </span>
            <span
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap',
              }}
            >
              Tap prayer to cycle: None → ● Pending → ✓ Done
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PRAYERS.map((p) => {
              const status = currentRecord?.prayers[p.name] || 'none';
              const isPending = status === 'pending';
              const isCompleted = status === 'completed';

              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleTogglePrayer(p.name)}
                  className={`rounded-lg border flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                    isPending
                      ? 'qaza-pending-blink bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-text)]'
                      : isCompleted
                      ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
                      : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  style={{ padding: '6px 4px' }}
                >
                  <span
                    className="text-[11px]"
                    style={{ fontFamily: 'var(--font-urdu), serif', lineHeight: 1.2 }}
                  >
                    {p.arabicLabel}
                  </span>
                  <span className="text-[10px] font-bold capitalize mt-0.5">{p.label}</span>
                  <span className="text-[8px] font-mono mt-0.5 font-bold">
                    {isPending ? '● PENDING' : isCompleted ? '✓ DONE' : '—'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 6: Bottom Action Button */}
        <button
          type="button"
          onClick={handleSaveAndDone}
          className="w-full border flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
          style={{
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            borderColor: 'var(--accent)',
            boxShadow: '0 2px 10px var(--accent-glow)',
            padding: '9px',
            fontSize: '0.78rem',
            fontWeight: 800,
            borderRadius: '12px',
          }}
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>Done & Save Qaza</span>
        </button>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default RoyalDatePickerModal;
