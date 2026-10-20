/**
 * Haptic Settings Component
 * Allows users to configure haptic feedback preferences
 */

import { useState, useEffect } from 'react';
import { Vibrate, VibrateOff, HandHeart, Bell, Bookmark, MousePointer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import hapticService, { type HapticSettings } from '@/lib/haptic-service';

export function HapticSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<HapticSettings>(hapticService.getSettings());
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    // Load current settings
    setSettings(hapticService.getSettings());
  }, []);

  const updateSetting = async <K extends keyof HapticSettings>(
    key: K, 
    value: HapticSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await hapticService.updateSettings({ [key]: value });
    
    // Provide haptic feedback for setting changes (if enabled)
    if (key !== 'enabled' || value === true) {
      hapticService.trigger('light');
    }
  };

  const testHaptics = async () => {
    setIsTesting(true);
    try {
      await hapticService.test();
      toast({
        title: "Haptic Test Complete",
        description: "Did you feel the vibration patterns?",
      });
    } catch (error) {
      toast({
        title: "Haptic Test Failed",
        description: "Haptic feedback may not be available on this device",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${settings.enabled ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'bg-muted text-muted-foreground'}`}>
            {settings.enabled ? <Vibrate className="w-5 h-5" /> : <VibrateOff className="w-5 h-5" />}
          </div>
          <div>
            <Label className="text-sm font-bold">Haptic Feedback</Label>
            <p className="text-xs text-muted-foreground">Vibration for app interactions</p>
          </div>
        </div>
        <Switch
          checked={settings.enabled}
          onCheckedChange={(enabled) => updateSetting('enabled', enabled)}
        />
      </div>

      {settings.enabled && (
        <>
          {/* Intensity Setting */}
          <Card className="p-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <HandHeart className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  Vibration Intensity
                </Label>
                <span className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  {settings.intensity}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 p-1 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                {(['light', 'medium', 'heavy'] as const).map((intensity) => {
                  const isSelected = settings.intensity === intensity;
                  return (
                    <button
                      key={intensity}
                      type="button"
                      onClick={() => updateSetting('intensity', intensity)}
                      className="py-2 px-3 rounded-lg text-xs font-bold capitalize transition-all flex flex-col items-center justify-center gap-0.5"
                      style={{
                        background: isSelected ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'transparent',
                        color: isSelected ? 'var(--on-accent)' : 'var(--text-secondary)',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
                      }}
                    >
                      <span>{intensity}</span>
                      <span className="text-[10px] font-normal opacity-80">
                        {intensity === 'light' ? 'Subtle' : intensity === 'medium' ? 'Balanced' : 'Strong'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Feature Toggles */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">When to Vibrate</h3>
            
            {/* Prayer Notifications */}
            <div className="flex items-center justify-between p-3 border rounded-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Prayer Times</Label>
                  <p className="text-xs text-muted-foreground">Adhan and prayer reminders</p>
                </div>
              </div>
              <Switch
                checked={settings.prayerNotifications}
                onCheckedChange={(enabled) => updateSetting('prayerNotifications', enabled)}
              />
            </div>

            {/* Bookmark Actions */}
            <div className="flex items-center justify-between p-3 border rounded-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Bookmark Actions</Label>
                  <p className="text-xs text-muted-foreground">Saving and deleting bookmarks</p>
                </div>
              </div>
              <Switch
                checked={settings.bookmarkActions}
                onCheckedChange={(enabled) => updateSetting('bookmarkActions', enabled)}
              />
            </div>

            {/* UI Interactions */}
            <div className="flex items-center justify-between p-3 border rounded-xl" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent-text)' }}>
                  <MousePointer className="w-4 h-4" />
                </div>
                <div>
                  <Label className="text-sm font-medium">UI Interactions</Label>
                  <p className="text-xs text-muted-foreground">Buttons and navigation taps</p>
                </div>
              </div>
              <Switch
                checked={settings.uiInteractions}
                onCheckedChange={(enabled) => updateSetting('uiInteractions', enabled)}
              />
            </div>
          </div>

          {/* Test Button */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-bold">Test Haptics</Label>
                <p className="text-xs text-muted-foreground">Feel different vibration patterns</p>
              </div>
              <Button 
                variant="outline" 
                onClick={testHaptics}
                disabled={isTesting}
                className="gap-2"
              >
                <Vibrate className="w-4 h-4" />
                {isTesting ? 'Testing...' : 'Test Now'}
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default HapticSettings;
