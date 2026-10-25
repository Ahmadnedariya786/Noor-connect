/**
 * Notification History Page
 * Displays all past notifications with filtering and management options
 * Fully tokenized with 5-theme CSS tokens, robust native permission detection,
 * and overflow-free filter dropdown.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Clock, Calendar, Heart, BookOpen, Trash2, Filter, Search } from 'lucide-react';
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

export default function NotificationHistory() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationHistoryItem[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<NotificationHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [notificationsSupported, setNotificationsSupported] = useState(false);

  const checkPermissionsStatus = useCallback(async () => {
    try {
      // 1. Check unified notifications provider
      const status = await unifiedNotifications.getPermissionStatus();
      if (status === 'granted') {
        setNotificationsSupported(true);
        return;
      }

      // 2. Check browser Notification API
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        setNotificationsSupported(true);
        return;
      }

      // 3. Check native Android via Capacitor LocalNotifications directly
      if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications');
          const check = await LocalNotifications.checkPermissions();
          if (check.display === 'granted') {
            setNotificationsSupported(true);
            return;
          }
        } catch {
          // Fall through to stored preference check
        }
      }

      // 4. Check user preferences & onboarding flags
      const prayerNotif = localStorage.getItem('prayer-notifications-enabled');
      const notifPerm = localStorage.getItem('notification-permission');
      const onboardingCompleted = localStorage.getItem('onboarding-completed');
      const isNative = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform());

      if (prayerNotif !== 'false' && (notifPerm === 'granted' || onboardingCompleted === 'true' || isNative)) {
        setNotificationsSupported(true);
        return;
      }

      setNotificationsSupported(false);
    } catch {
      setNotificationsSupported(false);
    }
  }, []);

  const loadNotificationHistory = useCallback(async () => {
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
  }, [toast]);

  // Load notification history and verify permissions
  useEffect(() => {
    loadNotificationHistory();
    checkPermissionsStatus();

    // Listen for updates from Service Worker
    const handleHistoryUpdate = (event: CustomEvent<NotificationHistoryItem[]>) => {
      setNotifications(event.detail);
      applyFilters(event.detail, searchTerm, filterType);
    };

    window.addEventListener('notificationHistoryUpdate', handleHistoryUpdate as EventListener);
    window.addEventListener('focus', checkPermissionsStatus);

    return () => {
      window.removeEventListener('notificationHistoryUpdate', handleHistoryUpdate as EventListener);
      window.removeEventListener('focus', checkPermissionsStatus);
    };
  }, [loadNotificationHistory, checkPermissionsStatus]);

  const applyFilters = useCallback((items: NotificationHistoryItem[], search: string, type: string) => {
    let filtered = items;

    // Apply type filter
    if (type !== 'all') {
      filtered = filtered.filter(item => item.type === type);
    }

    // Apply search filter
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q)
      );
    }

    setFilteredNotifications(filtered);
  }, []);

  // Apply filters when search or filter changes
  useEffect(() => {
    applyFilters(notifications, searchTerm, filterType);
  }, [notifications, searchTerm, filterType, applyFilters]);

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
        return <Clock className="w-5 h-5 text-[var(--accent)]" />;
      case 'ramadan-countdown':
        return <Calendar className="w-5 h-5 text-[var(--accent-text)]" />;
      case 'eid':
        return <Heart className="w-5 h-5 text-[var(--accent-2)]" />;
      case 'friday-kahf':
        return <BookOpen className="w-5 h-5 text-[var(--accent-text)]" />;
      case 'daily-hadith':
        return <BookOpen className="w-5 h-5 text-[var(--text-primary)]" />;
      default:
        return <Bell className="w-5 h-5 text-[var(--text-secondary)]" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'prayer':
        return 'bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]';
      case 'ramadan-countdown':
        return 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)]';
      case 'eid':
        return 'bg-[var(--accent-soft)] text-[var(--accent-2)] border border-[var(--border)]';
      case 'friday-kahf':
        return 'bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]';
      case 'daily-hadith':
        return 'bg-[var(--surface-2)] text-[var(--text-primary)] border border-[var(--border)]';
      default:
        return 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]';
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
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-24">
      <AppBar
        title={t("notificationHistory") || "Notification History"}
        showBack={true}
      />

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Filters and Search Card */}
        <Card className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
          <div className="space-y-3.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10 rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border)] placeholder:text-[var(--text-secondary)]"
              />
            </div>

            {/* Filter Dropdown + Clear All Button */}
            <div className="flex gap-2 items-center">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="flex-1 min-w-[155px] whitespace-nowrap rounded-xl bg-[var(--surface-2)] text-[var(--text-primary)] border-[var(--border)] font-semibold text-xs">
                  <Filter className="w-3.5 h-3.5 ms-1.5 shrink-0 text-[var(--accent)]" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)]">
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
                className="shrink-0 rounded-xl border-[var(--border)] bg-[var(--surface-2)] text-[var(--danger)] hover:bg-[var(--danger)]/15 font-bold text-xs h-9 px-3"
                disabled={notifications.length === 0}
              >
                <Trash2 className="w-3.5 h-3.5 me-1.5" />
                Clear All
              </Button>
            </div>
          </div>
        </Card>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <Card className="p-3 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
            <div className="text-2xl font-bold text-[var(--accent)]">{notifications.length}</div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Total</div>
          </Card>
          <Card className="p-3 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
            <div className="text-2xl font-bold text-[var(--accent-text)]">
              {notifications.filter(n => n.type === 'prayer').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Prayers</div>
          </Card>
          <Card className="p-3 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
            <div className="text-2xl font-bold text-[var(--accent)]">
              {notifications.filter(n => n.type === 'ramadan-countdown').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Ramadan</div>
          </Card>
          <Card className="p-3 text-center rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
            <div className="text-2xl font-bold text-[var(--accent-2)]">
              {notifications.filter(n => n.type === 'eid').length}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-medium">Eid</div>
          </Card>
        </div>

        {/* Notification List Card */}
        <Card className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-[var(--text-primary)]">Recent Notifications</h3>
            <Badge
              variant="outline"
              className="bg-[var(--surface-2)] text-[var(--accent-text)] border-[var(--border)] text-[10px] font-bold"
            >
              {filteredNotifications.length} of {notifications.length}
            </Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[var(--accent)] border-t-transparent"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="w-12 h-12 text-[var(--text-secondary)]/50 mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">
                {notifications.length === 0
                  ? 'No notifications yet'
                  : 'No notifications match your filters'
                }
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2.5">
                {filteredNotifications.map((notification, index) => (
                  <Card
                    key={`${notification.timestamp}-${index}`}
                    className="p-3.5 rounded-xl bg-[var(--surface-2)]/80 border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors shadow-sm"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 bg-[var(--surface)] p-2 rounded-xl shrink-0 border border-[var(--border)]">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="font-bold text-sm truncate text-[var(--text-primary)]">
                            {notification.title}
                          </h4>
                          <Badge
                            variant="secondary"
                            className={`text-[9.5px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shrink-0 ${getNotificationBadgeColor(notification.type)}`}
                          >
                            {notification.type.replace('-', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mb-2 leading-relaxed">
                          {notification.body}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--text-secondary)]/80">
                          <Clock className="w-3 h-3 text-[var(--accent)]" />
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

        {/* Notification Engine Status Card */}
        <Card className="p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-md">
          <h3 className="font-bold text-sm text-[var(--text-primary)] mb-3">
            {unifiedNotifications.isRunningAsNativeApp() ? 'App Notification Status' : 'Browser Notification Status'}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${unifiedNotifications.isRunningAsNativeApp() || serviceWorkerManager.getRegistrationStatus().isRegistered ? 'bg-[var(--success)] shadow-sm' : 'bg-[var(--danger)]'}`}></div>
              <span className="text-[var(--text-primary)]">{unifiedNotifications.isRunningAsNativeApp() ? 'Native Bridge' : 'Service Worker'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${notificationsSupported ? 'bg-[var(--success)] shadow-sm' : 'bg-[var(--danger)]'}`}></div>
              <span className="text-[var(--text-primary)]">Permissions</span>
            </div>
          </div>
          {unifiedNotifications.isRunningAsNativeApp() && (
            <p className="text-[11px] text-[var(--text-secondary)] mt-3 italic">
              Running as Native Android App. Service Worker is replaced by Capacitor Native Bridge for 100% background alarm reliability.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
