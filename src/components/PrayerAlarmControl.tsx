import { useState, useEffect } from 'react';
import { Bell, BellRing, Volume2, VolumeX, Play, Square, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrayerAlarm } from '@/hooks/usePrayerAlarm';

const REMINDER_MINUTES_KEY = 'prayer-reminder-minutes';

export const PrayerAlarmControl = () => {
  const {
    isEnabled,
    isPlaying,
    currentPrayer,
    enableAlarm,
    disableAlarm,
    stopAdhan,
    testAdhan,
  } = usePrayerAlarm();

  const [reminderMinutes, setReminderMinutes] = useState('0');

  useEffect(() => {
    const saved = localStorage.getItem(REMINDER_MINUTES_KEY);
    if (saved) setReminderMinutes(saved);
  }, []);

  const handleReminderChange = (value: string) => {
    setReminderMinutes(value);
    localStorage.setItem(REMINDER_MINUTES_KEY, value);
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Adhan Alarm
        </CardTitle>
        <CardDescription>
          Play Adhan automatically when prayer time arrives
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPlaying && (
          <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BellRing className="h-6 w-6 text-primary animate-bounce" />
                <div>
                  <p className="font-semibold text-primary">{currentPrayer} Time!</p>
                  <p className="text-sm text-muted-foreground">Adhan is playing...</p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={stopAdhan}
              >
                <Square className="h-4 w-4 me-2" />
                Stop
              </Button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isEnabled ? (
            <>
              <div className="flex items-center gap-2 p-3 bg-[var(--success)]/10 rounded-lg border border-[var(--success)]/20">
                <Bell className="h-5 w-5 text-[var(--success)]" />
                <span className="text-sm text-[var(--success)] font-medium">
                  Adhan alarm is active
                </span>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Pre-Prayer Reminder</p>
                  <p className="text-xs text-muted-foreground">Get notified before prayer time</p>
                </div>
                <Select value={reminderMinutes} onValueChange={handleReminderChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Off</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="10">10 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={testAdhan}
                  disabled={isPlaying}
                >
                  <Play className="h-4 w-4 me-2" />
                  Test Adhan
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={disableAlarm}
                >
                  <VolumeX className="h-4 w-4 me-2" />
                  Disable
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Enable the Adhan alarm to hear the call to prayer automatically when it's time.
                Make sure to keep this page open in a browser tab.
              </p>
              <Button
                onClick={enableAlarm}
                className="w-full bg-gradient-primary"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Enable Adhan Alarm
              </Button>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Note: The browser tab must remain open for the alarm to work. 
          Enable notifications for the best experience.
        </p>
      </CardContent>
    </Card>
  );
};
