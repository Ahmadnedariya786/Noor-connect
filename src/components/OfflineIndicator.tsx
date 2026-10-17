import React, { useState, useEffect } from 'react';
import { useOfflineQuran } from '../hooks/useOfflineQuran';
import { Wifi, WifiOff, Download, RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';

interface OfflineIndicatorProps {
  className?: string;
  showDetailedStatus?: boolean;
}

export function OfflineIndicator({ className = '', showDetailedStatus = false }: OfflineIndicatorProps) {
  const {
    isOnline,
    isSyncing,
    syncProgress,
    lastSyncTime,
    cacheStatus,
    sync,
    error,
    clearError,
    updateSyncConfig
  } = useOfflineQuran();

  const [showDetails, setShowDetails] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  useEffect(() => {
    // Load auto-sync preference
    const saved = localStorage.getItem('auto-sync-enabled');
    if (saved !== null) {
      setAutoSyncEnabled(JSON.parse(saved));
    }
  }, []);

  const handleAutoSyncToggle = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    localStorage.setItem('auto-sync-enabled', JSON.stringify(enabled));
    updateSyncConfig({ autoSync: enabled });
  };

  const formatLastSyncTime = (timestamp: number) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const getStatusColor = () => {
    if (error) return 'text-red-500';
    if (!isOnline) return 'text-orange-500';
    if (isSyncing) return 'text-blue-500';
    if (cacheStatus.needsUpdate) return 'text-yellow-500';
    return 'text-[var(--success)]';
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="h-4 w-4" />;
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (cacheStatus.needsUpdate) return <Download className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusText = () => {
    if (error) return 'Sync Error';
    if (!isOnline) return 'Offline';
    if (isSyncing) return 'Syncing...';
    if (cacheStatus.needsUpdate) return 'Update Available';
    return 'Synced';
  };

  if (!showDetailedStatus) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-2 ${getStatusColor()} ${className}`}>
              {getStatusIcon()}
              <span className="text-sm font-medium">{getStatusText()}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-sm space-y-1">
              <p>Status: {getStatusText()}</p>
              <p>Last sync: {formatLastSyncTime(lastSyncTime)}</p>
              {error && <p className="text-red-500">Error: {error}</p>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-auto p-2 ${getStatusColor()}`}
        >
          {getStatusIcon()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Offline Status</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDetails(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection</span>
            <Badge variant={isOnline ? 'default' : 'destructive'}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>

          {/* Sync Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Sync Status</span>
              <Badge variant={isSyncing ? 'secondary' : 'default'}>
                {isSyncing ? 'Syncing...' : getStatusText()}
              </Badge>
            </div>
            
            {isSyncing && (
              <div className="space-y-1">
                <Progress value={syncProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{Math.round(syncProgress)}%</p>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Last sync</span>
              <span>{formatLastSyncTime(lastSyncTime)}</span>
            </div>
          </div>

          {/* Cache Status */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Cached Content</span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Quran Verses</span>
                <Badge variant={cacheStatus.versesCached ? 'default' : 'secondary'}>
                  {cacheStatus.versesCached ? 'Cached' : 'Not Cached'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Surah Info</span>
                <Badge variant={cacheStatus.surahsCached ? 'default' : 'secondary'}>
                  {cacheStatus.surahsCached ? 'Cached' : 'Not Cached'}
                </Badge>
              </div>
              <div className="flex items-center justify-between col-span-2">
                <span>Audio Downloads</span>
                <Badge variant="outline">
                  {cacheStatus.audioDownloaded} files
                </Badge>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Error</span>
              </div>
              <p className="text-xs text-red-500 bg-red-50 p-2 rounded">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearError}
                className="w-full"
              >
                Dismiss Error
              </Button>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={sync}
              disabled={isSyncing || !isOnline}
              className="w-full"
              size="sm"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>

            <div className="flex items-center justify-between">
              <span className="text-sm">Auto-sync</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleAutoSyncToggle(!autoSyncEnabled)}
                className="h-6 px-2"
              >
                <Badge variant={autoSyncEnabled ? 'default' : 'secondary'}>
                  {autoSyncEnabled ? 'On' : 'Off'}
                </Badge>
              </Button>
            </div>
          </div>

          {/* Storage Info */}
          <div className="text-xs text-muted-foreground border-t pt-2">
            <p>Content is stored locally for offline access.</p>
            <p>Enable auto-sync to keep content updated.</p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Compact version for mobile or tight spaces
export function CompactOfflineIndicator({ className = '' }: { className?: string }) {
  const { isOnline, isSyncing, cacheStatus } = useOfflineQuran();

  const getIndicatorColor = () => {
    if (!isOnline) return 'bg-orange-500';
    if (isSyncing) return 'bg-blue-500';
    if (cacheStatus.needsUpdate) return 'bg-yellow-500';
    return 'bg-[var(--success)]';
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`w-2 h-2 rounded-full ${getIndicatorColor()}`} />
      {isSyncing && (
        <div className={`absolute inset-0 w-2 h-2 rounded-full ${getIndicatorColor()} animate-ping`} />
      )}
    </div>
  );
}
