import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="royal-date-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] rounded-[24px] border border-[var(--border)] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        style={{
          background: 'var(--bg-elev)',
          borderColor: 'var(--border)',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.85), inset 0 1px 0 var(--card-sheen)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="p-4 sm:p-4.5 border-b border-[var(--border)] relative"
          style={{
            background: 'var(--surface)',
          }}
        >
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                <Calendar className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span id="royal-date-picker-title">Royal Islamic Date Picker</span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-[var(--text-primary)] leading-tight">
                {detailedDate.gregorianDay}, {detailedDate.gregorian}
              </h2>
              <p
                className="text-xs sm:text-sm font-semibold text-[var(--accent-text)]"
                style={{
                  fontFamily: 'var(--font-urdu), sans-serif',
                  lineHeight: 1.8,
                }}
              >
                {detailedDate.fullHijri}
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
              aria-label="Close date picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Pills Row */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => handleSelectPreset(todayIso)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 cursor-pointer ${
                activeDate === todayIso
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset(yesterdayIso)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 cursor-pointer ${
                activeDate === yesterdayIso
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              Yesterday
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset(twoDaysAgoIso)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 cursor-pointer ${
                activeDate === twoDaysAgoIso
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              2 Days Ago
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset(lastJumuahIso)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all shrink-0 cursor-pointer ${
                activeDate === lastJumuahIso
                  ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)] shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
              }`}
            >
              Last Jumu&apos;ah
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-4.5 space-y-4 overflow-y-auto">
          {/* Month & Year Navigator */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4 text-[var(--accent)]" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <div className="text-center">
              <span className="text-sm font-extrabold text-[var(--text-primary)]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              disabled={isNextMonthDisabled}
              className="p-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-4 h-4 text-[var(--accent)]" />
            </button>
          </div>

          {/* 7-Column Calendar Grid */}
          <div className="space-y-1.5">
            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS.map((wd, idx) => (
                <span
                  key={wd}
                  className={`text-[10px] font-extrabold tracking-wider ${
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
                  return <div key={`empty-${idx}`} className="h-9 sm:h-10 rounded-xl" />;
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
                    className={`h-9 sm:h-10 rounded-xl flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                      isFuture
                        ? 'opacity-25 cursor-not-allowed'
                        : isSelected
                        ? 'font-extrabold shadow-md'
                        : 'hover:bg-[var(--surface-2)]'
                    }`}
                    style={
                      isSelected
                        ? {
                            background: 'var(--accent)',
                            color: 'var(--on-accent)',
                            boxShadow: '0 0 12px var(--accent-glow)',
                          }
                        : {
                            background: isToday ? 'var(--surface-2)' : 'transparent',
                            color: 'var(--text-primary)',
                            border: isToday ? '1px solid var(--accent)' : '1px solid transparent',
                          }
                    }
                  >
                    <span className="text-xs font-bold leading-none">{item.day}</span>
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

          {/* Direct 6-Prayer Qaza Selector Inside Modal */}
          <div
            className="p-3 sm:p-3.5 rounded-2xl border border-[var(--border)] space-y-2.5"
            style={{
              background: 'var(--surface-2)',
            }}
          >
            <div className="flex items-center justify-between gap-1">
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">
                  Missed Prayers for {detailedDate.gregorian}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)]">
                  Tap to cycle: [ None → ● Pending → ✓ Completed ]
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
              {PRAYERS.map((p) => {
                const status = currentRecord?.prayers[p.name] || 'none';
                const isPending = status === 'pending';
                const isCompleted = status === 'completed';

                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleTogglePrayer(p.name)}
                    className={`p-1.5 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer active:scale-95 ${
                      isPending
                        ? 'qaza-pending-blink bg-[var(--accent-soft)] border-[var(--accent)] text-[var(--accent-text)]'
                        : isCompleted
                        ? 'bg-[var(--success)]/10 border-[var(--success)] text-[var(--success)]'
                        : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span
                      className="text-xs font-arabic"
                      style={{ fontFamily: 'var(--font-urdu), serif', lineHeight: 1.4 }}
                    >
                      {p.arabicLabel}
                    </span>
                    <span className="text-[10px] font-bold capitalize mt-0.5">{p.label}</span>
                    <span className="text-[8px] font-mono mt-0.5 font-bold">
                      {isPending ? '● PENDING' : isCompleted ? '✓ PRAYED' : '—'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer with Done Button */}
        <div
          className="p-3 sm:p-4 border-t border-[var(--border)] flex items-center justify-between gap-3"
          style={{ background: 'var(--surface)' }}
        >
          <div className="text-[11px] text-[var(--text-secondary)] truncate">
            Selected: <span className="font-bold text-[var(--text-primary)]">{activeDate}</span>
          </div>

          <button
            type="button"
            onClick={handleSaveAndDone}
            className="px-4 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            style={{
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              borderColor: 'var(--accent)',
              boxShadow: '0 2px 10px var(--accent-glow)',
            }}
          >
            <Check className="w-3.5 h-3.5" />
            <span>✓ Done & Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoyalDatePickerModal;
