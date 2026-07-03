/**
 * Madgwick Filter for Sensor Fusion
 * 
 * Fuses magnetometer, accelerometer, and gyroscope data to produce
 * a stable, tilt-compensated heading (yaw).
 * 
 * Based on: "An efficient orientation filter for inertial and magnetic sensor arrays"
 * by Sebastian Madgwick (2010)
 * 
 * Reference implementation: https://x-io.co.uk/open-source-ahrs-with-x-imu/
 */

export interface SensorData {
  // Accelerometer (m/s^2)
  ax: number;
  ay: number;
  az: number;
  // Magnetometer (μT)
  mx: number;
  my: number;
  mz: number;
  // Gyroscope (rad/s)
  gx?: number;
  gy?: number;
  gz?: number;
  // Timestamp (ms)
  timestamp: number;
}

export interface Orientation {
  // Quaternion components
  q1: number; // w
  q2: number; // x
  q3: number; // y
  q4: number; // z
  // Euler angles (degrees)
  roll: number;   // x-axis rotation
  pitch: number;  // y-axis rotation
  yaw: number;    // z-axis rotation (heading)
}

export class MadgwickFilter {
  private beta: number;        // Algorithm gain (0.033 default)
  private samplePeriod: number; // 1 / sample frequency
  
  // Quaternion state
  private q1 = 1.0;
  private q2 = 0.0;
  private q3 = 0.0;
  private q4 = 0.0;
  
  // Initialization flag
  private initialized = false;
  private lastTimestamp = 0;

  constructor(beta: number = 0.033, sampleFrequency: number = 50) {
    this.beta = beta;
    this.samplePeriod = 1.0 / sampleFrequency;
  }

  /**
   * Set algorithm gain (beta)
   * Lower = more stable but slower convergence
   * Higher = faster convergence but more noise
   */
  setBeta(beta: number): void {
    this.beta = beta;
  }

  /**
   * Set sample frequency
   */
  setSampleFrequency(freq: number): void {
    this.samplePeriod = 1.0 / freq;
  }

  /**
   * Reset filter to initial state
   */
  reset(): void {
    this.q1 = 1.0;
    this.q2 = 0.0;
    this.q3 = 0.0;
    this.q4 = 0.0;
    this.initialized = false;
    this.lastTimestamp = 0;
  }

