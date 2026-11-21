/**
 * Persistent Audio Notifications Service
 * Handles system-level notifications for audio playback (Quran recitation & radio)
 */

export interface AudioNotificationData {
  type: 'quran-recitation' | 'quran-radio';
  title: string;
  artist: string;
  album?: string;
  artwork?: MediaImage[];
  isPlaying: boolean;
  currentTime?: number;
  duration?: number;
}

import { NotificationContentGenerator, NotificationUtils } from './notification-content';

class AudioNotificationService {
  private notification: Notification | null = null;
  private mediaSession: MediaSession | null = null;
  private isSupported = false;
  private eventListeners: Map<string, ((event: any) => void)[]> = new Map();

  constructor() {
    this.checkSupport();
    this.setupMediaSession();
  }

  private checkSupport() {
    this.isSupported = 'Notification' in window && 'mediaSession' in navigator;
  }

  private setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    this.mediaSession = navigator.mediaSession;
    
    // Default action handlers
    this.mediaSession.setActionHandler('play', () => {
      this.emit('play');
    });

    this.mediaSession.setActionHandler('pause', () => {
      this.emit('pause');
    });

    this.mediaSession.setActionHandler('stop', () => {
      this.emit('stop');
    });

    this.mediaSession.setActionHandler('previoustrack', () => {
      this.emit('previous');
    });

