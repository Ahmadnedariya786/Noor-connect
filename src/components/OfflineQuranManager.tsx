import React, { useState, useEffect } from 'react';
import { useOfflineQuran, useStorageQuota } from '../hooks/useOfflineQuran';
import { backgroundSyncManager } from '../lib/background-sync';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from './ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  HardDrive, 
  Clock, 
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { formatBytes } from '../lib/utils';

export function OfflineQuranManager() {
  const {
    verses,
    surahs,
    audioSegments,
    isOnline,
    isSyncing,
    syncProgress,
    lastSyncTime,
    cacheStatus,
    sync,
    downloadAudio,
    removeAudio,
    clearCache,
    updateSyncConfig,
    error,
    clearError
  } = useOfflineQuran();

  const { usage, quota, percentage, isNearLimit, isLowSpace, checkQuota } = useStorageQuota();

  const [backgroundConfig, setBackgroundConfig] = useState({
    enabled: true,
    syncInterval: 60,
    wifiOnly: false,
    chargingOnly: false
  });

  const [selectedSurah, setSelectedSurah] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    // Load background sync config
    const config = backgroundSyncManager.getConfig();
    setBackgroundConfig(config);
  }, []);

  const handleBackgroundConfigChange = async (key: string, value: any) => {
    const newConfig = { ...backgroundConfig, [key]: value };
    setBackgroundConfig(newConfig);
    backgroundSyncManager.updateConfig({ [key]: value });
  };

  const handleDownloadSurah = async (surahNumber: number) => {
    setIsDownloading(true);
    try {
      await downloadAudio(surahNumber);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleRemoveSurah = async (
    surahNumber: number,
    fromVerse?: number,
    toVerse?: number
  ) => {
    await removeAudio(surahNumber, fromVerse, toVerse);
  };

  const formatLastSync = (timestamp: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getSyncStatusIcon = () => {
    if (error) return <XCircle className="h-5 w-5 text-red-500" />;
    if (!isOnline) return <WifiOff className="h-5 w-5 text-orange-500" />;
    if (isSyncing) return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
    if (cacheStatus.needsUpdate) return <AlertCircle className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getSyncStatusText = () => {
    if (error) return 'Sync Error';
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (cacheStatus.needsUpdate) return 'Update Available';
    return 'Up to Date';
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Offline Quran Manager</h1>
          <p className="text-muted-foreground">
            Manage your offline Quran content and synchronization settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getSyncStatusIcon()}
          <span className="font-medium">{getSyncStatusText()}</span>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Connection</p>
                <p className="text-2xl font-bold">{isOnline ? 'Online' : 'Offline'}</p>
              </div>
              {isOnline ? <Wifi className="h-8 w-8 text-green-500" /> : <WifiOff className="h-8 w-8 text-orange-500" />}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Cached Verses</p>
                <p className="text-2xl font-bold">{verses.length}</p>
              </div>
              <CheckCircle className={`h-8 w-8 ${cacheStatus.versesCached ? 'text-green-500' : 'text-gray-400'}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Audio Files</p>
                <p className="text-2xl font-bold">{audioSegments.length}</p>
              </div>
              <Download className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Storage</p>
                <p className="text-2xl font-bold">{Math.round(percentage)}%</p>
              </div>
              <HardDrive className={`h-8 w-8 ${isLowSpace ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-green-500'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sync" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
          <TabsTrigger value="content">Content Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Sync Status Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Synchronization Status</CardTitle>
              <CardDescription>
                Current sync status and last synchronization information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">{error}</span>
                  <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
                    Dismiss
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Sync Progress</span>
                  <span className="text-sm text-muted-foreground">{Math.round(syncProgress)}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Last Sync:</span>
                  <div className="text-muted-foreground">{formatLastSync(lastSyncTime)}</div>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <div className="text-muted-foreground">{getSyncStatusText()}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={sync} 
                  disabled={isSyncing || !isOnline}
                  className="flex-1"
                >
                  <RefreshCw className={`h-4 w-4 me-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
                <Button variant="outline" onClick={checkQuota}>
                  <HardDrive className="h-4 w-4 me-2" />
                  Check Storage
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Management Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>
                Download and manage Quran content for offline access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Quran Verses */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Quran Verses</h4>
                  <Badge variant={cacheStatus.versesCached ? 'default' : 'secondary'}>
                    {cacheStatus.versesCached ? 'Cached' : 'Not Cached'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {verses.length} verses cached for offline reading
                </p>
              </div>

              {/* Surah Information */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Surah Information</h4>
                  <Badge variant={cacheStatus.surahsCached ? 'default' : 'secondary'}>
                    {cacheStatus.surahsCached ? 'Cached' : 'Not Cached'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {surahs.length} surahs with metadata cached
                </p>
              </div>

              {/* Audio Downloads */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Audio Recitations</h4>
                  <Badge variant="outline">{audioSegments.length} files</Badge>
                </div>
                
                {audioSegments.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {audioSegments.map((segment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div className="text-sm">
                          <span className="font-medium">Surah {segment.surahNumber}</span>
                          <span className="text-muted-foreground ml-2">
                            Verses {segment.fromVerse}-{segment.toVerse}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSurah(segment.surahNumber, segment.fromVerse, segment.toVerse)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Download New Content */}
              <div className="space-y-2">
                <h4 className="font-medium">Download Content</h4>
                <div className="flex gap-2">
                  <Select value={selectedSurah} onValueChange={setSelectedSurah}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select a surah to download" />
                    </SelectTrigger>
                    <SelectContent>
                      {surahs.map((surah) => (
                        <SelectItem key={surah.number} value={surah.number.toString()}>
                          Surah {surah.number}: {surah.englishName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedSurah && handleDownloadSurah(parseInt(selectedSurah))}
                    disabled={!selectedSurah || isDownloading}
                  >
                    <Download className="h-4 w-4 me-2" />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              </div>

              {/* Storage Information */}
              <div className="space-y-2">
                <h4 className="font-medium">Storage Usage</h4>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>Used: {formatBytes(usage)}</span>
                    <span>Total: {formatBytes(quota)}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  {isLowSpace && (
                    <p className="text-sm text-red-500">
                      Storage space is running low. Consider removing some content.
                    </p>
                  )}
                </div>
              </div>

              {/* Clear Cache */}
              <Button variant="destructive" onClick={clearCache} className="w-full">
                <Trash2 className="h-4 w-4 me-2" />
                Clear All Cached Content
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>
                Configure automatic synchronization and background updates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auto Sync */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Auto Sync</label>
                  <p className="text-sm text-muted-foreground">
                    Automatically sync content when online
                  </p>
                </div>
                <Switch
                  checked={backgroundConfig.enabled}
                  onCheckedChange={(checked) => handleBackgroundConfigChange('enabled', checked)}
                />
              </div>

              {/* Sync Interval */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sync Interval</label>
                <Select
                  value={backgroundConfig.syncInterval.toString()}
                  onValueChange={(value) => handleBackgroundConfigChange('syncInterval', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="720">12 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* WiFi Only */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">WiFi Only</label>
                  <p className="text-sm text-muted-foreground">
                    Only sync when connected to WiFi
                  </p>
                </div>
                <Switch
                  checked={backgroundConfig.wifiOnly}
                  onCheckedChange={(checked) => handleBackgroundConfigChange('wifiOnly', checked)}
                />
              </div>

              {/* Charging Only */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium">Charging Only</label>
                  <p className="text-sm text-muted-foreground">
                    Only sync when device is charging
                  </p>
                </div>
                <Switch
                  checked={backgroundConfig.chargingOnly}
                  onCheckedChange={(checked) => handleBackgroundConfigChange('chargingOnly', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
