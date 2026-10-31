import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, RefreshCw, CheckCircle, Sliders, RotateCcw, Minus, Plus } from "lucide-react";
import { prayerMethods, type PrayerMethod } from "@/lib/prayer-methods";
import { useLocationState } from "@/lib/location-state";
import { useToast } from "@/hooks/use-toast";
import {
  getPrayerMinuteOffsets,
  savePrayerMinuteOffsets,
  resetPrayerMinuteOffsets,
  PRAYER_OFFSETS_CHANGED_EVENT,
  type PrayerMinuteOffsets
} from "@/lib/prayer-offsets";
import { OnlinePrayerAPI } from "@/lib/online-prayer-api";

export const PrayerMethodSelector = () => {
  const location = useLocationState();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PrayerMethod>(prayerMethods.getSelectedMethod());
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [recommendedMethod, setRecommendedMethod] = useState<PrayerMethod | null>(null);
  const [offsets, setOffsets] = useState<PrayerMinuteOffsets>(() => getPrayerMinuteOffsets());

  useEffect(() => {
    const handleOffsetsChange = (e: Event) => {
      const customEvent = e as CustomEvent<PrayerMinuteOffsets>;
      if (customEvent.detail) {
        setOffsets(customEvent.detail);
      } else {
        setOffsets(getPrayerMinuteOffsets());
      }
    };
    window.addEventListener(PRAYER_OFFSETS_CHANGED_EVENT, handleOffsetsChange);
    return () => window.removeEventListener(PRAYER_OFFSETS_CHANGED_EVENT, handleOffsetsChange);
  }, []);

  const handleAdjustOffset = (prayer: keyof PrayerMinuteOffsets, delta: number) => {
    const current = offsets[prayer];
    const newVal = Math.max(-30, Math.min(30, current + delta));
    const updated = { ...offsets, [prayer]: newVal };
    setOffsets(updated);
    savePrayerMinuteOffsets(updated);
  };

  const handleResetOffsets = () => {
    resetPrayerMinuteOffsets();
    setOffsets(getPrayerMinuteOffsets());
    toast({
      title: "Offsets Reset",
      description: "All prayer minute offsets reset to 0 minutes.",
    });
  };

  const handleRefreshLive = async () => {
    if (!location.latitude || !location.longitude) return;
    setIsRefreshingLive(true);
    try {
      await OnlinePrayerAPI.refreshLiveData(location.latitude, location.longitude);
      toast({
        title: "Live Data Refreshed",
        description: "Synced with AlAdhan live timings & calendar.",
      });
    } catch {
      toast({
        title: "Refresh Failed",
        description: "Could not reach live API. Using cached calculations.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshingLive(false);
    }
  };

  useEffect(() => {
    // Get recommended method for current location
    if (location.latitude && location.longitude) {
      const recommended = prayerMethods.getRecommendedMethod(location.latitude, location.longitude);
      setRecommendedMethod(recommended);
    }
  }, [location.latitude, location.longitude]);

  useEffect(() => {
    // Load current method
    const current = prayerMethods.getSelectedMethod();
    setSelectedMethod(current);
  }, []);

  const handleMethodChange = async (methodId: string) => {
    const method = prayerMethods.getMethodById(parseInt(methodId, 10));
    if (!method) return;

    setIsUpdating(true);
    
    try {
      // Save the new method
      prayerMethods.saveSelectedMethod(method);
      setSelectedMethod(method);

      // Show success message
      toast({
        title: "Prayer Method Updated",
        description: `Now using ${method.name} for prayer calculations`,
      });

      // Trigger prayer time recalculation
      // This will be handled by the Dashboard component listening for method changes
      window.dispatchEvent(new CustomEvent('prayer-method-changed', { 
        detail: { method } 
      }));

    } catch (error) {
      console.error('Failed to update prayer method:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update prayer method. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUseRecommended = () => {
    if (recommendedMethod) {
      handleMethodChange(recommendedMethod.id.toString());
    }
  };

  const { fajrDisplay, ishaDisplay } = prayerMethods.getMethodDisplayInfo(selectedMethod);
  const isRecommended = recommendedMethod?.id === selectedMethod.id;
  const prayerOffsetList: { key: keyof PrayerMinuteOffsets; label: string }[] = [
    { key: "fajr", label: "Fajr" },
    { key: "sunrise", label: "Sunrise" },
    { key: "dhuhr", label: "Dhuhr" },
    { key: "asr", label: "Asr" },
    { key: "maghrib", label: "Maghrib" },
    { key: "isha", label: "Isha" },
  ];

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Prayer Calculation Method</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Choose the calculation method for prayer times based on your location and preference
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefreshLive}
          disabled={isRefreshingLive}
          className="shrink-0 text-xs h-8 px-2.5 rounded-lg border gap-1.5 font-medium transition-all"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface-2)',
            color: 'var(--text-primary)'
          }}
        >
          <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent)] ${isRefreshingLive ? 'animate-spin' : ''}`} />
          <span>{isRefreshingLive ? 'Refreshing...' : 'Refresh live data'}</span>
        </Button>
      </div>

      {/* Current Method Info */}
      <div
        className="p-3.5 rounded-xl border space-y-2.5"
        style={{
          background: 'var(--surface-2)',
          borderColor: 'var(--border)',
        }}
      >
        {isRecommended && (
          <div className="flex items-center">
            <span
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 shrink-0 shadow-sm"
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Recommended</span>
            </span>
          </div>
        )}

        <div className="w-full">
          <h4
            className="w-full break-words text-left"
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              lineHeight: 1.3,
            }}
          >
            {selectedMethod.name}
          </h4>
        </div>

        <p className="text-xs text-[var(--text-secondary)] break-words leading-relaxed">
          {selectedMethod.description}
        </p>

        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          <div
            className="inline-flex items-center gap-1.5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
            }}
          >
            <span className="font-medium text-[var(--text-secondary)]">Fajr:</span>
            <span className="font-bold text-[var(--text-primary)]">{fajrDisplay}</span>
          </div>

          <div
            className="inline-flex items-center gap-1.5"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '0.78rem',
            }}
          >
            <span className="font-medium text-[var(--text-secondary)]">Isha:</span>
            <span className="font-bold text-[var(--text-primary)]">{ishaDisplay}</span>
          </div>
        </div>
      </div>

      {/* Method Selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Calculation Method
        </label>
        <Select
          value={selectedMethod.id.toString()}
          onValueChange={handleMethodChange}
          disabled={isUpdating}
        >
          <SelectTrigger
            className="!h-auto min-h-[48px] w-full [&>span]:line-clamp-none"
            style={{
              height: 'auto',
              minHeight: '48px',
              width: '100%',
              padding: '11px 14px',
              borderRadius: '12px',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              boxSizing: 'border-box',
              textAlign: 'left',
              marginTop: '6px',
              marginBottom: '14px',
            }}
          >
            <SelectValue placeholder="Select prayer calculation method">
              <span
                style={{
                  fontSize: '0.90rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  lineHeight: 1.3,
                  textAlign: 'left',
                  flex: 1,
                  minWidth: 0,
                  display: 'block',
                  whiteSpace: 'normal',
                  wordBreak: 'break-word',
                }}
              >
                {selectedMethod.name}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-[260px] overflow-y-auto pb-4" style={{ maxHeight: '260px', overflowY: 'auto', paddingBottom: '16px' }}>
            {prayerMethods.getAllMethods().map((method) => (
              <SelectItem
                key={method.id}
                value={method.id.toString()}
                className="pl-9 pr-4 py-2.5 cursor-pointer"
                style={{ height: 'auto' }}
              >
                <div className="flex flex-col items-start gap-0.5 w-full">
                  <span className="font-semibold text-sm text-[var(--text-primary)] break-words text-left leading-snug">
                    {method.name}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Fajr: {method.fajrAngle}°, Isha: {
                      method.ishaInterval ? `${method.ishaInterval} min` : `${method.ishaAngle}°`
                    }
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Recommended Method */}
      {recommendedMethod && recommendedMethod.id !== selectedMethod.id && (
        <div
          className="p-3.5 rounded-xl border transition-all"
          style={{
            background: 'var(--accent-soft)',
            borderColor: 'var(--accent)',
            color: 'var(--accent-text)',
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Info className="w-4 h-4 shrink-0" style={{ color: 'var(--accent-text)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--accent-text)' }}>
              Recommended for your location
            </span>
          </div>
          <p className="text-xs sm:text-sm mb-3 opacity-90" style={{ color: 'var(--accent-text)' }}>
            {recommendedMethod.name} is recommended for {location.locationName}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUseRecommended}
            disabled={isUpdating}
            className="w-full font-medium"
            style={{
              borderColor: 'var(--accent)',
              color: 'var(--accent-text)',
              background: 'var(--surface)',
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Use Recommended Method
          </Button>
        </div>
      )}

      {/* Method Information */}
      <div
        className="text-xs text-[var(--text-secondary)] space-y-1.5"
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border)',
          lineHeight: 1.5,
        }}
      >
        <p>• Different methods use different angles for Fajr and Isha calculations</p>
        <p>• Some methods use fixed intervals after Maghrib for Isha</p>
        <p>• Your preference is saved and will persist after closing the app</p>
        <p>• Prayer times update instantly when you change the method</p>
      </div>

      {/* Update Status */}
      {isUpdating && (
        <div
          className="flex items-center gap-2 p-2.5 rounded-xl border text-[var(--accent-text)]"
          style={{ background: 'var(--accent-soft)', borderColor: 'var(--accent)' }}
        >
          <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
          <span className="text-xs font-semibold">Updating prayer times...</span>
        </div>
      )}
    </Card>

    {/* Per-Prayer Minute Offsets Card */}
    <Card
      className="p-4 space-y-4 rounded-2xl border"
      style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              PER-PRAYER MINUTE OFFSETS (MASJID TUNING)
            </h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Fine-tune prayer times (-30 to +30 min) to match your local masjid or iqamah schedule
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleResetOffsets}
          className="shrink-0 text-xs h-7 px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] gap-1"
          title="Reset all offsets to 0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {prayerOffsetList.map(({ key, label }) => {
          const val = offsets[key] || 0;
          const isZero = val === 0;
          const isPos = val > 0;
          return (
            <div
              key={key}
              className="flex items-center justify-between p-2.5 rounded-xl border"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border)',
              }}
            >
              <div>
                <span className="text-xs font-semibold text-[var(--text-primary)] block">
                  {label}
                </span>
                <span
                  className="text-[11px] font-mono font-bold"
                  style={{
                    color: isZero
                      ? 'var(--text-secondary)'
                      : isPos
                      ? 'var(--accent)'
                      : '#f87171',
                  }}
                >
                  {isZero ? '0 min' : `${isPos ? '+' : ''}${val} min`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAdjustOffset(key, -1)}
                  disabled={val <= -30}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  aria-label={`Decrease ${label} offset`}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => handleAdjustOffset(key, 1)}
                  disabled={val >= 30}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: 'var(--surface)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  aria-label={`Increase ${label} offset`}
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  </div>
  );
};
