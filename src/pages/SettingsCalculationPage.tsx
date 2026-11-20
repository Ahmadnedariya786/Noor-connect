import React, { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Clock, ShieldCheck, Sparkles, CheckCircle, RefreshCw, Compass } from "lucide-react";
import { AppBar } from "@/components/AppBar";
import { LayoutManager } from "@/components/LayoutManager";
import { PrayerMethodSelector } from "@/components/PrayerMethodSelector";
import { useToast } from "@/hooks/use-toast";
import { useLocationState } from "@/lib/location-state";
import { getMadhab, setMadhab, type MadhabType } from "@/lib/storage";
import {
  getRegionalPrayerPreset,
  applyRegionalPreset,
  getMaghribIhtiyatMin,
  setMaghribIhtiyatMin,
} from "@/lib/prayer-times";
import { AladhanAPI } from "@/lib/aladhan-api";

export default function SettingsCalculationPage() {
  const { toast } = useToast();
  const location = useLocationState();
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    return (localStorage.getItem('time-format') as '12h' | '24h') || '12h';
  });
  const [madhab, setMadhabState] = useState<MadhabType>(() => getMadhab());
  const [hijriOffset, setHijriOffset] = useState<string>(() => {
    return localStorage.getItem('hijri-date-offset') || '0';
  });
  const [maghribIhtiyat, setMaghribIhtiyatState] = useState<number>(() => getMaghribIhtiyatMin());

  const regionalPreset = useMemo(() => {
    return getRegionalPrayerPreset(
      location.country || location.locationName,
      location.latitude || undefined,
      location.longitude || undefined
    );
  }, [location.country, location.locationName, location.latitude, location.longitude]);

  useEffect(() => {
    const handleOffsetsChange = () => {
      setMaghribIhtiyatState(getMaghribIhtiyatMin());
      setMadhabState(getMadhab());
      setHijriOffset(localStorage.getItem('hijri-date-offset') || '0');
    };
    window.addEventListener('prayer-offsets-changed', handleOffsetsChange);
    window.addEventListener('hijri-date-offset-changed', handleOffsetsChange);
    window.addEventListener('madhab-changed', handleOffsetsChange);
    window.addEventListener('prayer-method-changed', handleOffsetsChange);
    return () => {
      window.removeEventListener('prayer-offsets-changed', handleOffsetsChange);
      window.removeEventListener('hijri-date-offset-changed', handleOffsetsChange);
      window.removeEventListener('madhab-changed', handleOffsetsChange);
      window.removeEventListener('prayer-method-changed', handleOffsetsChange);
    };
  }, []);

  const handleApplyRegionalStandard = () => {
    applyRegionalPreset(regionalPreset);
    setMadhab(regionalPreset.madhab);
    setMadhabState(regionalPreset.madhab);
    setHijriOffset(regionalPreset.hijriOffset.toString());
    setMaghribIhtiyatState(regionalPreset.maghribIhtiyatMin);
    toast({
      title: "Regional Standard Applied",
      description: regionalPreset.summary,
    });
  };

  return (
    <LayoutManager activeTab="settings">
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-36 overflow-x-hidden select-none">
        <AppBar title="Prayer Calculation" showBack={true} />

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
          {/* Regional Standard Auto-Preset Recommendation Banner */}
          <Card
            className="p-4 rounded-2xl border space-y-3"
            style={{
              background: 'linear-gradient(135deg, var(--surface), var(--surface-2))',
              borderColor: 'var(--accent)',
            }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-text)] shrink-0" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--accent-text)]">
                Regional Calculation Standard
              </h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Detected region: <strong className="text-[var(--text-primary)]">{regionalPreset.regionLabel}</strong>.
              Auto-configures Method, Hanafi/Shafi'i Madhab, Dhuhr Zawaal safety, and moon-sighting Hijri offset together.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleApplyRegionalStandard}
              className="w-full text-xs font-bold h-10 rounded-xl transition-all cursor-pointer"
              style={{
                width: '100%',
                maxWidth: '100%',
                whiteSpace: 'normal',
                textAlign: 'center',
                boxSizing: 'border-box',
                borderColor: 'var(--accent)',
                color: 'var(--accent-text)',
                background: 'var(--accent-soft)',
              }}
            >
              <RefreshCw className="w-3.5 h-3.5 mr-2 shrink-0" />
              <span>Apply Regional Standard</span>
            </Button>
          </Card>

          {/* 24-Hour Time Format */}
          <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold">24-Hour Time Format</Label>
                <p className="text-xs text-[var(--text-secondary)]">Display prayer times in 24-hour format (e.g. 17:30)</p>
              </div>
              <Switch
                checked={timeFormat === '24h'}
                onCheckedChange={(checked) => {
                  const val = checked ? '24h' : '12h';
                  setTimeFormat(val);
                  localStorage.setItem('time-format', val);
                  window.dispatchEvent(new Event('time-format-changed'));
                }}
              />
            </div>
          </Card>

          {/* Primary Calculation Method Selector */}
          <PrayerMethodSelector />

          {/* Madhab (Asr School of Jurisprudence) */}
          <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Madhab (Asr School of Jurisprudence)
              </Label>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                {madhab === 'shafi' ? 'Standard' : 'Hanafi'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => {
                  setMadhabState('shafi');
                  setMadhab('shafi');
                  try {
                    localStorage.removeItem('cached_prayer_times');
                  } catch {
                    // Safe storage fallback
                  }
                  toast({ title: 'Madhab set to Shafi / Maliki / Hanbali' });
                }}
                className="py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-center cursor-pointer"
                style={{
                  background: madhab === 'shafi' ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                  color: madhab === 'shafi' ? 'var(--on-accent)' : 'var(--text-secondary)',
                  boxShadow: madhab === 'shafi' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                <span>Shafi / Maliki / Hanbali</span>
                <span className="text-[10px] font-normal opacity-80">Shadow length = 1×</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMadhabState('hanafi');
                  setMadhab('hanafi');
                  try {
                    localStorage.removeItem('cached_prayer_times');
                  } catch {
                    // Safe storage fallback
                  }
                  toast({ title: 'Madhab set to Hanafi' });
                }}
                className="py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-center cursor-pointer"
                style={{
                  background: madhab === 'hanafi' ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                  color: madhab === 'hanafi' ? 'var(--on-accent)' : 'var(--text-secondary)',
                  boxShadow: madhab === 'hanafi' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                <span>Hanafi</span>
                <span className="text-[10px] font-normal opacity-80">Shadow length = 2×</span>
              </button>
            </div>
          </Card>

          {/* Maghrib Ihtiyat Quick Toggle */}
          <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Maghrib Precaution (Ihtiyat)
                </Label>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Precautionary sunset buffer for fasting and Maghrib (Deeniyat timetable standard)
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                {maghribIhtiyat === 3 ? '+3 min' : '0 min'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => {
                  setMaghribIhtiyatState(0);
                  setMaghribIhtiyatMin(0);
                  toast({ title: 'Maghrib set to Exact Sunset (0m)' });
                }}
                className="py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-center cursor-pointer"
                style={{
                  background: maghribIhtiyat === 0 ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                  color: maghribIhtiyat === 0 ? 'var(--on-accent)' : 'var(--text-secondary)',
                  boxShadow: maghribIhtiyat === 0 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                <span>Exact Sunset (0m)</span>
                <span className="text-[10px] font-normal opacity-80">Astronomical (Default)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMaghribIhtiyatState(3);
                  setMaghribIhtiyatMin(3);
                  toast({ title: 'Maghrib set to Precautionary (+3m)' });
                }}
                className="py-2.5 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 text-center cursor-pointer"
                style={{
                  background: maghribIhtiyat === 3 ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                  color: maghribIhtiyat === 3 ? 'var(--on-accent)' : 'var(--text-secondary)',
                  boxShadow: maghribIhtiyat === 3 ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                }}
              >
                <span>Precautionary (+3m)</span>
                <span className="text-[10px] font-normal opacity-80">Deeniyat / South Asia</span>
              </button>
            </div>
          </Card>

          {/* Hijri Date Offset */}
          <Card className="p-4 space-y-3 rounded-2xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <Label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Hijri Date Offset</Label>
            <Select
              value={hijriOffset}
              onValueChange={(val) => {
                setHijriOffset(val);
                localStorage.setItem('hijri-date-offset', val);
                AladhanAPI.clearCachedData();
                window.dispatchEvent(new Event('hijri-date-offset-changed'));
                toast({ title: 'Hijri offset updated' });
              }}
            >
              <SelectTrigger className="w-full h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="-2">-2 Days</SelectItem>
                <SelectItem value="-1">-1 Day (South Asia Hilal)</SelectItem>
                <SelectItem value="0">0 Days (Standard Umm Al-Qura)</SelectItem>
                <SelectItem value="1">+1 Day</SelectItem>
                <SelectItem value="2">+2 Days</SelectItem>
              </SelectContent>
            </Select>
          </Card>
        </div>
      </div>
    </LayoutManager>
  );
}
