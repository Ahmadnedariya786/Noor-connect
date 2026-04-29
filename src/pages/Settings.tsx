import React from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, Monitor } from 'lucide-react';

const Settings = () => {
  const { 
    animationEnabled, 
    toggleAnimation, 
    greetingEnabled, 
    toggleGreeting, 
    splashGreetingEnabled,
    toggleSplashGreeting,
    theme, 
    setTheme, 
    effectiveTheme 
  } = useSettings();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background p-6">
      <h1 className="text-2xl font-bold mb-4">{t('settings')}</h1>
      <Card className="p-4 space-y-6">
        {/* Animation Toggle - Fixes the 3 non-working existing toggles */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t('animations')}</p>
            <p className="text-xs text-muted-foreground">Enable animations and transitions</p>
          </div>
          <Switch checked={animationEnabled} onCheckedChange={toggleAnimation} />
        </div>
        
        {/* Greeting Toggle - Existing salam greeting */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">{t('greeting')}</p>
            <p className="text-xs text-muted-foreground">Show salam greeting on app launch</p>
          </div>
          <Switch checked={greetingEnabled} onCheckedChange={toggleGreeting} />
        </div>

        {/* Splash Greeting Toggle - NEW: Show/hide splash welcome text */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Splash Welcome Text</p>
            <p className="text-xs text-muted-foreground">Show "Islamic Companion" on splash screen</p>
          </div>
          <Switch checked={splashGreetingEnabled} onCheckedChange={toggleSplashGreeting} />
        </div>
        <div className="space-y-3">
          <span className="text-sm font-medium">Theme</span>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('light')}
              className="flex-1 gap-2"
            >
              <Sun className="w-4 h-4" />
              Light
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('dark')}
              className="flex-1 gap-2"
            >
              <Moon className="w-4 h-4" />
              Dark
            </Button>
            <Button
              variant={theme === 'system' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTheme('system')}
              className="flex-1 gap-2"
            >
              <Monitor className="w-4 h-4" />
              System
            </Button>
          </div>
          {theme === 'system' && (
            <p className="text-xs text-muted-foreground">
              Currently using {effectiveTheme === 'dark' ? 'dark' : 'light'} theme based on system preference
            </p>
          )}
        </div>
      </Card>
      <Button className="mt-4" onClick={() => {
        // optional: reset to defaults
        localStorage.removeItem('animationEnabled');
        localStorage.removeItem('greetingEnabled');
        window.location.reload();
      }}>{t('reset')}</Button>
    </div>
  );
};

export default Settings;
