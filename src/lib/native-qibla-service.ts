import { Capacitor } from '@capacitor/core';
import { GeolocationService, type LocationCoordinates } from './geolocation-service';
import { calculateQiblaBearing, calculateQiblaBearingMagneticSync, normalizeDegrees } from './qibla';

export interface QiblaDirectionData {
  isFacingQibla: boolean;
  compassAngle: number;
  needleAngle: number;
  qiblaBearing: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  isDeviceFlat?: boolean;
  magneticInterference?: boolean;
}

export interface PermissionStatus {
  permissions: {
    ACCESS_FINE_LOCATION: boolean;
    ACCESS_COARSE_LOCATION: boolean;
  };
  allGranted: boolean;
}

export class NativeQiblaService {
  private static instance: NativeQiblaService;
  private isNative = Capacitor.isNativePlatform();
  private isListening = false;
  private listeners: Set<(data: QiblaDirectionData) => void> = new Set();

  private location: LocationCoordinates | null = null;
  private lastHeading: number | null = null;
  private watchId: string | null = null;

  // Smoothing state
  private lastCompassAngle: number | null = null;
  private smoothingFactor = 0.15;
  private _orientationHandler: ((event: DeviceOrientationEvent) => void) | null = null;
  private isDeviceFlat = true;
  private deviceTolerance = 25; // degrees tolerance for "flat" position
  private hasMagneticInterference = false;

  private rafId: number | null = null;

  static getInstance(): NativeQiblaService {
    if (!NativeQiblaService.instance) {
      NativeQiblaService.instance = new NativeQiblaService();
    }
    return NativeQiblaService.instance;
  }

  updateLocation(coords: LocationCoordinates): void {
    if (coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number' && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
      this.location = coords;
      this.scheduleUpdate();
    }
  }

  async startCompass(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isListening) {
        return { success: true, message: 'Compass already started' };
      }

      // 1. Get initial location with non-blocking fallback
      if (!this.location) {
        try {
          const coords = await GeolocationService.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000,
          });
          this.location = coords;
        } catch {
          this.location = { latitude: 21.4225, longitude: 39.8262, accuracy: 1000 };
        }
      }

      // 2. Setup Orientation Listener with RAF throttle
      if (typeof window !== 'undefined') {
        let absoluteFired = false;

        const handleOrientation = (event: any) => {
          if (!this.isListening) return;
          try {
            // If deviceorientationabsolute is available, ignore generic deviceorientation
            if (event.type === 'deviceorientation' && absoluteFired) return;
            if (event.type === 'deviceorientationabsolute') absoluteFired = true;

            let heading: number | null = null;

            // iOS absolute heading
            if (typeof event.webkitCompassHeading === 'number' && Number.isFinite(event.webkitCompassHeading)) {
              heading = event.webkitCompassHeading;
            }
            // Android / Modern Web absolute heading
            else if (event.absolute === true && typeof event.alpha === 'number' && Number.isFinite(event.alpha)) {
              heading = 360 - event.alpha;
            }
            // Fallback
            else if (typeof event.alpha === 'number' && Number.isFinite(event.alpha) && event.absolute !== false) {
              heading = 360 - event.alpha;
            }

            if (heading !== null && Number.isFinite(heading)) {
              this.lastHeading = normalizeDegrees(heading);
            }

            // Tilt detection from beta and gamma without unstable devicemotion
            if (typeof event.beta === 'number' && typeof event.gamma === 'number') {
              this.isDeviceFlat = Math.abs(event.beta) < this.deviceTolerance && Math.abs(event.gamma) < this.deviceTolerance;
            }

            this.scheduleUpdate();
          } catch (e) {
            console.warn('NativeQiblaService handleOrientation error:', e);
          }
        };

        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
        this._orientationHandler = handleOrientation;
      }

      this.isListening = true;
      return { success: true, message: 'Compass started successfully' };
    } catch (error) {
      console.error('Failed to start compass:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async stopCompass(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.rafId !== null && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }

      if (typeof window !== 'undefined' && this._orientationHandler) {
        window.removeEventListener('deviceorientationabsolute', this._orientationHandler, true);
        window.removeEventListener('deviceorientation', this._orientationHandler, true);
        this._orientationHandler = null;
      }

      if (this.watchId) {
        await GeolocationService.clearWatch(this.watchId);
        this.watchId = null;
      }

      this.isListening = false;
      return { success: true, message: 'Compass stopped successfully' };
    } catch (error) {
      console.error('Failed to stop compass:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getQiblaDirection(): Promise<{
    success: boolean;
    message: string;
    isListening?: boolean;
  }> {
    return {
      success: true,
      message: 'Qibla tracking status',
      isListening: this.isListening
    };
  }

  async checkPermissions(): Promise<PermissionStatus> {
    const status = await GeolocationService.checkPermissions();
    const granted = status.location === 'granted';
    return {
      permissions: {
        ACCESS_FINE_LOCATION: granted,
        ACCESS_COARSE_LOCATION: granted,
      },
      allGranted: granted,
    };
  }

  onQiblaDirectionChange(callback: (data: QiblaDirectionData) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private scheduleUpdate(): void {
    if (this.rafId !== null) return;
    if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null;
        this.updateQiblaData();
      });
    } else {
      this.updateQiblaData();
    }
  }

  private updateQiblaData(): void {
    if (!this.location || this.lastHeading === null || !this.isListening) return;

    try {
      const qiblaBearing = calculateQiblaBearingMagneticSync(this.location.latitude, this.location.longitude);
      const rawCompass = this.lastHeading;

      let smoothedCompass = rawCompass;
      if (this.lastCompassAngle !== null) {
        let diff = rawCompass - this.lastCompassAngle;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        smoothedCompass = (this.lastCompassAngle + diff * this.smoothingFactor + 360) % 360;
      }
      this.lastCompassAngle = smoothedCompass;

      const diff = Math.abs(normalizeDegrees(smoothedCompass - qiblaBearing));
      const isFacingQibla = diff < 10 || diff > 350;

      const data: QiblaDirectionData = {
        isFacingQibla,
        compassAngle: smoothedCompass,
        needleAngle: qiblaBearing,
        qiblaBearing,
        latitude: this.location.latitude,
        longitude: this.location.longitude,
        accuracy: this.location.accuracy,
        isDeviceFlat: this.isDeviceFlat,
        magneticInterference: this.hasMagneticInterference,
      };

      this.listeners.forEach(listener => {
        try {
          listener(data);
        } catch (lErr) {
          console.warn('Qibla listener error:', lErr);
        }
      });
    } catch (err) {
      console.warn('updateQiblaData error:', err);
    }
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsNative(): boolean {
    return this.isNative;
  }
}

export const nativeQiblaService = NativeQiblaService.getInstance();
