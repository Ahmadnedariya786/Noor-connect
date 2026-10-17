import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Compass, Navigation, Sun, Moon, Target } from "lucide-react";

interface QiblaInfoCardProps {
  location: {
    city?: string;
    country?: string;
    latitude: number;
    longitude: number;
  };
  qiblaDirection: number;
  distance: number;
  currentHeading: number;
  sunPosition?: {
    azimuth: number;
    altitude: number;
  };
}

const QiblaInfoCard = ({
  location,
  qiblaDirection,
  distance,
  currentHeading,
  sunPosition
}: QiblaInfoCardProps) => {
  const getDirectionText = (angle: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(angle / 45) % 8;
    return directions[index];
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  };

  const isSunUp = sunPosition && sunPosition.altitude > 0;

  return (
    <div className="space-y-4">
      {/* Location Card */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {location.city}, {location.country}
                </p>
                <p className="text-xs text-muted-foreground">
                  {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-xs">
              {getTimeBasedGreeting()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Qibla Direction Card */}
      <Card className="bg-gradient-to-r from-[var(--surface)] to-[var(--surface-2)] border-[var(--border)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                <Compass className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Qibla Direction</p>
                <p className="text-xs text-muted-foreground">
                  {getDirectionText(qiblaDirection)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[var(--accent)]">
                {qiblaDirection.toFixed(1)}°
              </p>
              <p className="text-xs text-muted-foreground">from North</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Distance to Kaaba */}
      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Distance to Kaaba</p>
                <p className="text-xs text-muted-foreground">Mecca, Saudi Arabia</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {distance > 1000 
                  ? `${(distance / 1000).toFixed(1)}k` 
                  : distance.toFixed(0)
                }
              </p>
              <p className="text-xs text-muted-foreground">kilometers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Heading */}
      <Card className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Current Heading</p>
                <p className="text-xs text-muted-foreground">
                  {getDirectionText(currentHeading)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {currentHeading.toFixed(1)}°
              </p>
              <p className="text-xs text-muted-foreground">device direction</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sun Position */}
      {sunPosition && (
        <Card className="bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  {isSunUp ? (
                    <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {isSunUp ? 'Sun Position' : 'Moon Position'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isSunUp ? 'Above horizon' : 'Below horizon'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {sunPosition.azimuth.toFixed(1)}°
                </p>
                <p className="text-xs text-muted-foreground">
                  Alt: {sunPosition.altitude.toFixed(1)}°
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QiblaInfoCard;
