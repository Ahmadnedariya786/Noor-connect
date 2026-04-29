/**
 * useHaptic Hook
 * Provides easy access to haptic feedback for UI interactions
 */

import { useCallback } from 'react';
import hapticService, { type HapticPattern } from '@/lib/haptic-service';

export function useHaptic() {
  /**
   * Trigger haptic feedback for UI interactions (button taps, etc.)
   * Only triggers if haptics are enabled and UI interactions are enabled in settings
   */
  const triggerUI = useCallback(async () => {
    await hapticService.trigger('light');
  }, []);

  /**
   * Trigger haptic feedback for success actions
   */
  const triggerSuccess = useCallback(async () => {
    await hapticService.trigger('success');
  }, []);

  /**
   * Trigger haptic feedback for warning actions
   */
  const triggerWarning = useCallback(async () => {
    await hapticService.trigger('warning');
  }, []);

  /**
   * Trigger haptic feedback for error actions
   */
  const triggerError = useCallback(async () => {
    await hapticService.trigger('error');
  }, []);

  /**
   * Trigger haptic feedback for bookmark actions
   */
  const triggerBookmark = useCallback(async () => {
    await hapticService.trigger('bookmark');
  }, []);

  /**
   * Trigger haptic feedback for prayer notifications
   */
  const triggerPrayer = useCallback(async () => {
    await hapticService.trigger('prayer');
  }, []);

  /**
   * Trigger haptic feedback for adhan
   */
  const triggerAdhan = useCallback(async () => {
    await hapticService.trigger('adhan');
  }, []);

  /**
   * Trigger custom haptic pattern
   */
  const trigger = useCallback(async (pattern: HapticPattern) => {
    await hapticService.trigger(pattern);
  }, []);

  return {
    triggerUI,
    triggerSuccess,
    triggerWarning,
    triggerError,
    triggerBookmark,
    triggerPrayer,
    triggerAdhan,
    trigger,
  };
}
