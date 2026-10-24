import { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, Bookmark, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { GeocodingService, type GeocodingResult } from "@/lib/geocoding";
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
  onLocationSelect: (city: string, country: string) => Promise<void>;
  isLoading?: boolean;
}

export function LocationSearch({ onLocationSelect, isLoading = false }: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [regionFilter, setRegionFilter] = useState<'saved' | 'india' | 'international' | 'all'>('saved');
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>(() => getSavedLocations());
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

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
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await GeocodingService.searchLocation(searchQuery);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        // Safe catch for search failures
      } finally {
        setIsSearching(false);
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
        place.display_name.split(',')[0];

      const country = place.address.country || "";

      setSearchQuery(place.display_name);
      setShowSuggestions(false);

      await onLocationSelect(city, country);
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

    // Split by comma if present to try and parse city/country
    const parts = trimmedQuery.split(',');
    const city = parts[0].trim();
    const country = parts.length > 1 ? parts.slice(1).join(',').trim() : "";

    try {
      await onLocationSelect(city, country);
      setShowSuggestions(false);
    } catch (error) {
      console.error("Manual search error:", error);
      toast({
        title: "Location Not Found",
        description: "Could not find prayer times for this location.",
        variant: "destructive"
      });
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

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div 
              className="absolute z-50 w-full mt-1 bg-popover rounded-md border shadow-md max-h-[200px] overflow-auto overscroll-contain"
              style={{
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-y'
              }}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {suggestions.map((place, index) => (
                <div
                  key={index}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors border-b last:border-0"
                >
                  <button
                    type="button"
                    className="flex-1 text-left truncate mr-2"
                    onClick={() => handleSuggestionSelect(place)}
                  >
                    <p className="font-medium truncate text-xs">{place.display_name}</p>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const city = place.address.city || place.address.town || place.address.village || place.display_name.split(',')[0];
                      const country = place.address.country || '';
                      saveLocationToFavorites({
                        name: place.display_name,
                        city,
                        country,
                        latitude: parseFloat(place.lat),
                        longitude: parseFloat(place.lon)
                      });
                      toast({ title: "Location Saved", description: `${city} added to saved locations.` });
                    }}
                    className="p-1 rounded-full text-muted-foreground hover:text-[var(--accent-text)] hover:bg-[var(--accent-soft)] transition-colors shrink-0"
                    title="Bookmark location"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={handleManualSearch}
            disabled={isLoading || !searchQuery.trim()}
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

        <div className="mt-5" onTouchMove={(e) => e.stopPropagation()}>
          {/* Region Tabs */}
          <div className="flex items-center justify-center p-1 bg-muted/60 rounded-xl mb-3 gap-1">
            <button
              type="button"
              onClick={() => setRegionFilter('saved')}
              className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all flex items-center justify-center gap-1 ${
                regionFilter === 'saved'
                  ? 'bg-background text-foreground shadow-sm font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bookmark className="w-3 h-3 text-[var(--accent-text)]" />
              Saved ({savedLocations.length})
            </button>
            <button
              type="button"
              onClick={() => setRegionFilter('india')}
              className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
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
              className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
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
              className={`flex-1 text-xs py-1.5 px-2 rounded-lg font-medium transition-all ${
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

        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Offline database with OpenStreetMap search
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
