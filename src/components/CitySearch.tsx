import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Loader2, AlertCircle, Navigation, Globe } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/use-debounced-search';
import { CityResult } from '@/lib/photon-api';
import { useLocationState } from '@/lib/location-state';
import { useToast } from '@/hooks/use-toast';

interface CitySearchProps {
  onCitySelect?: (city: CityResult) => void;
  showManualCoordinates?: boolean;
}

export const CitySearch = ({ onCitySelect, showManualCoordinates = true }: CitySearchProps) => {
  const location = useLocationState();
  const { toast } = useToast();
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [manualCityName, setManualCityName] = useState('');

  const { results, isLoading, error, search, clearResults } = useDebouncedSearch({
    debounceMs: 300,
    minLength: 2,
    limit: 10,
    includeTowns: true
  });

  const handleCitySelect = (city: CityResult) => {
    // Update global location state
    const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : undefined;
    location.setLocation(city.lat, city.lon, city.display_name, tz);
    
    // Call optional callback
    if (onCitySelect) {
      onCitySelect(city);
    }

    // Show success message
    toast({
      title: "Location Updated",
      description: `Prayer times updated for ${city.display_name}`,
    });

    // Clear search
    clearResults();
  };

  const handleManualCoordinates = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    if (isNaN(lat) || isNaN(lon)) {
      toast({
        title: "Invalid Coordinates",
        description: "Please enter valid latitude and longitude values",
        variant: "destructive",
      });
      return;
    }

    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      toast({
        title: "Invalid Range",
        description: "Latitude must be -90 to 90, longitude must be -180 to 180",
        variant: "destructive",
      });
      return;
    }

    const displayName = manualCityName.trim() || `Custom Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
    
    // Update global location state
    location.setLocation(lat, lon, displayName);
    
    // Show success message
    toast({
      title: "Location Updated",
      description: `Prayer times updated for ${displayName}`,
    });

    // Reset form
    setManualLat('');
    setManualLon('');
    setManualCityName('');
    setShowManualInput(false);
  };

  const handleGetCurrentLocation = () => {
    try {
      if (!navigator.geolocation) {
        toast({
          title: "Geolocation Not Supported",
          description: "Your browser doesn't support location services",
          variant: "destructive",
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          location.setLocation(latitude, longitude, 'Current Location');
          
          toast({
            title: "Location Updated",
            description: `Prayer times updated for your current location`,
          });
        },
        (_error) => {
          toast({
            title: "Location Access Denied",
            description: "Please enable location permissions to use this feature",
            variant: "destructive",
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 60000
        }
      );
    } catch (_e) {
      toast({
        title: "Location Error",
        description: "Could not retrieve current location.",
        variant: "destructive",
      });
    }
  };

   const getPlaceTypeIcon = (osmValue: string) => {
     switch (osmValue) {
       case 'city': {
         return <MapPin className="w-4 h-4 text-blue-500" />;
       }
       case 'town': {
         return <MapPin className="w-4 h-4 text-[var(--accent)]" />;
       }
       case 'village': {
         return <MapPin className="w-4 h-4 text-orange-500" />;
       }
       default: {
         return <MapPin className="w-4 h-4 text-gray-500" />;
       }
     }
   };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          <CardTitle>City Search</CardTitle>
        </div>
        <CardDescription>
          Search for your city to get accurate prayer times
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search for a city (e.g., London, Dubai, Karachi)..."
            className="pl-10"
            onChange={(e) => search(e.target.value)}
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Current Location Button */}
        <Button
          variant="outline"
          onClick={handleGetCurrentLocation}
          className="w-full"
        >
          <Navigation className="w-4 h-4 mr-2" />
          Use Current Location
        </Button>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            <p className="text-sm text-muted-foreground">Found {results.length} cities:</p>
            {results.map((city) => (
              <div
                key={`${city.place_id}-${city.osm_id}`}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors"
                onClick={() => handleCitySelect(city)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getPlaceTypeIcon(city.osm_value)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{city.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {city.display_name}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary" className="capitalize">
                  {city.osm_value}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Manual Coordinates */}
        {showManualCoordinates && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Manual Coordinates</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowManualInput(!showManualInput)}
              >
                {showManualInput ? 'Cancel' : 'Enter Manually'}
              </Button>
            </div>

            {showManualInput && (
              <div className="space-y-3 p-3 rounded-lg border">
                <Input
                  placeholder="City name (optional)"
                  value={manualCityName}
                  onChange={(e) => setManualCityName(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Latitude (e.g., 24.8607)"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    type="number"
                    step="any"
                  />
                  <Input
                    placeholder="Longitude (e.g., 67.0011)"
                    value={manualLon}
                    onChange={(e) => setManualLon(e.target.value)}
                    type="number"
                    step="any"
                  />
                </div>
                <Button
                  onClick={handleManualCoordinates}
                  className="w-full"
                  disabled={!manualLat || !manualLon}
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Set Location
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Current Location Display */}
        {location.latitude && location.longitude && (
          <div className="p-3 rounded-lg bg-muted/30">
            <p className="text-sm font-medium">Current Location:</p>
            <p className="text-sm text-muted-foreground">{location.locationName}</p>
            <p className="text-xs text-muted-foreground">
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
