/**
 * Device Performance Detection Utility
 * Detects low-end devices based on hardware capabilities
 */

export interface DeviceCapabilities {
  cpuCores: number;
  deviceMemory: number | null;
  connectionType: string | null;
  effectiveConnectionType: string | null;
  saveDataMode: boolean;
}

export interface LowEndDeviceThresholds {
  minCpuCores: number;
  minDeviceMemory: number;
  slowConnectionTypes: string[];
  slowEffectiveConnectionTypes: string[];
}

const DEFAULT_THRESHOLDS: LowEndDeviceThresholds = {
  minCpuCores: 4, // Devices with less than 4 CPU cores are considered low-end
  minDeviceMemory: 4, // Devices with less than 4GB RAM are considered low-end
  slowConnectionTypes: ['slow-2g', '2g', '3g'],
  slowEffectiveConnectionTypes: ['slow-2g', '2g', '3g'],
};

/**
 * Get device capabilities from browser APIs
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  const capabilities: DeviceCapabilities = {
    cpuCores: navigator.hardwareConcurrency || 4, // Default to 4 if not available
    deviceMemory: null,
    connectionType: null,
    effectiveConnectionType: null,
    saveDataMode: false,
  };

  // navigator.deviceMemory is not available in all browsers
  if ('deviceMemory' in navigator) {
    capabilities.deviceMemory = (navigator as any).deviceMemory;
  }

  // navigator.connection is not available in all browsers
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    capabilities.connectionType = connection.type || null;
    capabilities.effectiveConnectionType = connection.effectiveType || null;
    capabilities.saveDataMode = connection.saveData || false;
  }

  return capabilities;
}

/**
 * Check if the current device is considered low-end based on hardware capabilities
 */
export function isLowEndDevice(
  thresholds: LowEndDeviceThresholds = DEFAULT_THRESHOLDS
): boolean {
  const capabilities = getDeviceCapabilities();
  let lowEndScore = 0;

  // Check CPU cores
  if (capabilities.cpuCores < thresholds.minCpuCores) {
    lowEndScore++;
  }

  // Check device memory (if available)
  if (capabilities.deviceMemory !== null && capabilities.deviceMemory < thresholds.minDeviceMemory) {
    lowEndScore++;
  }

  // Check connection type (if available)
  if (capabilities.connectionType && thresholds.slowConnectionTypes.includes(capabilities.connectionType)) {
    lowEndScore++;
  }

  // Check effective connection type (if available)
  if (capabilities.effectiveConnectionType && thresholds.slowEffectiveConnectionTypes.includes(capabilities.effectiveConnectionType)) {
    lowEndScore++;
  }

  // Check save data mode
  if (capabilities.saveDataMode) {
    lowEndScore++;
  }

  // Device is considered low-end if it meets 2 or more low-end criteria
  // This ensures we don't disable animations for devices that are only slightly underperforming in one area
  return lowEndScore >= 2;
}

/**
 * Get a detailed report of device capabilities and low-end status
 */
export function getDevicePerformanceReport(): {
  capabilities: DeviceCapabilities;
  isLowEnd: boolean;
  reasons: string[];
} {
  const capabilities = getDeviceCapabilities();
  const thresholds = DEFAULT_THRESHOLDS;
  const reasons: string[] = [];

  if (capabilities.cpuCores < thresholds.minCpuCores) {
    reasons.push(`Low CPU cores: ${capabilities.cpuCores} < ${thresholds.minCpuCores}`);
  }

  if (capabilities.deviceMemory !== null && capabilities.deviceMemory < thresholds.minDeviceMemory) {
    reasons.push(`Low device memory: ${capabilities.deviceMemory}GB < ${thresholds.minDeviceMemory}GB`);
  }

  if (capabilities.connectionType && thresholds.slowConnectionTypes.includes(capabilities.connectionType)) {
    reasons.push(`Slow connection type: ${capabilities.connectionType}`);
  }

  if (capabilities.effectiveConnectionType && thresholds.slowEffectiveConnectionTypes.includes(capabilities.effectiveConnectionType)) {
    reasons.push(`Slow effective connection: ${capabilities.effectiveConnectionType}`);
  }

  if (capabilities.saveDataMode) {
    reasons.push('Save data mode enabled');
  }

  return {
    capabilities,
    isLowEnd: isLowEndDevice(thresholds),
    reasons,
  };
}