    this.mediaSession.setActionHandler('nexttrack', () => {
      this.emit('next');
    });
  }

  // Request notification permission
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    if (Notification.permission === 'granted') return true;
    
    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    
    return false;
  }

  // Generate rich notification body content
  private getNotificationBody(data: AudioNotificationData): string {
    const baseInfo = `${data.title} • ${data.artist}`;
    
    // Add progress information if available
    if (data.currentTime !== undefined && data.duration !== undefined) {
      const currentMinutes = Math.floor(data.currentTime / 60);
      const currentSeconds = Math.floor(data.currentTime % 60).toString().padStart(2, '0');
      const durationMinutes = Math.floor(data.duration / 60);
      const durationSeconds = Math.floor(data.duration % 60).toString().padStart(2, '0');
      const progress = `${currentMinutes}:${currentSeconds} / ${durationMinutes}:${durationSeconds}`;
      
      // Add type-specific information
      if (data.type === 'quran-recitation') {
        return `${baseInfo}\n📖 Quran Recitation • ${progress}`;
      } else if (data.type === 'quran-radio') {
        return `${baseInfo}\n📻 Live Radio Stream • ${progress}`;
      }
    }
    
    // Fallback without progress
    if (data.type === 'quran-recitation') {
      return `${baseInfo}\n📖 Holy Quran Recitation`;
    } else if (data.type === 'quran-radio') {
      return `${baseInfo}\n📻 Quran Radio Live`;
    }
    
    return baseInfo;
  }

  // Show persistent notification for audio playback
  async showNotification(data: AudioNotificationData): Promise<void> {
    if (!this.isSupported) return;

    const hasPermission = await this.requestPermission();
    if (!hasPermission) return;

    // Close existing notification
    if (this.notification) {
      this.notification.close();
    }

    // Update media session metadata
    this.updateMediaSession(data);

    // Create rich notification content based on type
    const notificationTitle = data.isPlaying ? '🎵 Now Playing' : '⏸️ Paused';
    const notificationBody = this.getNotificationBody(data);
    
    // Create notification with enhanced options
    this.notification = new Notification(notificationTitle, {
      body: notificationBody,
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
      tag: 'noor-audio-playback', // Unique tag to replace existing notifications
      requireInteraction: false, // Don't require user interaction
      silent: false, // Play notification sound
      // Rich notification data
      data: {
        type: data.type,
        title: data.title,
        artist: data.artist,
        isPlaying: data.isPlaying,
        currentTime: data.currentTime,
        duration: data.duration,
        timestamp: Date.now()
      }
    });

    // Handle notification clicks
    this.notification.onclick = (event) => {
      // Handle notification click to bring app to focus
      this.emit('focus');
      window.focus();
      
      // Also emit the specific action if it's an action click
      if (event instanceof Event && (event as any).action) {
        this.emit('action', (event as any).action);
      }
    };

    // Handle notification events
    this.notification.onshow = () => {
      console.log('Audio notification shown with rich content');
      this.emit('notification-shown', data);
    };

    this.notification.onclose = () => {
      console.log('Audio notification closed');
      this.notification = null;
      this.emit('notification-closed');
    };

    this.notification.onerror = (error) => {
      console.error('Notification error:', error);
      this.emit('notification-error', error);
    };
  }

  // Update media session metadata
  private updateMediaSession(data: AudioNotificationData): void {
    if (!this.mediaSession) return;

    // Use artwork directly if available, otherwise use default icons
    const artwork: MediaImage[] = data.artwork || [
      { src: '/icon-96x96.png', sizes: '96x96', type: 'image/png' },
      { src: '/icon-128x128.png', sizes: '128x128', type: 'image/png' },
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { src: '/icon-384x384.png', sizes: '384x384', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ];

    this.mediaSession.metadata = new MediaMetadata({
      title: data.title,
      artist: data.artist,
      album: data.album || 'Siraj',
      artwork
    });

    // Update playback state
    this.mediaSession.playbackState = data.isPlaying ? 'playing' : 'paused';

    // Update position state if available
    if (data.currentTime !== undefined && data.duration !== undefined) {
      this.mediaSession.setPositionState({
        duration: data.duration,
        position: data.currentTime,
        playbackRate: 1.0
      });
    }
  }

  // Update notification without recreating it
  updateNotification(data: Partial<AudioNotificationData>): void {
    if (!this.notification) return;

    // Update media session
    if (data.title || data.artist || data.isPlaying) {
      this.updateMediaSession({
        type: 'quran-recitation', // Default type
        title: data.title || this.notification.title || 'Quran Audio',
        artist: data.artist || '',
        isPlaying: data.isPlaying || false,
        currentTime: data.currentTime,
        duration: data.duration
      });
    }

    // Update notification content
    if (data.isPlaying !== undefined) {
      const notificationTitle = data.isPlaying ? '🎵 Now Playing' : '⏸️ Paused';
      
      // Note: Browser doesn't allow updating notification body after creation
      // So we close and recreate if significant changes
      this.closeNotification();
      this.showNotification({
        type: 'quran-recitation',
        title: data.title || 'Quran Audio',
        artist: data.artist || 'Reciter',
        isPlaying: data.isPlaying,
        currentTime: data.currentTime,
        duration: data.duration
      });
    }
  }

  // Close notification
  closeNotification(): void {
    if (this.notification) {
      this.notification.close();
      this.notification = null;
    }
  }

  // Event system
  on(event: string, callback: (event: any) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: (event: any) => void) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  // Enhanced background audio setup
  setupBackgroundAudio(audioElement: HTMLAudioElement): void {
    if (!audioElement) return;

    // Enable background playback on iOS
    if ('webkitSetPlaybackTarget' in audioElement) {
      // AirPlay support
      (audioElement as any).webkitSetPlaybackTarget(null);
    }

    // Set up audio context for better background handling
    if (!window.AudioContext) return;

    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioElement);
    source.connect(audioContext.destination);

    // Keep audio context alive
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    console.log('Background audio setup complete');
  }

  // Check if background playback is supported
  isBackgroundPlaybackSupported(): boolean {
    return this.isSupported && !!navigator.mediaSession;
  }

  // Cleanup
  destroy(): void {
    this.closeNotification();
    this.eventListeners.clear();
    
    if (this.mediaSession) {
      // Clear media session handlers
      this.mediaSession.setActionHandler('play', null);
      this.mediaSession.setActionHandler('pause', null);
      this.mediaSession.setActionHandler('stop', null);
      this.mediaSession.setActionHandler('previoustrack', null);
      this.mediaSession.setActionHandler('nexttrack', null);
    }
  }
}

export const audioNotificationService = new AudioNotificationService();
