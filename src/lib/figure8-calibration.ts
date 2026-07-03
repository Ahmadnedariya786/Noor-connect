/**
 * Figure-8 Calibration Detector
 * 
 * Detects when the user performs a figure-8 motion with their device,
 * which calibrates the magnetometer by sampling the full range of
 * magnetic field values in all orientations.
 * 
 * Based on Android/iOS calibration patterns and NXP AN4248.
 */

export interface CalibrationSample {
  x: number;
  y: number;
  z: number;
  timestamp: number;
  heading: number;
  pitch: number;
  roll: number;
}

export interface CalibrationResult {
  isCalibrated: boolean;
  quality: number; // 0-1
  progress: number; // 0-1
  hardIronOffset?: { x: number; y: number; z: number };
  softIronMatrix?: number[][]; // 3x3 matrix
  scale?: number;
  message: string;
}

export interface CalibrationConfig {
  minSamples: number;
  maxDurationMs: number;
  minHeadingRange: number; // degrees
  minPitchRange: number;   // degrees
  minRollRange: number;    // degrees
  qualityThreshold: number;
}

const DEFAULT_CONFIG: CalibrationConfig = {
  minSamples: 100,
  maxDurationMs: 20000, // 20 seconds
  minHeadingRange: 300, // degrees - need near-full rotation
  minPitchRange: 90,    // degrees
  minRollRange: 90,     // degrees
  qualityThreshold: 0.75,
};

export class Figure8CalibrationDetector {
  private config: CalibrationConfig;
  private samples: CalibrationSample[] = [];
  private startTime = 0;
  private isActive = false;
  private lastQuality = 0;
  private lastHeading = 0;
  private headingWraps = 0;
  private maxHeading = -Infinity;
  private minHeading = Infinity;
  private maxPitch = -Infinity;
  private minPitch = Infinity;
  private maxRoll = -Infinity;
  private minRoll = Infinity;

