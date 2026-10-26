import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Bookmark, X, Star, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GeocodingService, type GeocodingResult } from "@/lib/geocoding";
import { loadStoredLocation } from "@/lib/location-state";
import {
  getSavedLocations,
  saveLocationToFavorites,
  removeSavedLocation,
  SAVED_LOCATIONS_CHANGED_EVENT,
  type SavedLocation
} from "@/lib/saved-locations";
import {
  POPULAR_CITIES,
  POPULAR_INDIAN_CITIES,
  POPULAR_GLOBAL_CITIES
} from "@/data/cities";

export { POPULAR_CITIES, POPULAR_INDIAN_CITIES, POPULAR_GLOBAL_CITIES };

interface LocationSearchProps {
  onLocationSelect: (city: string, country: string, lat?: number, lon?: number, displayName?: string) => Promise<void>;
  isLoading?: boolean;
}

export function LocationSearch({ onLocationSelect, isLoading = false }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasCompletedSearch, setHasCompletedSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [regionFilter, setRegionFilter] = useState<'saved' | 'india' | 'international' | 'all'>('saved');
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => getSavedLocations());
  const [bookmarkedIndices, setBookmarkedIndices] = useState<Record<number, boolean>>({});
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const storedLoc = loadStoredLocation();
  const confirmedCity = storedLoc.locationName
    ? storedLoc.locationName.split(',')[0].trim()
    : (storedLoc.city || 'Current Location');
  const isConfirmedCitySaved = savedLocations.some(
    l => l.name?.toLowerCase().includes(confirmedCity.toLowerCase()) || l.city.toLowerCase() === confirmedCity.toLowerCase()
  );

  const handleSaveActiveCity = () => {
    const loc = loadStoredLocation();
    const fullName = loc.locationName || 'Current Location';
    const parts = fullName.split(',');
    const city = parts[0]?.trim() || fullName;
    const country = parts.length > 1 ? parts.slice(1).join(',').trim() : '';
    saveLocationToFavorites({
      name: fullName,
      city,
      country,
      latitude: loc.latitude,
      longitude: loc.longitude
    });
    toast({ title: "Location Saved", description: `"${city}" saved to bookmarks.` });
  };

  useEffect(() => {
    const handleSavedChange = () => setSavedLocations(getSavedLocations());
    window.addEventListener(SAVED_LOCATIONS_CHANGED_EVENT, handleSavedChange);
    return () => window.removeEventListener(SAVED_LOCATIONS_CHANGED_EVENT, handleSavedChange);
  }, []);

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search (350ms)
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setIsSearching(false);
      setHasCompletedSearch(false);
      return;
    }

    setIsSearching(true);
    setHasCompletedSearch(false);

    const timer = setTimeout(async () => {
      try {
        const results = await GeocodingService.searchLocation(searchQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        // Safe catch for search failures
      } finally {
        setIsSearching(false);
        setHasCompletedSearch(true);
      }
    }, 350); // 350ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSuggestionSelect = async (place: GeocodingResult) => {
    try {
      // Improve city extraction logic
      const city = place.address.city ||
        place.address.town ||
        place.address.village ||
        place.address.county ||
        place.address.state ||
        place.display_name.split(',')[0].trim();

      const country = place.address.country || "";
      const lat = parseFloat(place.lat);
      const lon = parseFloat(place.lon);

      setSearchQuery(place.display_name);
      setShowSuggestions(false);

      await onLocationSelect(city, country, isNaN(lat) ? undefined : lat, isNaN(lon) ? undefined : lon, place.display_name);
    } catch (error) {
      console.error("Selection error:", error);
      toast({
        title: "Selection Failed",
        description: "Could not sync prayer times for this location.",
        variant: "destructive"
      });
    }
  };

  const handleManualSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    setIsSearching(true);
    try {
      // 1. If suggestions already loaded in state, choose top suggestion
      if (suggestions.length > 0) {
        await handleSuggestionSelect(suggestions[0]);
        return;
      }

      // 2. Direct online/offline geocoding for typed query
      const results = await GeocodingService.searchLocation(trimmedQuery);
      if (results.length > 0) {
        await handleSuggestionSelect(results[0]);
        return;
      }

      // 3. Fallback to manual parsing
      const parts = trimmedQuery.split(',');
      const city = parts[0].trim();
      const country = parts.length > 1 ? parts.slice(1).join(',').trim() : "";
      await onLocationSelect(city, country);
      setShowSuggestions(false);
    } catch (error) {
      console.error("Manual search error:", error);
      toast({
        title: "Location Not Found",
        description: "Could not find prayer times for this location.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSearch();
    }
  };

  return (
    <Card 
      className="w-full max-w-md mx-auto overscroll-contain"
      style={{ touchAction: 'pan-y' }}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <CardContent className="p-6">
        <div className="text-center mb-6">
          <MapPin className="w-12 h-12 mx-auto mb-3 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Find Your Location</h3>
          <p className="text-sm text-muted-foreground">
            Search for your city to get accurate prayer times.
          </p>
        </div>

        <div className="space-y-4 relative" ref={wrapperRef}>
          <div className="relative">
            <Input
              placeholder="Search city (e.g. Delhi, Mumbai, London)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pr-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* 1-Tap Save Active City Chip - strictly bound to confirmed location, hidden while typing */}
          {searchQuery.trim().length === 0 && confirmedCity && (
            <div className="flex items-center justify-between px-0.5">
              <button
                type="button"
                onClick={handleSaveActiveCity}
                disabled={isConfirmedCitySaved}
                className={`text-xs px-3 py-1 rounded-full flex items-center gap-1.5 transition-all ${
                  isConfirmedCitySaved
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-default'
                    : 'bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--border)] hover:bg-[var(--accent)] hover:text-white active:scale-95'
                }`}
              >
                {isConfirmedCitySaved ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="font-medium truncate max-w-[210px]">Saved "{confirmedCity}"</span>
                  </>
                ) : (
                  <>
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span className="font-semibold truncate max-w-[210px]">★ Save "{confirmedCity}"</span>
                  </>
                )}
              </button>
            </div>
          )}

          <Button
            type="button"
            onClick={handleManualSearch}
            disabled={isLoading || isSearching || !searchQuery.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Setting Location...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Set Location
              </>
            )}
          </Button>
        </div>

        {/* When searching: render live search suggestions cleanly in normal block flow inside a solid container with zero bleed-through */}
        {searchQuery.trim().length > 0 ? (
          <div className="mt-4 space-y-2" onTouchMove={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-[var(--accent-text)]">
                {isSearching || !hasCompletedSearch
                  ? "Searching locations..."
                  : suggestions.length > 0
                  ? `Results (${suggestions.length})`
                  : "No matching locations"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSuggestions([]);
                }}
                className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Clear
              </button>
            </div>

            {isSearching && (
              <div
                className="p-4 rounded-[14px] flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)]"
                style={{
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--border)'
                }}
              >
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
                <span>Searching online & offline databases...</span>
              </div>
            )}

            {!isSearching && suggestions.length > 0 && (
              <div
                className="rounded-[14px] overflow-hidden max-h-[260px] overflow-y-auto divide-y divide-[var(--border)]/60"
                style={{
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                }}
              >
                {suggestions.map((place, index) => (
                  <div
                    key={index}
                    className="w-full flex items-center justify-between p-3 text-sm hover:bg-[var(--surface-2)] transition-colors"
                  >
                    <button
                      type="button"
                      className="flex-1 text-left mr-2 min-w-0"
                      onClick={() => handleSuggestionSelect(place)}
                    >
                      <p className="font-semibold text-xs text-[var(--text-primary)] truncate">{place.display_name}</p>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const city = place.address.city || place.address.town || place.address.village || place.display_name.split(',')[0];
                        const country = place.address.country || '';
                        saveLocationToFavorites({
                          name: place.display_name,
                          city,
                          country,
                          latitude: parseFloat(place.lat),
                          longitude: parseFloat(place.lon)
                        });
                        setBookmarkedIndices(prev => ({ ...prev, [index]: true }));
                        toast({ title: "Location Saved", description: `${city} added to saved locations.` });
                      }}
                      className="p-1.5 rounded-full text-muted-foreground hover:text-[var(--accent-text)] hover:bg-[var(--accent-soft)] transition-colors shrink-0"
                      title="Bookmark location"
                    >
                      {bookmarkedIndices[index] ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!isSearching && suggestions.length === 0 && (
              <div
                className="p-4 rounded-[14px] text-center text-xs text-[var(--text-secondary)]"
                style={{
                  background: 'var(--bg-elev)',
                  border: '1px solid var(--border)'
                }}
              >
                No live suggestions found. Press "Set Location" to search directly.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5" onTouchMove={(e) => e.stopPropagation()}>
          {/* Region Tabs */}
          <div className="flex items-center justify-between p-1 bg-muted/60 rounded-xl mb-3 gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setRegionFilter('saved')}
              style={{ whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '5px 8px' }}
              className={`flex-1 rounded-lg font-medium transition-all flex items-center justify-center gap-1 shrink-0 ${
                regionFilter === 'saved'
                  ? 'bg-background text-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bookmark className="w-3 h-3 text-[var(--accent-text)] shrink-0" />
              <span>Saved ({savedLocations.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setRegionFilter('india')}
              style={{ whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '5px 8px' }}
              className={`flex-1 rounded-lg font-medium transition-all shrink-0 ${
                regionFilter === 'india'
                  ? 'bg-background text-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              India
            </button>
            <button
              type="button"
              onClick={() => setRegionFilter('international')}
              style={{ whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '5px 8px' }}
              className={`flex-1 rounded-lg font-medium transition-all shrink-0 ${
                regionFilter === 'international'
                  ? 'bg-background text-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              World
            </button>
            <button
              type="button"
              onClick={() => setRegionFilter('all')}
              style={{ whiteSpace: 'nowrap', fontSize: '0.72rem', padding: '5px 8px' }}
              className={`flex-1 rounded-lg font-medium transition-all shrink-0 ${
                regionFilter === 'all'
                  ? 'bg-background text-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
            </button>
          </div>

          {/* Saved Locations List */}
          {regionFilter === 'saved' && (
            <div className="space-y-2">
              {savedLocations.length === 0 ? (
                <div className="text-center py-4 text-xs text-muted-foreground">
                  No saved locations yet. Search any city or town above to bookmark it.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                  {savedLocations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between p-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--accent)]/50 transition-all text-left"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery(`${loc.city}, ${loc.country}`);
                          onLocationSelect(loc.city, loc.country);
                        }}
                        disabled={isLoading}
                        className="flex-1 flex items-center gap-2 truncate pr-2 text-left"
                      >
                        <MapPin className="w-3.5 h-3.5 text-[var(--accent-text)] shrink-0" />
                        <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                          {loc.name || `${loc.city}, ${loc.country}`}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSavedLocation(loc.id);
                          toast({ title: "Location Removed", description: `Removed from saved locations.` });
                        }}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                        title="Remove location"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Cities Grid based on selected tab */}
          {regionFilter === 'india' && (
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_INDIAN_CITIES.map((city) => (
                <Button
                  key={`${city.city}-${city.country}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(`${city.city}, ${city.country}`);
                    onLocationSelect(city.city, city.country);
                  }}
                  disabled={isLoading}
                  className="text-xs h-auto py-2 px-2"
                >
                  {city.city}
                </Button>
              ))}
            </div>
          )}

          {regionFilter === 'international' && (
            <div className="grid grid-cols-2 gap-2">
              {POPULAR_GLOBAL_CITIES.map((city) => (
                <Button
                  key={`${city.city}-${city.country}`}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery(`${city.city}, ${city.country}`);
                    onLocationSelect(city.city, city.country);
                  }}
                  disabled={isLoading}
                  className="text-xs h-auto py-2 px-2"
                >
                  {city.city}
                </Button>
              ))}
            </div>
          )}

          {regionFilter === 'all' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">India</p>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_INDIAN_CITIES.map((city) => (
                    <Button
                      key={`${city.city}-${city.country}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(`${city.city}, ${city.country}`);
                        onLocationSelect(city.city, city.country);
                      }}
                      disabled={isLoading}
                      className="text-xs h-auto py-2 px-2"
                    >
                      {city.city}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">International</p>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_GLOBAL_CITIES.map((city) => (
                    <Button
                      key={`${city.city}-${city.country}`}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSearchQuery(`${city.city}, ${city.country}`);
                        onLocationSelect(city.city, city.country);
                      }}
                      disabled={isLoading}
                      className="text-xs h-auto py-2 px-2"
                    >
                      {city.city}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        )}

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Live Global Search • OpenStreetMap & AlAdhan
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
