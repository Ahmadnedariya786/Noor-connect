import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, RefreshCw, Info, CheckCircle } from "lucide-react";
import { prayerMethods, type PrayerMethod } from "@/lib/prayer-methods";
import { useLocationState } from "@/lib/location-state";
import { useToast } from "@/hooks/use-toast";

export const PrayerMethodSelector = () => {
  const location = useLocationState();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PrayerMethod>(prayerMethods.getSelectedMethod());
  const [isUpdating, setIsUpdating] = useState(false);
  const [recommendedMethod, setRecommendedMethod] = useState<PrayerMethod | null>(null);

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
  const usesInterval = prayerMethods.usesIshaInterval(selectedMethod);
  const isRecommended = recommendedMethod?.id === selectedMethod.id;

  return (
    <Card className="p-4 space-y-4 rounded-2xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Prayer Calculation Method</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)]">
          Choose the calculation method for prayer times based on your location and preference
        </p>
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
              className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 shadow-sm"
              style={{
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent)',
                color: 'var(--accent-text)',
              }}
            >
              <CheckCircle className="w-3 h-3" />
              ✓ Recommended
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
                className="py-2.5 px-3 h-auto cursor-pointer"
                style={{ padding: '10px 12px', height: 'auto' }}
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
  );
};