  constructor(config: Partial<CalibrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start a new calibration session
   */
  start(): void {
    this.samples = [];
    this.startTime = Date.now();
    this.isActive = true;
    this.lastQuality = 0;
    this.lastHeading = 0;
    this.headingWraps = 0;
    this.maxHeading = -Infinity;
    this.minHeading = Infinity;
    this.maxPitch = -Infinity;
    this.minPitch = Infinity;
    this.maxRoll = -Infinity;
    this.minRoll = Infinity;
  }

  /**
   * Add a magnetometer sample with orientation
   */
  addSample(
    x: number, 
    y: number, 
    z: number, 
    heading: number, 
    pitch: number, 
    roll: number,
    timestamp: number = Date.now()
  ): CalibrationResult {
    if (!this.isActive) {
      return this.getResult();
    }

    // Track heading wraps (detect full rotations)
    const headingDiff = heading - this.lastHeading;
    if (headingDiff > 180) this.headingWraps--;
    else if (headingDiff < -180) this.headingWraps++;
    this.lastHeading = heading;

    // Update ranges
    this.maxHeading = Math.max(this.maxHeading, heading);
    this.minHeading = Math.min(this.minHeading, heading);
    this.maxPitch = Math.max(this.maxPitch, pitch);
    this.minPitch = Math.min(this.minPitch, pitch);
    this.maxRoll = Math.max(this.maxRoll, roll);
    this.minRoll = Math.min(this.minRoll, roll);

    // Store sample
    this.samples.push({ x, y, z, timestamp, heading, pitch, roll });

    // Remove old samples outside time window
    const cutoff = timestamp - this.config.maxDurationMs;
    this.samples = this.samples.filter(s => s.timestamp > cutoff);

    // Check if calibration is complete
    const result = this.getResult(timestamp);
    
    if (result.isCalibrated) {
      this.isActive = false;
    }

    return result;
  }

  /**
   * Get current calibration status
   */
  getResult(currentTime: number = Date.now()): CalibrationResult {
    if (!this.isActive && this.samples.length === 0) {
      return {
        isCalibrated: false,
        quality: 0,
        progress: 0,
        message: 'Not started',
      };
    }

    const sampleCount = this.samples.length;
    const elapsed = currentTime - this.startTime;
    
    // Calculate coverage
    const headingRange = this.maxHeading - this.minHeading + Math.abs(this.headingWraps) * 360;
    const pitchRange = this.maxPitch - this.minPitch;
    const rollRange = this.maxRoll - this.minRoll;

    // Heading progress (need ~360 degrees coverage)
    const headingProgress = Math.min(1, headingRange / this.config.minHeadingRange);
    
    // Pitch progress (need ~90 degrees coverage)
    const pitchProgress = Math.min(1, pitchRange / this.config.minPitchRange);
    
    // Roll progress (need ~90 degrees coverage)
    const rollProgress = Math.min(1, rollRange / this.config.minRollRange);

    // Sample count progress
    const sampleProgress = Math.min(1, sampleCount / this.config.minSamples);

    // Time progress
    const timeProgress = Math.min(1, elapsed / this.config.maxDurationMs);

    // Overall progress (weighted)
    const progress = (
      headingProgress * 0.4 +
      pitchProgress * 0.2 +
      rollProgress * 0.2 +
      sampleProgress * 0.1 +
      timeProgress * 0.1
    );

    // Quality based on coverage and sample count
    const coverageQuality = (headingProgress + pitchProgress + rollProgress) / 3;
    const quality = coverageQuality * sampleProgress;

    // Check if calibrated
    const isCalibrated = 
      quality >= this.config.qualityThreshold &&
      headingProgress >= 0.8 &&
      sampleCount >= this.config.minSamples;

    let message = 'Move device in figure-8 pattern';
    if (headingProgress < 0.5) message = 'Rotate device horizontally';
    else if (pitchProgress < 0.5) message = 'Tilt device forward/back';
    else if (rollProgress < 0.5) message = 'Tilt device left/right';
    else if (sampleProgress < 0.8) message = 'Keep moving...';
    else if (isCalibrated) message = 'Calibration complete!';

    // Calculate hard iron offset if calibrated
    let hardIronOffset: CalibrationResult['hardIronOffset'] = undefined;
    let softIronMatrix: CalibrationResult['softIronMatrix'] = undefined;
    let scale: CalibrationResult['scale'] = undefined;

    if (isCalibrated && sampleCount >= 50) {
      // Simple hard iron estimation: center of min/max sphere
      const xs = this.samples.map(s => s.x);
      const ys = this.samples.map(s => s.y);
      const zs = this.samples.map(s => s.z);

      const xMin = Math.min(...xs), xMax = Math.max(...xs);
      const yMin = Math.min(...ys), yMax = Math.max(...ys);
      const zMin = Math.min(...zs), zMax = Math.max(...zs);

      hardIronOffset = {
        x: (xMax + xMin) / 2,
        y: (yMax + yMin) / 2,
        z: (zMax + zMin) / 2,
      };

      // Scale estimation
      const xScale = (xMax - xMin) / 2;
      const yScale = (yMax - yMin) / 2;
      const zScale = (zMax - zMin) / 2;
      scale = (xScale + yScale + zScale) / 3;

      // Simple soft iron: diagonal matrix with inverse scales
      softIronMatrix = [
        [xScale / scale, 0, 0],
        [0, yScale / scale, 0],
        [0, 0, zScale / scale],
      ];
    }

    this.lastQuality = quality;

    return {
      isCalibrated,
      quality,
      progress,
      hardIronOffset,
      softIronMatrix,
      scale,
      message,
    };
  }

  /**
   * Get calibration data for applying corrections
   */
  getCalibrationData(): CalibrationResult {
    return this.getResult();
  }

  /**
   * Check if calibration is active
   */
  isCalibrating(): boolean {
    return this.isActive;
  }

  /**
   * Reset calibration
   */
  reset(): void {
    this.isActive = false;
    this.samples = [];
    this.startTime = 0;
    this.lastQuality = 0;
    this.lastHeading = 0;
    this.headingWraps = 0;
    this.maxHeading = -Infinity;
    this.minHeading = Infinity;
    this.maxPitch = -Infinity;
    this.minPitch = Infinity;
    this.maxRoll = -Infinity;
    this.minRoll = Infinity;
  }

  /**
   * Get sample count
   */
  getSampleCount(): number {
    return this.samples.length;
  }

  /**
   * Get elapsed time
   */
  getElapsedTime(): number {
    if (!this.isActive || this.startTime === 0) return 0;
    return Date.now() - this.startTime;
  }

  /**
   * Export samples for debugging/analysis
   */
  exportSamples(): CalibrationSample[] {
    return [...this.samples];
  }
}

/**
 * Apply calibration correction to magnetometer readings
 */
export function applyCalibration(
  rawX: number, 
  rawY: number, 
  rawZ: number,
  calibration: CalibrationResult
): { x: number; y: number; z: number } {
  if (!calibration.isCalibrated || !calibration.hardIronOffset || !calibration.softIronMatrix || !calibration.scale) {
    return { x: rawX, y: rawY, z: rawZ };
  }

  const { hardIronOffset, softIronMatrix, scale } = calibration;

  // Subtract hard iron offset
  const x = rawX - hardIronOffset.x;
  const y = rawY - hardIronOffset.y;
  const z = rawZ - hardIronOffset.z;

  // Apply soft iron correction (3x3 matrix multiply)
  const xCorrected = softIronMatrix[0][0] * x + softIronMatrix[0][1] * y + softIronMatrix[0][2] * z;
  const yCorrected = softIronMatrix[1][0] * x + softIronMatrix[1][1] * y + softIronMatrix[1][2] * z;
  const zCorrected = softIronMatrix[2][0] * x + softIronMatrix[2][1] * y + softIronMatrix[2][2] * z;

  // Apply scale normalization
  return {
    x: xCorrected * scale,
    y: yCorrected * scale,
    z: zCorrected * scale,
  };
}

/**
 * Calculate raw heading from magnetometer (no tilt compensation)
 */
export function calculateRawHeading(x: number, y: number, z: number): number {
  // Simple 2D heading from X/Y components
  // Note: This assumes device is relatively level
  // For proper tilt compensation, use Madgwick or Complementary filter
  const heading = Math.atan2(y, x) * 180 / Math.PI;
  return ((heading + 360) % 360);
}

/**
 * Calculate tilt-compensated heading
 * Uses accelerometer to tilt-compensate magnetometer
 */
export function calculateTiltCompensatedHeading(
  mx: number, my: number, mz: number,
  ax: number, ay: number, az: number
): number {
  // Normalize accelerometer
  const normAccel = Math.sqrt(ax * ax + ay * ay + az * az);
  if (normAccel === 0) return 0;
  
  const ax_n = ax / normAccel;
  const ay_n = ay / normAccel;
  const az_n = az / normAccel;

  // Roll and pitch from accelerometer
  const roll = Math.atan2(ay_n, az_n);
  const pitch = Math.atan2(-ax_n, Math.sqrt(ay_n * ay_n + az_n * az_n));

  // Tilt compensation
  const cosRoll = Math.cos(roll);
  const sinRoll = Math.sin(roll);
  const cosPitch = Math.cos(pitch);
  const sinPitch = Math.sin(pitch);

  // Tilt-compensated magnetometer components
  const mxComp = mx * cosPitch + my * sinRoll * sinPitch + mz * cosRoll * sinPitch;
  const myComp = my * cosRoll - mz * sinRoll;

  const heading = Math.atan2(-myComp, mxComp) * 180 / Math.PI;
  return ((heading + 360) % 360);
}