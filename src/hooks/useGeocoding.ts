import { useQuery } from '@tanstack/react-query';
import { GeocodingService, GeocodingResult } from '@/lib/geocoding';

export function useGeocodingSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['geocoding', query],
    queryFn: () => GeocodingService.searchLocation(query),
    enabled: enabled && query.length > 2,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
}

export function useCityCoordinates(city: string, country: string, enabled = true) {
  return useQuery({
    queryKey: ['cityCoordinates', city, country],
    queryFn: () => GeocodingService.getCityCoordinates(city, country),
    enabled: enabled && city.length > 0,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 30 * 60 * 1000, // 30 minutes (renamed from cacheTime in v5)
    retry: 1,
  });
}