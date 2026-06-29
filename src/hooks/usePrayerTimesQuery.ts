import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AladhanAPI } from '@/lib/aladhan-api';
import { getCalculationMethod } from '@/lib/prayer-calculator';
import { getMadhab } from '@/lib/storage';
import { ALADHAN_METHODS } from '@/lib/aladhan-api';

interface PrayerTimesQueryParams {
  latitude: number;
  longitude: number;
  method?: number;
  school?: number;
}

export function usePrayerTimesAPI(params: PrayerTimesQueryParams, enabled = true) {
  const { latitude, longitude, method, school } = params;
  
  const methodName = method || getCalculationMethod();
  const methodId = method || ALADHAN_METHODS[methodName] || 3;
  const schoolParam = school !== undefined ? school : (getMadhab() === 'hanafi' ? 1 : 0);

  return useQuery({
    queryKey: ['prayerTimes', latitude, longitude, methodId, schoolParam],
    queryFn: () => AladhanAPI.getTodaysPrayerTimes(latitude, longitude, methodId, schoolParam),
    enabled: enabled && latitude !== 0 && longitude !== 0,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
}

export function useInvalidatePrayerTimes() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ['prayerTimes'] });
  };
}