/**
 * Weather Widget
 * Shows current weather with Islamic prayer time adjustments
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, CloudRain, Sun, Wind, Droplets, Eye, MapPin, RefreshCw } from "lucide-react";
import { useLocationState } from "@/lib/location-state";

interface WeatherData {
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  visibility: number;
  icon: string;
  location: string;
}

const WEATHER_STORAGE_KEY = "weather-data";
const LAST_UPDATE_KEY = "weather-last-update";

const mapWeatherCodeToCondition = (weatherCode: number): string => {
  if (weatherCode === 0) return "Clear";
  if ([1, 2, 3].includes(weatherCode)) return "Clouds";
  if ([45, 48].includes(weatherCode)) return "Fog";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) return "Snow";
  if ([95, 96, 99].includes(weatherCode)) return "Thunderstorm";
  return "Clouds";
};

export function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocationState();

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'clear':
      case 'sunny':
        return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'clouds':
      case 'partly cloudy':
        return <Cloud className="w-8 h-8 text-gray-500" />;
      case 'rain':
      case 'drizzle':
        return <CloudRain className="w-8 h-8 text-blue-500" />;
      default:
        return <Cloud className="w-8 h-8 text-gray-400" />;
    }
  };

  const getPrayerWeatherAdvice = (temp: number, condition: string) => {
    if (temp > 35) {
      return "🌡️ Stay hydrated for prayers. Use cool prayer area.";
    } else if (temp < 10) {
      return "🧥 Bundle up for prayers. Prayer area may be cold.";
    } else if (condition.toLowerCase().includes('rain')) {
      return "🌧️ Wet conditions. Be careful going to mosque.";
    } else {
      return "☀️ Pleasant weather for outdoor prayers.";
    }
  };

  const fetchWeather = useCallback(async () => {
    if (!location.latitude || !location.longitude) {
      setError("Location required for weather");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,visibility&timezone=auto`
      );

      if (!response.ok) {
        throw new Error("Weather service unavailable");
      }

      const data = await response.json();
      const current = data?.current;
      if (!current) {
        throw new Error("Weather data unavailable");
      }

      const weatherCode = Number(current.weather_code ?? -1);
      const visibilityMeters = Number(current.visibility ?? 0);
      
      const weatherData: WeatherData = {
        temperature: Math.round(Number(current.temperature_2m ?? 0)),
        condition: mapWeatherCodeToCondition(weatherCode),
        humidity: Math.round(Number(current.relative_humidity_2m ?? 0)),
        windSpeed: Number(current.wind_speed_10m ?? 0),
        visibility: Math.max(0, Math.round((visibilityMeters / 1000) * 10) / 10),
        icon: String(weatherCode),
        location: location.locationName || "Current Location"
      };

      setWeather(weatherData);
      localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(weatherData));
      localStorage.setItem(LAST_UPDATE_KEY, new Date().toISOString());
      
    } catch (error) {
      console.error('Error fetching weather:', error);
      
      // Try to load cached data
      const cachedWeather = localStorage.getItem(WEATHER_STORAGE_KEY);
      if (cachedWeather) {
        setWeather(JSON.parse(cachedWeather));
        setError("Using cached weather data");
      } else {
        setError("Weather unavailable");
      }
    } finally {
      setLoading(false);
    }
  }, [location.latitude, location.longitude, location.locationName]);

  useEffect(() => {
    // Load cached data first
    const cachedWeather = localStorage.getItem(WEATHER_STORAGE_KEY);
    const lastUpdate = localStorage.getItem(LAST_UPDATE_KEY);
    
    if (cachedWeather && lastUpdate) {
      const updateDate = new Date(lastUpdate);
      const now = new Date();
      const hoursDiff = (now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 2) { // Use cached data if less than 2 hours old
        setWeather(JSON.parse(cachedWeather));
        setLoading(false);
      } else {
        fetchWeather();
      }
    } else {
      fetchWeather();
    }

    // Listen for refresh events
    const handleRefresh = () => {
      fetchWeather();
    };

    window.addEventListener('widget-refresh', handleRefresh);
    window.addEventListener('weather-refresh', handleRefresh);

    return () => {
      window.removeEventListener('widget-refresh', handleRefresh);
      window.removeEventListener('weather-refresh', handleRefresh);
    };
  }, [fetchWeather]);

  if (loading) {
    return null;
  }

  if (error && !weather) {
    return (
      <Card className="p-4">
        <div className="text-center space-y-3">
          <Cloud className="w-8 h-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWeather}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card className="relative overflow-hidden border-blue-200 bg-gradient-to-br from-blue-50/50 to-transparent transition-all duration-500 hover:shadow-lg hover:shadow-blue-100">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-100/30 rounded-full blur-2xl" />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            Weather
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-xl hover:bg-blue-100"
            onClick={fetchWeather}
            aria-label="Refresh weather"
          >
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
        {error && (
          <p className="text-xs text-yellow-600">{error}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Weather Display */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getWeatherIcon(weather.condition)}
            <div>
              <p className="text-2xl font-bold text-foreground">
                {weather.temperature}°C
              </p>
              <p className="text-sm text-muted-foreground">
                {weather.condition}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {weather.location}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Weather Details */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-blue-50/50">
            <Droplets className="w-4 h-4 mx-auto text-blue-600 mb-1" />
            <p className="text-xs font-medium">{weather.humidity}%</p>
            <p className="text-xs text-muted-foreground">Humidity</p>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-blue-50/50">
            <Wind className="w-4 h-4 mx-auto text-blue-600 mb-1" />
            <p className="text-xs font-medium">{weather.windSpeed} m/s</p>
            <p className="text-xs text-muted-foreground">Wind</p>
          </div>
          
          <div className="text-center p-2 rounded-lg bg-blue-50/50">
            <Eye className="w-4 h-4 mx-auto text-blue-600 mb-1" />
            <p className="text-xs font-medium">{weather.visibility} km</p>
            <p className="text-xs text-muted-foreground">Visibility</p>
          </div>
        </div>

        {/* Prayer Weather Advice */}
        <div className="p-3 rounded-xl bg-blue-100/30 border border-blue-200/50">
          <p className="text-xs text-blue-800 font-medium">
            {getPrayerWeatherAdvice(weather.temperature, weather.condition)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default WeatherWidget;
