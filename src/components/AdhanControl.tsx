import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, User, Play, TestTube, Settings as SettingsIcon, Smartphone } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Switch } from './ui/switch';
import { Slider } from './ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { adhanService, AdhanConfig, Muezzin } from '@/lib/adhan-service';
import { PRAYER_ALARM_CONTROL_EVENT, PRAYER_ALARM_TOGGLE_EVENT } from '@/lib/prayer-alarm-events';
import { Capacitor } from '@capacitor/core';
import { nativeAdhan } from '@/lib/native-adhan';

interface AdhanControlProps {
  className?: string;
}

export function AdhanControl({ className }: AdhanControlProps) {
  const [config, setConfig] = useState<AdhanConfig>(adhanService.getAdhanConfig());
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTestControls, setShowTestControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Check if running on native platform (Android/iOS)
  const isNativePlatform = Capacitor.isNativePlatform();

  // Keep prayer-alarm toggle (used by GlobalPrayerAlarm) in sync with the UI toggle here
  const syncAlarmToggle = (enabled: boolean) => {
    localStorage.setItem('prayer-alarm-enabled', enabled ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent(PRAYER_ALARM_TOGGLE_EVENT, { detail: { enabled } })
    );
    if (!enabled) {
      window.dispatchEvent(
        new CustomEvent(PRAYER_ALARM_CONTROL_EVENT, { detail: { action: 'stop' } })
      );
    }
  };

  // Load config on mount
  useEffect(() => {
    const loadConfig = () => {
      const current = adhanService.getAdhanConfig();
      setConfig(current);

      // If adhan is enabled/disabled elsewhere (e.g., Profile > Prayer Alarm), mirror it
      const alarmEnabled = localStorage.getItem('prayer-alarm-enabled') === 'true';
      if (alarmEnabled !== current.enabled) {
        const merged = { ...current, enabled: alarmEnabled };
        adhanService.saveAdhanConfig(merged);
        setConfig(merged);
      }
    };
    
    loadConfig();

    // Listen for config changes across components
    const handleSync = () => loadConfig();
    window.addEventListener('storage', handleSync);
    window.addEventListener('adhan-config-changed' as any, handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('adhan-config-changed' as any, handleSync);
    };
  }, []);

  // Subscribe reactively to adhan playback state changes via adhan-service's
  // new onPlaybackChange() subscriber.  Eliminates the previous 500ms
  // setInterval() poll that was doing unnecessary work twice per second
  // even when nothing was playing.
  useEffect(() => {
    return adhanService.onPlaybackChange(setIsPlaying);
  }, []);

  const toggleAdhan = async () => {
    const newEnabled = !config.enabled;
    if (newEnabled && isNativePlatform) {
      await nativeAdhan.ensureExactAlarmPermission(true);
    }
    const newConfig = { ...config, enabled: newEnabled };
    adhanService.saveAdhanConfig(newConfig);
    syncAlarmToggle(newEnabled);
    setConfig(newConfig);
    // Notify other components
    window.dispatchEvent(new CustomEvent('adhan-config-changed', { detail: newConfig }));
  };

  const updateConfig = (updates: Partial<AdhanConfig>) => {
    const newConfig = { ...config, ...updates };
    adhanService.saveAdhanConfig(newConfig);
    setConfig(newConfig);
    // Notify other components
    window.dispatchEvent(new CustomEvent('adhan-config-changed', { detail: newConfig }));
  };

  const playTestAdhan = async (prayerName: string) => {
    await adhanService.testAdhan(prayerName);
  };

  const stopAdhan = () => {
    adhanService.stopAdhan();
  };

  const muezzins = adhanService.getAvailableMuezzins();
  const selectedMuezzin = muezzins.find(m => m.id === config.selectedMuezzin);

  const prayerNames = [
    { id: 'fajr', name: 'Fajr', enabled: config.fajrEnabled },
    { id: 'dhuhr', name: 'Dhuhr', enabled: config.dhuhrEnabled },
    { id: 'asr', name: 'Asr', enabled: config.asrEnabled },
    { id: 'maghrib', name: 'Maghrib', enabled: config.maghribEnabled },
    { id: 'isha', name: 'Isha', enabled: config.ishaEnabled },
    { id: 'jummah', name: 'Jummah', enabled: config.jummahEnabled }
  ];

  return (
    <Card className={`${className} bg-card/95 backdrop-blur-lg border-border`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {config.enabled ? (
              <Bell className="w-5 h-5 text-green-500" />
            ) : (
              <BellOff className="w-5 h-5 text-gray-400" />
            )}
            <h3 className="font-semibold">Adhan</h3>
          </div>
          <div className="flex items-center gap-2">
            {isPlaying && (
              <Button variant="outline" size="sm" onClick={stopAdhan}>
                Stop
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTestControls(!showTestControls)}
            >
              <TestTube className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Main Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium">Enable Adhan</span>
            <span className="text-sm text-muted-foreground">
              {config.enabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={toggleAdhan}
          />
        </div>

        {/* Status */}
        {config.enabled && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <User className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                {selectedMuezzin?.name || 'Unknown Muezzin'}
              </span>
              <Badge variant="outline" className="text-xs">
                {selectedMuezzin?.arabicName}
              </Badge>
            </div>
          </div>
        )}

        {/* Test Controls */}
        {showTestControls && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Test Adhan</h4>
            <div className="grid grid-cols-2 gap-2">
              {prayerNames.map((prayer) => (
                <Button
                  key={prayer.id}
                  variant="outline"
                  size="sm"
                  onClick={() => playTestAdhan(prayer.id)}
                  disabled={!config.enabled || !prayer.enabled}
                  className="text-xs"
                >
                  <Play className="w-3 h-3 mr-1" />
                  {prayer.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Adhan Settings</h4>
            
            {/* Muezzin Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Muezzin (Reciter)</label>
              <Select
                value={config.selectedMuezzin}
                onValueChange={(value) => updateConfig({ selectedMuezzin: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select muezzin" />
                </SelectTrigger>
                <SelectContent>
                  {muezzins.map((muezzin) => (
                    <SelectItem key={muezzin.id} value={muezzin.id}>
                      <div className="flex flex-col">
                        <span>{muezzin.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {muezzin.arabicName}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Volume</label>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <Slider
                  value={[config.volume]}
                  onValueChange={(value) => updateConfig({ volume: value[0] })}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-8">
                  {config.volume}%
                </span>
              </div>
            </div>

            {/* Prayer Toggles */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Prayer Times</label>
              <div className="grid grid-cols-2 gap-2">
                {prayerNames.map((prayer) => (
                  <div key={prayer.id} className="flex items-center space-x-2">
                    <Switch
                      checked={prayer.enabled}
                      onCheckedChange={(checked) => {
                        const updates = { [`${prayer.name.toLowerCase()}Enabled`]: checked };
                        updateConfig(updates);
                      }}
                    />
                    <span className="text-sm">{prayer.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Settings */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notification Sound</span>
                <Switch
                  checked={config.playNotificationSound}
                  onCheckedChange={(checked) => updateConfig({ playNotificationSound: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Vibration</span>
                <Switch
                  checked={config.vibrationEnabled}
                  onCheckedChange={(checked) => updateConfig({ vibrationEnabled: checked })}
                />
              </div>
              
              {/* Native-only settings */}
              {isNativePlatform && (
                <>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Override Silent Mode</span>
                        <span className="text-xs text-muted-foreground">Play adhan even when phone is silent</span>
                      </div>
                    </div>
                    <Switch
                      checked={config.overrideSilentMode}
                      onCheckedChange={(checked) => updateConfig({ overrideSilentMode: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Maximum Volume</span>
                      <span className="text-xs text-muted-foreground">Always play at max volume</span>
                    </div>
                    <Switch
                      checked={config.playAtMaxVolume}
                      onCheckedChange={(checked) => updateConfig({ playAtMaxVolume: checked })}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
