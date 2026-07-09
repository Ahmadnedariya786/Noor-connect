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

  // Device orientation detection
  private _motionHandler: ((event: DeviceMotionEvent) => void) | null = null;
  private isDeviceFlat = false;
  private deviceTolerance = 25; // degrees tolerance for "flat" position

  // Magnetic interference detection
  private _magneticFieldHandler: ((event: any) => void) | null = null;
  private magneticFieldStrength: number | null = null;
  private magneticInterferenceThreshold = 60; // microtesla threshold for interference
  private hasMagneticInterference = false;

  static getInstance(): NativeQiblaService {
    if (!NativeQiblaService.instance) {
      NativeQiblaService.instance = new NativeQiblaService();
    }
    return NativeQiblaService.instance;
  }

  async startCompass(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isListening) {
        return { success: true, message: 'Compass already started' };
      }

      // 1. Get initial location
      try {
        const coords = await GeolocationService.getCurrentPosition();
        this.location = coords;
      } catch (err) {
        console.warn('NativeQiblaService: Initial location failed, using default', err);
        this.location = { latitude: 21.4225, longitude: 39.8262, accuracy: 1000 };
      }

      // 2. Setup Location Watch
      this.watchId = await GeolocationService.watchPosition((coords) => {
        this.location = coords;
        this.updateQiblaData();
      });

      // 3. Setup Orientation Listener
      if (typeof window !== 'undefined') {
        const handleOrientation = (event: any) => {
          let heading: number | null = null;

          // iOS absolute heading
          if (typeof event.webkitCompassHeading === 'number' && !Number.isNaN(event.webkitCompassHeading)) {
            heading = event.webkitCompassHeading;
          }
          // Android / Modern Web absolute heading
          else if (event.absolute === true && typeof event.alpha === 'number' && !Number.isNaN(event.alpha)) {
            heading = 360 - event.alpha;
          }
          // Fallback if absolutely no other choice, but we prefer absolute/webkitCompassHeading
          else if (typeof event.alpha === 'number' && !Number.isNaN(event.alpha) && event.absolute !== false) {
             heading = 360 - event.alpha;
          }

          if (heading !== null) {
            this.lastHeading = normalizeDegrees(heading);
            this.updateQiblaData();
          }
        };

        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
        this._orientationHandler = handleOrientation;
      }

      // 4. Setup Motion Listener for device orientation detection
      if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
        const handleMotion = (event: DeviceMotionEvent) => {
          // Use accelerationIncludingGravity to detect device tilt
          if (event.accelerationIncludingGravity) {
            const x = event.accelerationIncludingGravity.x || 0;
            const y = event.accelerationIncludingGravity.y || 0;
            const z = event.accelerationIncludingGravity.z || 0;
            
            // Device is flat when gravity is mostly along Z axis
            const totalGravity = Math.sqrt(x * x + y * y + z * z);
            if (totalGravity > 0) {
              const zRatio = Math.abs(z) / totalGravity;
              // Device is flat if Z component is > 85% of total gravity
              this.isDeviceFlat = zRatio > 0.85;
            }
          }
          
          this.updateQiblaData();
        };

        window.addEventListener('devicemotion', handleMotion, true);
        this._motionHandler = handleMotion;
      }

      // 5. Setup Magnetic Field Listener for interference detection
      if (typeof window !== 'undefined' && 'Magnetometer' in window) {
        try {
          const magnetometer = new (window as any).Magnetometer({ frequency: 10 });
          magnetometer.addEventListener('reading', (event: any) => {
            const x = event.x || 0;
            const y = event.y || 0;
            const z = event.z || 0;
            
            // Calculate magnetic field strength
            this.magneticFieldStrength = Math.sqrt(x * x + y * y + z * z);
            
            // Check for interference (normal Earth field is 25-65 microtesla)
            this.hasMagneticInterference = this.magneticFieldStrength > this.magneticInterferenceThreshold ||
                                         this.magneticFieldStrength < 20;
            
            this.updateQiblaData();
          });
          
          magnetometer.start();
        } catch (error) {
          console.warn('Magnetometer not available:', error);
        }
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
      if (!this.isListening) {
        return { success: true, message: 'Compass already stopped' };
      }

      if (typeof window !== 'undefined' && this._orientationHandler) {
        window.removeEventListener('deviceorientationabsolute', this._orientationHandler, true);
        window.removeEventListener('deviceorientation', this._orientationHandler, true);
        this._orientationHandler = null;
      }

      if (typeof window !== 'undefined' && this._motionHandler) {
        window.removeEventListener('devicemotion', this._motionHandler, true);
        this._motionHandler = null;
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

  private updateQiblaData(): void {
    if (!this.location || this.lastHeading === null || !this.isListening) return;

    // Use magnetic declination corrected bearing for compass accuracy
    const qiblaBearing = calculateQiblaBearingMagneticSync(this.location.latitude, this.location.longitude);
    const rawCompass = this.lastHeading;

    // Apply low-pass filter to smooth out jitter
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

    this.listeners.forEach(listener => listener(data));
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getIsNative(): boolean {
    return this.isNative;
  }
}

export const nativeQiblaService = NativeQiblaService.getInstance();
