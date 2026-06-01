import { useState, useEffect } from 'react';
import { X, Play, Pause, Plus, Clock, Settings as SettingsIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { salahFocusTimer, type SalahSession, type SalahFocusSettings } from '@/lib/salah-focus-timer';

interface SalahFocusTimerProps {
  onClose?: () => void;
}

export function SalahFocusTimerComponent({ onClose }: SalahFocusTimerProps) {
  const [currentSession, setCurrentSession] = useState<SalahSession | null>(null);
  const [settings, setSettings] = useState<SalahFocusSettings>(salahFocusTimer.getSettings());
  const [showSettings, setShowSettings] = useState(false);

  // Listen to timer events
  useEffect(() => {
    const handleSessionStarted = (session: SalahSession) => {
      setCurrentSession(session);
    };

    const handleSessionEnded = (session: SalahSession) => {
      setCurrentSession(null);
    };

    const handleRakahUpdated = (session: SalahSession) => {
      if (session) {
        setCurrentSession(session);
      }
    };

    salahFocusTimer.on('session-started', handleSessionStarted);
    salahFocusTimer.on('session-ended', handleSessionEnded);
    salahFocusTimer.on('rakah-updated', handleRakahUpdated);

    return () => {
      salahFocusTimer.off('session-started', handleSessionStarted);
      salahFocusTimer.off('session-ended', handleSessionEnded);
      salahFocusTimer.off('rakah-updated', handleRakahUpdated);
    };
  }, []);

  // Update settings when changed
  useEffect(() => {
    setSettings(salahFocusTimer.getSettings());
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPrayerTypeIcon = (type: string) => {
    const icons = {
      fajr: '🌅',
      dhuhr: '☀️',
      asr: '🌤',
      maghrib: '🌅',
      isha: '🌙'
    };
    return icons[type as keyof typeof icons] || '🕌';
  };

  const startSession = async (prayerType: SalahSession['prayerType']) => {
    await salahFocusTimer.startSession(prayerType);
    setCurrentSession(salahFocusTimer.getCurrentSession());
  };

  const endSession = () => {
    salahFocusTimer.endSession(true);
  };

  const updateRakah = () => {
    const session = currentSession;
    if (session) {
      const nextRakah = session.currentRakah + 1;
      if (nextRakah <= session.rakahs) {
        salahFocusTimer.updateRakah(nextRakah);
      }
    }
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  if (!currentSession) {
    return (
      <Card className="border-border/50 bg-card/95 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Salah Focus Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">
              Start a distraction-free Salah session
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => startSession('fajr')}
                className="flex flex-col items-center gap-2 h-20 p-3 rounded-xl"
                variant="outline"
              >
                <span className="text-lg">{getPrayerTypeIcon('fajr')}</span>
                <span className="text-sm">Fajr</span>
              </Button>
              <Button
                onClick={() => startSession('dhuhr')}
                className="flex flex-col items-center gap-2 h-20 p-3 rounded-xl"
                variant="outline"
              >
                <span className="text-lg">{getPrayerTypeIcon('dhuhr')}</span>
                <span className="text-sm">Dhuhr</span>
              </Button>
              <Button
                onClick={() => startSession('asr')}
                className="flex flex-col items-center gap-2 h-20 p-3 rounded-xl"
                variant="outline"
              >
                <span className="text-lg">{getPrayerTypeIcon('asr')}</span>
                <span className="text-sm">Asr</span>
              </Button>
              <Button
                onClick={() => startSession('maghrib')}
                className="flex flex-col items-center gap-2 h-20 p-3 rounded-xl"
                variant="outline"
              >
                <span className="text-lg">{getPrayerTypeIcon('maghrib')}</span>
                <span className="text-sm">Maghrib</span>
              </Button>
              <Button
                onClick={() => startSession('isha')}
                className="flex flex-col items-center gap-2 h-20 p-3 rounded-xl"
                variant="outline"
              >
                <span className="text-lg">{getPrayerTypeIcon('isha')}</span>
                <span className="text-sm">Isha</span>
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={toggleSettings}>
              <SettingsIcon className="w-4 h-4" />
            </Button>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active session display
  const sessionDuration = currentSession ? Date.now() - currentSession.startTime : 0;
  const progress = currentSession ? (currentSession.currentRakah / currentSession.rakahs) * 100 : 0;

  return (
    <>
      {/* Floating Timer Overlay */}
      {currentSession && settings.showOverlay && (
        <div className="fixed bottom-24 right-4 bg-background/95 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border-border/50 z-50 min-w-[280px]">
          <div className="text-center space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getPrayerTypeIcon(currentSession.prayerType)}</span>
                <div>
                  <div className="font-semibold text-sm">{currentSession.prayerType.charAt(0).toUpperCase() + currentSession.prayerType.slice(1)}</div>
                  <div className="text-xs text-muted-foreground">
                    {currentSession.onTime ? '✅ On time' : '⏰ Late'}
                  </div>
                </div>
              </div>
              <Badge variant={currentSession.completed ? "default" : "secondary"}>
                {currentSession.completed ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => salahFocusTimer.endSession(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

            {/* Timer Display */}
            <div className="text-3xl font-bold text-primary mb-2">
              {formatTime(Math.floor(sessionDuration / 1000))}
            </div>

            {/* Progress */}
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-muted-foreground text-center">
                Raka'ah {currentSession.currentRakah} of {currentSession.rakahs}
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={updateRakah}
                disabled={currentSession.currentRakah >= currentSession.rakahs}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Next Raka'ah
              </Button>
              
              <Button
                size="sm"
                variant="default"
                onClick={endSession}
                className="flex items-center gap-1"
              >
                {currentSession.completed ? (
                  <>
                    <Clock className="w-3 h-3" />
                    Complete
                  </>
                ) : (
                  <>
                    <Pause className="w-3 h-3" />
                    End
                  </>
                )}
              </Button>
            </div>
          </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card className="fixed top-20 right-4 bg-background/95 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border-border/50 z-50 min-w-[320px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Focus Timer Settings
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={toggleSettings}>
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enable Haptics</span>
                <button
                  onClick={() => setSettings({ ...settings, enableHaptics: !settings.enableHaptics })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${settings.enableHaptics ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className="sr-only">Enable haptics</span>
                  <span className={`block h-4 w-4 rounded-full ${settings.enableHaptics ? 'bg-white' : 'bg-muted'}`}></span>
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Mute Audio During Salah</span>
                <button
                  onClick={() => setSettings({ ...settings, muteAudio: !settings.muteAudio })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${settings.muteAudio ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className="sr-only">Mute audio during Salah</span>
                  <span className={`block h-4 w-4 rounded-full ${settings.muteAudio ? 'bg-white' : 'bg-muted'}`}></span>
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Show Timer Overlay</span>
                <button
                  onClick={() => setSettings({ ...settings, showOverlay: !settings.showOverlay })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${settings.showOverlay ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className="sr-only">Show timer overlay</span>
                  <span className={`block h-4 w-4 rounded-full ${settings.showOverlay ? 'bg-white' : 'bg-muted'}`}></span>
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Auto-Detect Prayer Time</span>
                <button
                  onClick={() => setSettings({ ...settings, autoDetectPrayer: !settings.autoDetectPrayer })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${settings.autoDetectPrayer ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className="sr-only">Auto-detect prayer time</span>
                  <span className={`block h-4 w-4 rounded-full ${settings.autoDetectPrayer ? 'bg-white' : 'bg-muted'}`}></span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
