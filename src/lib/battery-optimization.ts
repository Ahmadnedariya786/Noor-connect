import { registerPlugin } from '@capacitor/core';

export interface BatteryOptimizationPlugin {
  /**
   * Check if the app is ignoring battery optimizations
   */
  isIgnoringBatteryOptimizations(): Promise<{ isIgnoring: boolean }>;

  /**
   * Request to ignore battery optimizations
   * Opens the system settings page where the user can disable battery optimization
   */
  requestIgnoreBatteryOptimizations(): Promise<void>;

  /**
   * Open the app's battery optimization settings page
   */
  openBatterySettings(): Promise<void>;
}

const BatteryOptimization = registerPlugin<BatteryOptimizationPlugin>('BatteryOptimization');

export default BatteryOptimization;
