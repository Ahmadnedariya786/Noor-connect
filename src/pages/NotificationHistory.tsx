/**
 * Notification History Page
 * Displays all past notifications with filtering and management options
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Clock, Calendar, Heart, BookOpen, Trash2, Filter, Search, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AppBar } from '@/components/AppBar';
import { serviceWorkerManager, type NotificationHistoryItem } from '@/lib/service-worker-registration';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from "@/contexts/LanguageContext-new";
import { unifiedNotifications } from '@/lib/unified-notifications';

const NotificationHistory = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsSupported, setNotificationsSupported] = useState(false);

  // Load notification history
  useEffect(() => {
    loadNotificationHistory();

    // Listen for updates from Service Worker
    const handleHistoryUpdate = (event: CustomEvent<NotificationHistoryItem[]>) => {
      setNotifications(event.detail);
      applyFilters(event.detail, searchTerm, filterType);
    };

    window.addEventListener('notificationHistoryUpdate', handleHistoryUpdate as EventListener);

    // Check permission status
    unifiedNotifications.getPermissionStatus().then(status => {
      setNotificationsSupported(status === 'granted');
    });

    return () => {
      window.removeEventListener('notificationHistoryUpdate', handleHistoryUpdate as EventListener);
    };
  }, []);

  // Apply filters when search or filter changes
  useEffect(() => {
    applyFilters(notifications, searchTerm, filterType);
  }, [notifications, searchTerm, filterType]);

  const loadNotificationHistory = async () => {
    setIsLoading(true);
    try {
      const history = await serviceWorkerManager.getNotificationHistory();
      setNotifications(history);
      setFilteredNotifications(history);
    } catch (error) {
      console.error('Failed to load notification history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification history',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (items: NotificationHistoryItem[], search: string, type: string) => {
    let filtered = items;

    // Apply type filter
    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type);
    }

    // Apply search filter
    if (search) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.body.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredNotifications(filtered);
  };

  const clearAllHistory = async () => {
    try {
      await serviceWorkerManager.clearNotificationHistory();
      setNotifications([]);
      setFilteredNotifications([]);
      toast({
        title: 'Success',
        description: 'Notification history cleared successfully'
      });
    } catch (error) {
      console.error('Failed to clear notification history:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear notification history',
        variant: 'destructive'
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'prayer':
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'ramadan-countdown':
        return <Calendar className="w-5 h-5 text-green-500" />;
      case 'eid':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'friday-kahf':
        return <BookOpen className="w-5 h-5 text-purple-500" />;
      case 'daily-hadith':
        return <BookOpen className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'prayer':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'ramadan-countdown':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'eid':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'friday-kahf':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'daily-hadith':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return formatTimestamp(timestamp);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppBar
        title={t("notificationHistory") || "Notification History"}
        showBack={true}
      />

      <div className="p-4 space-y-4">
        {/* Filters and Search */}
        <Card className="p-4 bg-muted/30">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1">
                  <Filter className="w-4 h-4 ms-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="prayer">Prayer Times</SelectItem>
                  <SelectItem value="ramadan-countdown">Ramadan Countdown</SelectItem>
                  <SelectItem value="eid">Eid Greetings</SelectItem>
                  <SelectItem value="friday-kahf">Friday Kahf</SelectItem>
                  <SelectItem value="daily-hadith">Daily Hadith</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={clearAllHistory}
                className="text-destructive hover:text-destructive"
                disabled={notifications.length === 0}
              >
                <Trash2 className="w-4 h-4 me-2" />
                Clear All
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{notifications.length}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-blue-500">
              {notifications.filter(n => n.type === 'prayer').length}
            </div>
            <div className="text-xs text-muted-foreground">Prayers</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-green-500">
              {notifications.filter(n => n.type === 'ramadan-countdown').length}
            </div>
            <div className="text-xs text-muted-foreground">Ramadan</div>
          </Card>
          <Card className="p-3 text-center">
            <div className="text-2xl font-bold text-red-500">
              {notifications.filter(n => n.type === 'eid').length}
            </div>
            <div className="text-xs text-muted-foreground">Eid</div>
          </Card>
        </div>

        {/* Notification List */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Notifications</h3>
            <Badge variant="secondary">
              {filteredNotifications.length} of {notifications.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {notifications.length === 0
                  ? 'No notifications yet'
                  : 'No notifications match your filters'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {filteredNotifications.map((notification, index) => (
                  <Card key={`${notification.timestamp}-${index}`} className="p-4 bg-background/50 backdrop-blur-sm border-border/50 hover:bg-muted/40 transition-all duration-300 hover:shadow-md hover:border-primary/20 group cursor-default mb-3 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-start gap-4">
                      <div className="mt-1 bg-muted p-2 rounded-xl group-hover:bg-primary/10 transition-colors">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h4 className="font-semibold text-sm truncate text-foreground group-hover:text-primary transition-colors">{notification.title}</h4>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${getNotificationBadgeColor(notification.type)}`}
                          >
                            {notification.type.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed opacity-90">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/60">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{getRelativeTime(notification.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
              <ScrollBar />
            </ScrollArea>
          )}
        </Card>

        {/* Notification Engine Status */}
        <Card className="p-4 bg-muted/30">
          <h3 className="font-semibold mb-3">
            {unifiedNotifications.isRunningAsNativeApp() ? 'App Notification Status' : 'Browser Notification Status'}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${unifiedNotifications.isRunningAsNativeApp() || serviceWorkerManager.getRegistrationStatus().isRegistered ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>{unifiedNotifications.isRunningAsNativeApp() ? 'Native Bridge' : 'Service Worker'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${notificationsSupported ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Permissions</span>
            </div>
          </div>
          {unifiedNotifications.isRunningAsNativeApp() && (
            <p className="text-xs text-muted-foreground mt-3 italic">
              Running as Native Android App. Service Worker is replaced by Capacitor Native Bridge for better reliability.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default NotificationHistory;