  /**
   * Update filter with new sensor data
   * If gyroscope data is provided, uses 9-DOF fusion
   * If only accel + mag, uses 6-DOF fusion (with orientation estimate)
   */
  update(sensor: SensorData): Orientation {
    const { ax, ay, az, mx, my, mz, gx, gy, gz, timestamp } = sensor;
    
    // Calculate time delta
    let dt = this.samplePeriod;
    if (this.initialized && this.lastTimestamp > 0) {
      dt = (timestamp - this.lastTimestamp) / 1000.0; // Convert ms to seconds
      // Clamp dt to reasonable range
      dt = Math.max(0.001, Math.min(1.0, dt));
    }
    this.lastTimestamp = timestamp;

    // Normalize accelerometer measurement
    const normAccel = Math.sqrt(ax * ax + ay * ay + az * az);
    if (normAccel === 0) {
      return this.getOrientation(); // Skip update if invalid
    }
    const ax_n = ax / normAccel;
    const ay_n = ay / normAccel;
    const az_n = az / normAccel;

    // Normalize magnetometer measurement
    const normMag = Math.sqrt(mx * mx + my * my + mz * mz);
    if (normMag === 0) {
      return this.getOrientation(); // Skip update if invalid
    }
    const mx_n = mx / normMag;
    const my_n = my / normMag;
    const mz_n = mz / normMag;

    // Reference direction of Earth's magnetic field
    const hx = 2 * (mx_n * (0.5 - this.q3 * this.q3 - this.q4 * this.q4) + 
                     my_n * (this.q2 * this.q3 - this.q1 * this.q4) + 
                     mz_n * (this.q2 * this.q4 + this.q1 * this.q3));
    const hy = 2 * (mx_n * (this.q2 * this.q3 + this.q1 * this.q4) + 
                     my_n * (0.5 - this.q2 * this.q2 - this.q4 * this.q4) + 
                     mz_n * (this.q3 * this.q4 - this.q1 * this.q2));
    const hz = 2 * (mx_n * (this.q2 * this.q4 - this.q1 * this.q3) + 
                     my_n * (this.q3 * this.q4 + this.q1 * this.q2) + 
                     mz_n * (0.5 - this.q2 * this.q2 - this.q3 * this.q3));
    const bx = Math.sqrt(hx * hx + hy * hy);
    const bz = hz;

    // Estimated direction of gravity
    const vx = 2 * (this.q2 * this.q4 - this.q1 * this.q3);
    const vy = 2 * (this.q1 * this.q2 + this.q3 * this.q4);
    const vz = this.q1 * this.q1 - this.q2 * this.q2 - this.q3 * this.q3 + this.q4 * this.q4;

    // Error between estimated and measured direction of gravity
    const ex_g = ay_n * vz - az_n * vy;
    const ey_g = az_n * vx - ax_n * vz;
    const ez_g = ax_n * vy - ay_n * vx;

    // Error between estimated and measured direction of magnetic field
    const ex_m = my_n * bz - mz_n * vy;
    const ey_m = mz_n * bx - mx_n * bz;
    const ez_m = mx_n * vy - my_n * bx;

    // Combine errors
    const ex = ex_g + ex_m;
    const ey = ey_g + ey_m;
    const ez = ez_g + ez_m;

    // Apply feedback step
    let q1_dot = 0.5 * (-this.q2 * ex - this.q3 * ey - this.q4 * ez);
    let q2_dot = 0.5 * (this.q1 * ex + this.q3 * ez - this.q4 * ey);
    let q3_dot = 0.5 * (this.q1 * ey - this.q2 * ez + this.q4 * ex);
    let q4_dot = 0.5 * (this.q1 * ez + this.q2 * ey - this.q3 * ex);

    // Integrate gyroscope data if available (9-DOF)
    if (gx !== undefined && gy !== undefined && gz !== undefined) {
      q1_dot += 0.5 * (-this.q2 * gx - this.q3 * gy - this.q4 * gz);
      q2_dot += 0.5 * (this.q1 * gx + this.q3 * gz - this.q4 * gy);
      q3_dot += 0.5 * (this.q1 * gy - this.q2 * gz + this.q4 * gx);
      q4_dot += 0.5 * (this.q1 * gz + this.q2 * gy - this.q3 * gx);
    }

    // Integrate rate of change of quaternion
    this.q1 += q1_dot * dt;
    this.q2 += q2_dot * dt;
    this.q3 += q3_dot * dt;
    this.q4 += q4_dot * dt;

    // Normalize quaternion
    const norm = Math.sqrt(this.q1 * this.q1 + this.q2 * this.q2 + 
                           this.q3 * this.q3 + this.q4 * this.q4);
    this.q1 /= norm;
    this.q2 /= norm;
    this.q3 /= norm;
    this.q4 /= norm;

    this.initialized = true;

    return this.getOrientation();
  }

  /**
   * Update with only accelerometer and magnetometer (6-DOF)
   * Uses orientation estimate for gyro terms
   */
  update6DOF(ax: number, ay: number, az: number, 
             mx: number, my: number, mz: number, 
             timestamp: number): Orientation {
    return this.update({ ax, ay, az, mx, my, mz, timestamp });
  }

  /**
   * Update with accelerometer, magnetometer, and gyroscope (9-DOF)
   */
  update9DOF(ax: number, ay: number, az: number, 
             mx: number, my: number, mz: number,
             gx: number, gy: number, gz: number,
             timestamp: number): Orientation {
    return this.update({ ax, ay, az, mx, my, mz, gx, gy, gz, timestamp });
  }

  /**
   * Get current orientation as Euler angles
   */
  getOrientation(): Orientation {
    // Roll (x-axis rotation)
    const sinr_cosp = 2 * (this.q1 * this.q2 + this.q3 * this.q4);
    const cosr_cosp = 1 - 2 * (this.q2 * this.q2 + this.q3 * this.q3);
    const roll = Math.atan2(sinr_cosp, cosr_cosp);

    // Pitch (y-axis rotation)
    const sinp = 2 * (this.q1 * this.q3 - this.q4 * this.q2);
    const pitch = Math.abs(sinp) >= 1 
      ? Math.sign(sinp) * Math.PI / 2  // Use 90 degrees if out of range
      : Math.asin(sinp);

    // Yaw (z-axis rotation) - this is the heading
    const siny_cosp = 2 * (this.q1 * this.q4 + this.q2 * this.q3);
    const cosy_cosp = 1 - 2 * (this.q3 * this.q3 + this.q4 * this.q4);
    const yaw = Math.atan2(siny_cosp, cosy_cosp);

    return {
      q1: this.q1,
      q2: this.q2,
      q3: this.q3,
      q4: this.q4,
      roll: roll * 180 / Math.PI,
      pitch: pitch * 180 / Math.PI,
      yaw: ((yaw * 180 / Math.PI) + 360) % 360, // Normalize to 0-360
    };
  }

