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
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          <CardTitle>Prayer Calculation Method</CardTitle>
        </div>
        <CardDescription>
          Choose the calculation method for prayer times based on your location and preference
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Method Info */}
        <div className="p-3 rounded-lg bg-muted/30">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <h4 className="font-medium text-sm sm:text-base leading-snug min-w-0 flex-1">{selectedMethod.name}</h4>
            {isRecommended && (
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 shrink-0 shadow-sm"
                style={{
                  background: 'var(--accent-soft)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent-text)',
                }}
              >
                <CheckCircle className="w-3 h-3" />
                Recommended
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 break-words">{selectedMethod.description}</p>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-medium">Fajr:</span>
              <span className="text-muted-foreground">{fajrDisplay}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Isha:</span>
              <span className="text-muted-foreground">{ishaDisplay}</span>
            </div>
          </div>
        </div>

        {/* Method Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Calculation Method</label>
          <Select
            value={selectedMethod.id.toString()}
            onValueChange={handleMethodChange}
            disabled={isUpdating}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select prayer calculation method" />
            </SelectTrigger>
            <SelectContent>
              {prayerMethods.getAllMethods().map((method) => (
                <SelectItem key={method.id} value={method.id.toString()}>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{method.name}</span>
                    <span className="text-xs text-muted-foreground">
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
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• Different methods use different angles for Fajr and Isha calculations</p>
          <p>• Some methods use fixed intervals after Maghrib for Isha</p>
          <p>• Your preference is saved and will persist after closing the app</p>
          <p>• Prayer times update instantly when you change the method</p>
        </div>

        {/* Update Status */}
        {isUpdating && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Updating prayer times...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
