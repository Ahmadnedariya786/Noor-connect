/**
 * Widget Refresh System
 * Handles real-time updates for dashboard widgets
 */

import React from 'react';

export class WidgetRefreshManager {
  private static instance: WidgetRefreshManager;
  private refreshInterval: NodeJS.Timeout | null = null;
  private listeners: Map<string, (() => void)[]> = new Map();
  private readonly REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.setupVisibilityListener();
    this.setupIntervalRefresh();
  }

  static getInstance(): WidgetRefreshManager {
    if (!WidgetRefreshManager.instance) {
      WidgetRefreshManager.instance = new WidgetRefreshManager();
    }
    return WidgetRefreshManager.instance;
  }

  /**
   * Register a widget for refresh events
   */
  subscribe(widgetId: string, callback: () => void) {
    if (!this.listeners.has(widgetId)) {
      this.listeners.set(widgetId, []);
    }
    this.listeners.get(widgetId)!.push(callback);
  }

  /**
   * Unregister a widget
   */
  unsubscribe(widgetId: string, callback: () => void) {
    const callbacks = this.listeners.get(widgetId);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Trigger refresh for all widgets
   */
  refreshAll() {
    this.listeners.forEach((callbacks) => {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error refreshing widget:', error);
        }
      });
    });

    // Dispatch global event for components that don't use the subscription system
    window.dispatchEvent(new CustomEvent('widget-refresh'));
  }

  /**
   * Trigger refresh for specific widget
   */
  refreshWidget(widgetId: string) {
    const callbacks = this.listeners.get(widgetId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`Error refreshing widget ${widgetId}:`, error);
        }
      });
    }
  }

  /**
   * Setup visibility change listener to refresh when app becomes active
   */
  private setupVisibilityListener() {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App became visible, refresh widgets
        setTimeout(() => {
          this.refreshAll();
        }, 1000); // Small delay to ensure app is fully active
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  /**
   * Setup periodic refresh interval
   */
  private setupIntervalRefresh() {
    this.refreshInterval = setInterval(() => {
      if (!document.hidden) {
        this.refreshAll();
      }
    }, this.REFRESH_INTERVAL);
  }

  /**
   * Cleanup intervals and listeners
   */
  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.listeners.clear();
  }
}

// React hook for widget refresh
export function useWidgetRefresh(widgetId: string, callback: () => void) {
  const refreshManager = WidgetRefreshManager.getInstance();

  React.useEffect(() => {
    refreshManager.subscribe(widgetId, callback);

    return () => {
      refreshManager.unsubscribe(widgetId, callback);
    };
  }, [widgetId, callback]);
}

// Global refresh function
export const refreshAllWidgets = () => {
  WidgetRefreshManager.getInstance().refreshAll();
};

// Export singleton instance
export const widgetRefreshManager = WidgetRefreshManager.getInstance();

// Auto-cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    widgetRefreshManager.destroy();
  });
}