  /**
   * Get heading (yaw) directly
   */
  getHeading(): number {
    const orientation = this.getOrientation();
    return orientation.yaw;
  }

  /**
   * Get quaternion
   */
  getQuaternion(): [number, number, number, number] {
    return [this.q1, this.q2, this.q3, this.q4];
  }

  /**
   * Check if filter is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

/**
 * Low-pass filter for angle smoothing (handles 0/360 wrap-around)
 */
export class AngleLowPassFilter {
  private alpha: number;
  private value: number | null = null;

  constructor(alpha: number = 0.15) {
    this.alpha = alpha;
  }

  filter(input: number): number {
    if (this.value === null) {
      this.value = input;
      return input;
    }

    // Handle wrap-around: find shortest angular distance
    let diff = input - this.value;
    diff = ((diff + 180) % 360) - 180; // Wrap to [-180, 180]

    this.value = (this.value + this.alpha * diff + 360) % 360;
    return this.value;
  }

  reset(): void {
    this.value = null;
  }

  setAlpha(alpha: number): void {
    this.alpha = alpha;
  }
}

/**
 * Complementary filter (simpler alternative to Madgwick)
 * Good for basic tilt compensation when gyroscope not available
 */
export class ComplementaryFilter {
  private alpha: number; // Weight for gyroscope (high = trust gyro more)
  private roll = 0;
  private pitch = 0;
  private yaw = 0;
  private initialized = false;
  private lastTimestamp = 0;

  constructor(alpha: number = 0.98) {
    this.alpha = alpha;
  }

  update(ax: number, ay: number, az: number, 
         mx: number, my: number, mz: number,
         gx?: number, gy?: number, gz?: number,
         timestamp?: number): { roll: number; pitch: number; yaw: number } {
    
    // Calculate roll and pitch from accelerometer
    const accelRoll = Math.atan2(ay, az) * 180 / Math.PI;
    const accelPitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * 180 / Math.PI;

    // Calculate yaw from magnetometer (tilt-compensated)
    const cosRoll = Math.cos(accelRoll * Math.PI / 180);
    const sinRoll = Math.sin(accelRoll * Math.PI / 180);
    const cosPitch = Math.cos(accelPitch * Math.PI / 180);
    const sinPitch = Math.sin(accelPitch * Math.PI / 180);

    const mxComp = mx * cosPitch + my * sinRoll * sinPitch + mz * cosRoll * sinPitch;
    const myComp = my * cosRoll - mz * sinRoll;
    const magYaw = Math.atan2(-myComp, mxComp) * 180 / Math.PI;

    if (!this.initialized) {
      this.roll = accelRoll;
      this.pitch = accelPitch;
      this.yaw = ((magYaw + 360) % 360);
      this.initialized = true;
    } else if (gx !== undefined && gy !== undefined && gz !== undefined && timestamp !== undefined) {
      // Gyroscope integration
      const dt = (timestamp - this.lastTimestamp) / 1000.0;
      
      this.roll = this.alpha * (this.roll + gx * dt) + (1 - this.alpha) * accelRoll;
      this.pitch = this.alpha * (this.pitch + gy * dt) + (1 - this.alpha) * accelPitch;
      
      // Yaw from magnetometer (no gyro integration for yaw due to drift)
      // Use low-pass filter for yaw
      let yawDiff = ((magYaw + 360) % 360) - this.yaw;
      yawDiff = ((yawDiff + 180) % 360) - 180;
      this.yaw = (this.yaw + 0.1 * yawDiff + 360) % 360;
    } else {
      // No gyro - just use low-pass filter on accel/mag
      this.roll = 0.9 * this.roll + 0.1 * accelRoll;
      this.pitch = 0.9 * this.pitch + 0.1 * accelPitch;
      
      let yawDiff = ((magYaw + 360) % 360) - this.yaw;
      yawDiff = ((yawDiff + 180) % 360) - 180;
      this.yaw = (this.yaw + 0.1 * yawDiff + 360) % 360;
    }

    this.lastTimestamp = timestamp || Date.now();
    return { roll: this.roll, pitch: this.pitch, yaw: this.yaw };
  }

  reset(): void {
    this.initialized = false;
    this.roll = 0;
    this.pitch = 0;
    this.yaw = 0;
  }

  getYaw(): number {
    return this.yaw;
  }
}