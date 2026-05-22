import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Radio, Play, Pause, Volume2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { radioStations, type RadioStation } from "@/data/radio-stations";
import { useGlobalRadio } from "@/lib/global-radio";

const QuranRadio = () => {
  const navigate = useNavigate();
  const globalRadio = useGlobalRadio();
  const [isLoading, setIsLoading] = useState(true);
  const [popularStations, setPopularStations] = useState<RadioStation[]>([]);
  const [allStations, setAllStations] = useState<RadioStation[]>([]);

  useEffect(() => {
    loadStations();
  }, []);

  const loadStations = async () => {
    try {
      setIsLoading(true);

      // First 8 stations as popular stations
      const popular = radioStations.slice(0, 8);
      setPopularStations(popular);

      // All stations
      setAllStations(radioStations);

    } catch (error) {
      console.error('Failed to load stations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStationSelect = (station: RadioStation) => {
    // If clicking on the currently playing station, toggle play/pause
    if (globalRadio.currentStation?.id === station.id) {
      if (globalRadio.isPlaying) {
        globalRadio.pauseRadio();
      } else {
        globalRadio.playRadio({
          id: station.id,
          name: station.name,
          url: station.url
        });
      }
      return;
    }

    // Play new station using global radio
    globalRadio.playRadio({
      id: station.id,
      name: station.name,
      url: station.url
    });
  };

  const handleStopRadio = () => {
    globalRadio.stopRadio();
  };

  const handlePlayPause = () => {
    if (!globalRadio.currentStation) return;

    if (globalRadio.isPlaying) {
      globalRadio.pauseRadio();
    } else {
      globalRadio.playRadio(globalRadio.currentStation);
    }
  };

  // Check if a station is the current one
  const isCurrentStation = (station: RadioStation) =>
    globalRadio.currentStation?.id === station.id;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Quran Radio</h1>
              <p className="text-sm text-muted-foreground">Live Quran recitation 24/7</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate("/radio-stats")} className="rounded-full">
              <BarChart3 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Popular Stations */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-primary" />
            Popular Reciters
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {popularStations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                isPlaying={isCurrentStation(station) && globalRadio.isPlaying}
                onSelect={() => handleStationSelect(station)}
              />
            ))}
          </div>
        </div>

        {/* All Stations */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-primary" />
            All Stations ({allStations.length})
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allStations.map((station) => (
              <StationCard
                key={station.id}
                station={station}
                isPlaying={isCurrentStation(station) && globalRadio.isPlaying}
                onSelect={() => handleStationSelect(station)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Station Card Component
interface StationCardProps {
  station: RadioStation;
  isPlaying: boolean;
  onSelect: () => void;
}

const StationCard: React.FC<StationCardProps> = ({ station, isPlaying, onSelect }) => {
  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer ${isPlaying
        ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
        : 'hover:scale-105'
        }`}
      onClick={onSelect}
    >
      {/* Station Image */}
      <div className="aspect-square relative overflow-hidden">
        <img
          src={station.img}
          alt={station.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <div class="w-full h-full bg-primary/10 flex items-center justify-center">
                <svg class="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path>
                </svg>
              </div>
            `;
          }}
        />

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-primary ms-0.5" />
          </div>
        </div>

        {/* Now Playing Indicator */}
        {isPlaying && (
          <div className="absolute top-2 end-2">
            <div className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-medium">
              <div className="flex gap-0.5">
                <div className="w-1 h-3 bg-current animate-pulse"></div>
                <div className="w-1 h-3 bg-current animate-pulse delay-75"></div>
                <div className="w-1 h-3 bg-current animate-pulse delay-150"></div>
              </div>
              Playing
            </div>
          </div>
        )}
      </div>

      {/* Station Name */}
      <div className="p-3 text-center">
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{station.name}</h3>
        <p className="text-xs text-muted-foreground mt-1">Islamic Radio</p>
      </div>
    </Card>
  );
};

export default QuranRadio;
