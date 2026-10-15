import { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Shield, ShieldCheck, ShieldOff, MapPin, Bell, Clock, Smartphone, Globe, AlertTriangle, RefreshCw, Settings as SettingsIcon, Info } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { permissionManager, type PermissionType, type PermissionInfo } from '@/lib/permission-manager';
import { useToast } from '@/hooks/use-toast';
import { GeolocationService } from '@/lib/geolocation-service';
import { nativeAdhan } from '@/lib/native-adhan';
import { executeStepB } from '@/lib/onboarding-permissions';

interface PermissionManagerProps {
  className?: string;
}

const PermissionManager = ({ className }: PermissionManagerProps) => {
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Map<PermissionType, PermissionInfo>>(new Map());
  const [loading, setLoading] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'mobile' | 'web'>('web');
  const [exactAlarmGranted, setExactAlarmGranted] = useState<boolean | null>(null);
  const [loadingAlarms, setLoadingAlarms] = useState<boolean>(false);

  const isCheckingRef = useRef(false);
  const lastCheckTimeRef = useRef(0);
  const mountedRef = useRef(true);

  const loadPermissions = useCallback(async (force = false) => {
    const now = Date.now();
    if (isCheckingRef.current) return;
    // Throttle background/resume checks to at most once per 20 seconds
    if (!force && lastCheckTimeRef.current !== 0 && now - lastCheckTimeRef.current < 20000) {
      return;
    }
    isCheckingRef.current = true;
    lastCheckTimeRef.current = now;

    try {
      const allPermissions = await permissionManager.getAllPermissions(force);
      if (!mountedRef.current) return;

      setPermissions((prev) => {
        // Only update state if values actually changed to prevent render loops
        let hasChanged = false;
        if (prev.size !== allPermissions.length) {
          hasChanged = true;
        } else {
          for (const p of allPermissions) {
            const existing = prev.get(p.type);
            if (!existing || existing.status !== p.status) {
              hasChanged = true;
              break;
            }
          }
        }
        if (!hasChanged && prev.size > 0) return prev;

        const permissionMap = new Map<PermissionType, PermissionInfo>();
        allPermissions.forEach((p) => permissionMap.set(p.type, p));
        return permissionMap;
      });

      if (Capacitor.isNativePlatform()) {
        try {
          const canSchedule = await nativeAdhan.canScheduleExactAlarms();
          if (mountedRef.current) {
            setExactAlarmGranted(canSchedule);
          }
        } catch (err) {
          // Handled exact alarm check error in PermissionManager
          console.warn('Failed to check exact alarm status in PermissionManager:', err);
        }
      }
    } catch (err) {
      console.warn('Failed to load permissions:', err);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    setPlatform(Capacitor.isNativePlatform() ? 'mobile' : 'web');
    loadPermissions(false);

    // Throttle checks on app resume (max 1 check per page visit + on resume with 30s throttle)
    const handleResume = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        if (now - lastCheckTimeRef.current >= 30000) {
          loadPermissions(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleResume);

    return () => {
      mountedRef.current = false;
      document.removeEventListener('visibilitychange', handleResume);
    };
  }, [loadPermissions]);

  const handleRequestPermission = async (type: PermissionType) => {
    setLoading(type);
    try {
      const success = await permissionManager.requestPermission(type);

      if (success) {
        if (type === 'notifications' && Capacitor.isNativePlatform()) {
          await nativeAdhan.ensureExactAlarmPermission(true);
        }
        toast({
          title: 'Permission Granted',
          description: `The ${type} permission has been successfully granted.`,
        });
      } else {
        if (type === 'location') {
          await GeolocationService.requestPermissions();
        } else if (type === 'notifications') {
          if (Capacitor.isNativePlatform()) {
            const canSchedule = await nativeAdhan.canScheduleExactAlarms();
            if (!canSchedule) {
              await nativeAdhan.ensureExactAlarmPermission(true);
            } else {
              await LocalNotifications.requestPermissions();
            }
          } else if ('Notification' in window) {
            await Notification.requestPermission();
          }
        }

        toast({
          title: 'Permission Required',
          description: `Please enable ${type} permissions in your device settings to use this feature.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while requesting permission.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
      loadPermissions(true);
    }
  };

  const handleOpenSettings = (type: PermissionType) => {
    permissionManager.openSettings(type);
  };

  const handleEnableAlarms = async () => {
    setLoadingAlarms(true);
    try {
      await executeStepB();
    } catch (err) {
      // Handled error during manual exact alarm request
      console.warn('Manual exact alarms request failed:', err);
    } finally {
      setLoadingAlarms(false);
      if (mountedRef.current) {
        const canSchedule = await nativeAdhan.canScheduleExactAlarms();
        setExactAlarmGranted(canSchedule);
      }
      loadPermissions(true);
    }
  };

  const getStatusIcon = (status: PermissionInfo['status']) => {
    switch (status) {
      case 'granted':
        return <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />;
      case 'denied':
        return <ShieldOff className="w-4 h-4 text-rose-500 shrink-0" />;
      case 'prompt':
      case 'prompt-with-rationale':
        return <Shield className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />;
    }
  };

  const getStatusBadge = (status: PermissionInfo['status']) => {
    switch (status) {
      case 'granted':
        return <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2 py-0.5">Granted</Badge>;
      case 'denied':
        return <Badge variant="destructive" className="text-[11px] px-2 py-0.5">Denied</Badge>;
      case 'prompt':
      case 'prompt-with-rationale':
        return <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10 text-[11px] px-2 py-0.5">Action Needed</Badge>;
      case 'not-supported':
        return <Badge variant="secondary" className="text-[11px] px-2 py-0.5">Not Supported</Badge>;
      default:
        return <Badge variant="secondary" className="text-[11px] px-2 py-0.5">Unknown</Badge>;
    }
  };

  const locationPermission = permissions.get('location');
  const notificationPermission = permissions.get('notifications');

  return (
    <Card className={`p-4 space-y-6 ${className || ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">Privacy & Permissions</h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Noor Connect is privacy-first. We only request permissions necessary for core features like prayer times and notifications. All data stays strictly on your device.
      </p>

      {/* Location Permission */}
      <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-3.5">
        {/* Row 1: Icon + Title + Description in a column */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="font-semibold text-sm text-foreground leading-snug">
              {locationPermission?.title || 'Location Access'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              {locationPermission?.description || 'Access device location to calculate accurate prayer times and Qibla direction.'}
            </p>
          </div>
        </div>

        {/* Row 2: Status badge in its own full-width row */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 min-w-0">
            {getStatusIcon(locationPermission?.status || 'prompt')}
            <span className="text-xs font-medium text-muted-foreground">Permission Status:</span>
          </div>
          {getStatusBadge(locationPermission?.status || 'prompt')}
        </div>

        {locationPermission?.status === 'granted' && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
            <span>✅</span>
            <span className="font-medium">Accurate Prayer Times & Qibla Enabled</span>
          </div>
        )}

        {locationPermission?.status === 'denied' && (
          <div className="space-y-2">
            <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <span>❌</span>
              <span className="font-medium">Location Access Denied</span>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/40 space-y-1.5">
              <p className="font-medium text-foreground">Why Location Is Needed:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                {locationPermission?.benefits.map((benefit, index) => (
                  <li key={index} className="leading-relaxed">{benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {locationPermission?.status === 'prompt' && (
          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">Location Needed for Precise Prayer Calculations</span>
          </div>
        )}

        {/* Row 3: Action button in its own full-width row */}
        <div className="pt-1">
          {locationPermission?.status === 'prompt' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleRequestPermission('location')}
              disabled={loading === 'location'}
              className="w-full h-10 rounded-xl font-medium"
            >
              {loading === 'location' ? (
                <>
                  <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <MapPin className="w-4 h-4 me-2" />
                  Enable Location
                </>
              )}
            </Button>
          )}

          {locationPermission?.status === 'denied' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {platform === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span>{platform === 'mobile' ? 'Mobile App Instructions:' : 'Browser Instructions:'}</span>
                </div>
                <div className="text-xs text-foreground bg-background p-2.5 rounded-lg border border-border/60 break-words leading-relaxed">
                  <strong>How to Fix:</strong> {locationPermission?.instructions?.[platform] || 'Check device settings'}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {platform === 'web' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestPermission('location')}
                    className="w-full h-10 rounded-xl"
                  >
                    <MapPin className="w-4 h-4 me-2" />
                    Request Location Again
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSettings('location')}
                  className="w-full h-10 rounded-xl"
                >
                  <SettingsIcon className="w-4 h-4 me-2" />
                  Open {platform === 'mobile' ? 'App Settings' : 'Browser Settings'}
                </Button>
              </div>
            </div>
          )}

          {locationPermission?.status === 'granted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenSettings('location')}
              className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="w-3.5 h-3.5 me-2" />
              Manage in Device Settings
            </Button>
          )}
        </div>
      </div>

      {/* Notification Permission */}
      <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-3.5">
        {/* Row 1: Icon + Title + Description in a column */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <h4 className="font-semibold text-sm text-foreground leading-snug">
              {notificationPermission?.title || 'Notification Access'}
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              {notificationPermission?.description || 'Receive timely Adhan prayer alarms and Islamic reminders.'}
            </p>
          </div>
        </div>

        {/* Row 2: Status badge in its own full-width row */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5 min-w-0">
            {getStatusIcon(notificationPermission?.status || 'prompt')}
            <span className="text-xs font-medium text-muted-foreground">Permission Status:</span>
          </div>
          {getStatusBadge(notificationPermission?.status || 'prompt')}
        </div>

        {notificationPermission?.status === 'granted' && (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
            <span>✅</span>
            <span className="font-medium">Adhan & Prayer Notifications Enabled</span>
          </div>
        )}

        {notificationPermission?.status === 'denied' && (
          <div className="space-y-2">
            <div className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <span>❌</span>
              <span className="font-medium">Notifications Denied</span>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/40 space-y-1.5">
              <p className="font-medium text-foreground">Why Notifications Are Needed:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-1">
                {notificationPermission?.benefits.map((benefit, index) => (
                  <li key={index} className="leading-relaxed">{benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {notificationPermission?.status === 'prompt' && (
          <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-medium">Notification Permission Needed for Adhan Alerts</span>
          </div>
        )}

        {notificationPermission?.status === 'not-supported' && (
          <div className="bg-muted text-muted-foreground text-xs px-3 py-2 rounded-xl">
            Notifications Not Supported on this browser/environment
          </div>
        )}

        {/* Row 3: Action button in its own full-width row */}
        <div className="pt-1">
          {notificationPermission?.status === 'prompt' && (
            <Button
              variant="default"
              size="sm"
              onClick={() => handleRequestPermission('notifications')}
              disabled={loading === 'notifications'}
              className="w-full h-10 rounded-xl font-medium"
            >
              {loading === 'notifications' ? (
                <>
                  <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4 me-2" />
                  Enable Notifications
                </>
              )}
            </Button>
          )}

          {notificationPermission?.status === 'denied' && (
            <div className="space-y-2.5">
              <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {platform === 'mobile' ? (
                    <Smartphone className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                  <span>{platform === 'mobile' ? 'Mobile App Instructions:' : 'Browser Instructions:'}</span>
                </div>
                <div className="text-xs text-foreground bg-background p-2.5 rounded-lg border border-border/60 break-words leading-relaxed">
                  <strong>How to Fix:</strong> {notificationPermission?.instructions?.[platform] || 'Check device settings'}
                </div>
              </div>
              <div className="space-y-2">
                {platform === 'web' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestPermission('notifications')}
                    className="w-full h-10 rounded-xl"
                  >
                    <Bell className="w-4 h-4 me-2" />
                    Request Permission
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenSettings('notifications')}
                  className="w-full h-10 rounded-xl"
                >
                  <SettingsIcon className="w-4 h-4 me-2" />
                  Open {platform === 'mobile' ? 'Notification Settings' : 'Browser Settings'}
                </Button>
              </div>
            </div>
          )}

          {notificationPermission?.status === 'granted' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenSettings('notifications')}
              className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
            >
              <SettingsIcon className="w-3.5 h-3.5 me-2" />
              Manage in Device Settings
            </Button>
          )}
        </div>
      </div>

      {/* Alarms & Reminders Permission (Android Native) */}
      {platform === 'mobile' && (
        <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-3.5">
          {/* Row 1: Icon + Title + Description in a column */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <h4 className="font-semibold text-sm text-foreground leading-snug">
                Alarms & Reminders
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed break-words">
                Allows Noor Connect to schedule exact prayer alarms that alert on time, even during Doze and battery saver modes.
              </p>
            </div>
          </div>

          {/* Row 2: Status badge in its own full-width row */}
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
            <div className="flex items-center gap-1.5 min-w-0">
              {exactAlarmGranted ? (
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <ShieldOff className="w-4 h-4 text-amber-500 shrink-0" />
              )}
              <span className="text-xs font-medium text-muted-foreground">Permission Status:</span>
            </div>
            {exactAlarmGranted ? (
              <Badge variant="default" className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] px-2 py-0.5">
                Granted
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-500 border-amber-500/50 bg-amber-500/10 text-[11px] px-2 py-0.5">
                Action Needed
              </Badge>
            )}
          </div>

          {exactAlarmGranted ? (
            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
              <span>✅</span>
              <span className="font-medium">Exact Prayer Alarms Enabled</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span className="font-medium">Exact Alarm Permission Required</span>
              </div>
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/40 space-y-1.5">
                <p className="font-medium text-foreground">Why Exact Alarms Are Needed:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li className="leading-relaxed">Play Adhan audio precisely at prayer time without system delays</li>
                  <li className="leading-relaxed">Prevent Android battery saver from silencing notifications</li>
                </ul>
              </div>
            </div>
          )}

          {/* Row 3: Action button in its own full-width row */}
          <div className="pt-1">
            {!exactAlarmGranted ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleEnableAlarms}
                disabled={loadingAlarms}
                className="w-full h-10 rounded-xl font-medium"
              >
                {loadingAlarms ? (
                  <>
                    <RefreshCw className="w-4 h-4 me-2 animate-spin" />
                    Opening Settings...
                  </>
                ) : (
                  <>
                    <Clock className="w-4 h-4 me-2" />
                    Enable Alarms Permission
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleEnableAlarms}
                className="w-full h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
              >
                <SettingsIcon className="w-3.5 h-3.5 me-2" />
                Manage in Device Settings
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Overall Status */}
      <div className="p-3.5 bg-muted/30 rounded-2xl border border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-muted-foreground" />
          <h4 className="font-semibold text-xs text-foreground uppercase tracking-wider">Permission Summary</h4>
        </div>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-border/60">
            <span className="text-muted-foreground">Platform:</span>
            <span className="font-medium text-foreground">{platform === 'mobile' ? 'Android Native' : 'Web Browser'}</span>
          </div>
          <div className="flex items-center justify-between p-2.5 bg-background rounded-xl border border-border/60">
            <span className="text-muted-foreground">Overall Status:</span>
            <span className={`font-semibold ${
              Array.from(permissions.values()).every(p => p.status === 'granted') && (platform !== 'mobile' || exactAlarmGranted === true)
                ? 'text-emerald-500'
                : Array.from(permissions.values()).some(p => p.status === 'denied') || (platform === 'mobile' && exactAlarmGranted === false)
                ? 'text-rose-500'
                : 'text-amber-500'
            }`}>
              {Array.from(permissions.values()).every(p => p.status === 'granted') && (platform !== 'mobile' || exactAlarmGranted === true)
                ? 'All Permissions Granted'
                : Array.from(permissions.values()).some(p => p.status === 'denied') || (platform === 'mobile' && exactAlarmGranted === false)
                ? 'Some Permissions Denied'
                : 'Action Needed'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default memo(PermissionManager);

