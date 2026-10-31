import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { AlertTriangle, Zap, Shield, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import BatteryOptimization from '@/lib/battery-optimization';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface BatteryOptimizationDialogProps {
  onClose: () => void;
}

export function BatteryOptimizationDialog({ onClose }: BatteryOptimizationDialogProps) {
  const [isIgnoring, setIsIgnoring] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  useBodyScrollLock(!isIgnoring && isIgnoring !== null);

  useEffect(() => {
    checkBatteryOptimization();
  }, []);

  const checkBatteryOptimization = async () => {
    if (!Capacitor.isNativePlatform()) {
      setIsIgnoring(true); // Not applicable on web
      setLoading(false);
      return;
    }

    try {
      const result = await BatteryOptimization.isIgnoringBatteryOptimizations();
      setIsIgnoring(result.isIgnoring);
    } catch (error) {
      console.error('Error checking battery optimization:', error);
      setIsIgnoring(true); // Assume okay if we can't check
    } finally {
      setLoading(false);
    }
  };

  const handleRequestExemption = async () => {
    try {
      await BatteryOptimization.requestIgnoreBatteryOptimizations();
      // Wait a moment for user to potentially grant permission
      setTimeout(() => {
        checkBatteryOptimization();
      }, 2000);
    } catch (error) {
      console.error('Error requesting battery optimization exemption:', error);
    }
  };

  const handleOpenSettings = async () => {
    try {
      await BatteryOptimization.openBatterySettings();
      // Wait a moment for user to potentially change settings
      setTimeout(() => {
        checkBatteryOptimization();
      }, 2000);
    } catch (error) {
      console.error('Error opening battery settings:', error);
    }
  };

  if (loading) {
    return null;
  }

  if (isIgnoring) {
    return null; // Already ignoring battery optimizations
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs"
      onClick={onClose}
      onTouchMove={(e) => {
        if (e.target === e.currentTarget) e.preventDefault();
      }}
    >
      <Card
        className="max-w-md w-full p-6 space-y-4 sheet-scroll-contain"
        style={{ overscrollBehavior: 'contain' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Battery Optimization Detected
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Your device has battery optimization enabled for Noor Connect. This may prevent adhan from playing reliably.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Zap className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Why disable battery optimization?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Battery optimization can prevent the app from waking up to play adhan at prayer times.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                Is it safe?
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Yes. Noor Connect uses minimal battery and only wakes up briefly at prayer times.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            onClick={handleRequestExemption}
            className="w-full"
            size="lg"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Allow Noor Connect to Ignore Battery Optimization
          </Button>
          <Button
            onClick={handleOpenSettings}
            variant="outline"
            className="w-full"
            size="lg"
          >
            Open Battery Settings
          </Button>
          <Button
            onClick={onClose}
            variant="ghost"
            className="w-full"
            size="lg"
          >
            Maybe Later
          </Button>
        </div>
      </Card>
    </div>
  );
}
