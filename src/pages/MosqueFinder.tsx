import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  MapPin,
  Navigation,
  Star,
  Clock,
  Compass,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  Sparkles,
  X,
  Check,
  Building,
  Footprints,
  Car
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppBar } from "@/components/AppBar";
import { LayoutManager } from "@/components/LayoutManager";
import { useToast } from "@/hooks/use-toast";
import { useLocationState } from "@/lib/location-state";
import {
  fetchNearbyMosques,
  toggleFavouriteMosque,
  saveMosqueJamaatTimes,
  openGoogleMapsDirections,
  openGoogleMapsSearchNearby,
  type MosqueItem,
  type MosqueJamaatTimes,
} from "@/lib/mosque-service";

interface JamaatModalProps {
  mosque: MosqueItem;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function MosqueJamaatModal({ mosque, isOpen, onClose, onSaved }: JamaatModalProps) {
  const { toast } = useToast();
  const [fajr, setFajr] = useState(mosque.jamaatTimes?.fajr || "");
  const [dhuhr, setDhuhr] = useState(mosque.jamaatTimes?.dhuhr || "");
  const [asr, setAsr] = useState(mosque.jamaatTimes?.asr || "");
  const [maghrib, setMaghrib] = useState(mosque.jamaatTimes?.maghrib || "");
  const [isha, setIsha] = useState(mosque.jamaatTimes?.isha || "");
  const [jummah, setJummah] = useState(mosque.jamaatTimes?.jummah || "");

  useEffect(() => {
    setFajr(mosque.jamaatTimes?.fajr || "");
    setDhuhr(mosque.jamaatTimes?.dhuhr || "");
    setAsr(mosque.jamaatTimes?.asr || "");
    setMaghrib(mosque.jamaatTimes?.maghrib || "");
    setIsha(mosque.jamaatTimes?.isha || "");
    setJummah(mosque.jamaatTimes?.jummah || "");
  }, [mosque]);

  if (!isOpen || typeof document === "undefined") return null;

  const handleSave = () => {
    const times: MosqueJamaatTimes = {
      fajr: fajr.trim() || undefined,
      dhuhr: dhuhr.trim() || undefined,
      asr: asr.trim() || undefined,
      maghrib: maghrib.trim() || undefined,
      isha: isha.trim() || undefined,
      jummah: jummah.trim() || undefined,
    };
    saveMosqueJamaatTimes(mosque.id, times);
    toast({
      title: "Jamaat Times Saved",
      description: `Updated local prayer schedule for ${mosque.name}`,
    });
    onSaved();
    onClose();
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[99995] flex items-center justify-center p-4 select-none"
      style={{
        backgroundColor: "rgba(2, 4, 10, 0.82)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] max-h-[90vh] flex flex-col overflow-hidden text-[var(--text-primary)] rounded-[26px] border shadow-2xl transition-colors"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
      >
        {/* Modal Header */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-sm font-bold truncate text-[var(--text-primary)]">
              🕌 Local Jamaat Times
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              {mosque.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--surface-2)] text-[var(--text-secondary)] active:scale-95 transition-all shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Record this Masjid&apos;s daily congregation (Iqamah) times. Saved offline on your device.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Fajr Jamaat</Label>
              <Input
                type="text"
                placeholder="e.g. 06:15 AM"
                value={fajr}
                onChange={(e) => setFajr(e.target.value)}
                className="h-9 text-xs mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Dhuhr Jamaat</Label>
              <Input
                type="text"
                placeholder="e.g. 01:30 PM"
                value={dhuhr}
                onChange={(e) => setDhuhr(e.target.value)}
                className="h-9 text-xs mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Asr Jamaat</Label>
              <Input
                type="text"
                placeholder="e.g. 05:00 PM"
                value={asr}
                onChange={(e) => setAsr(e.target.value)}
                className="h-9 text-xs mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Maghrib Jamaat</Label>
              <Input
                type="text"
                placeholder="e.g. 06:00 PM"
                value={maghrib}
                onChange={(e) => setMaghrib(e.target.value)}
                className="h-9 text-xs mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Isha Jamaat</Label>
              <Input
                type="text"
                placeholder="e.g. 08:30 PM"
                value={isha}
                onChange={(e) => setIsha(e.target.value)}
                className="h-9 text-xs mt-1 rounded-xl"
              />
            </div>
            <div>
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Jumu&apos;ah Jamaat</Label>
              <Input
                type="text"
                placeholder="e.g. 01:45 PM"
                value={jummah}
                onChange={(e) => setJummah(e.target.value)}
                className="h-9 text-xs mt-1 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className="p-3 border-t flex items-center justify-end gap-2"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs h-9 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            className="text-xs h-9 rounded-xl font-bold gap-1"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "var(--on-accent)",
            }}
          >
            <Check className="w-3.5 h-3.5" />
            Save Times
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function MosqueFinder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocationState();

  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [selectedMosqueForJamaat, setSelectedMosqueForJamaat] = useState<MosqueItem | null>(null);

  const lat = location.latitude;
  const lon = location.longitude;

  const loadMosques = useCallback(
    async (force = false) => {
      if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const results = await fetchNearbyMosques(lat, lon, radiusMeters, force);
        setMosques(results);
      } catch (err) {
        console.warn("[MosqueFinder] Failed to fetch nearby mosques:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [lat, lon, radiusMeters]
  );

  useEffect(() => {
    loadMosques();
  }, [loadMosques]);

  const handleToggleFavourite = (mosque: MosqueItem) => {
    const isNowFav = toggleFavouriteMosque(mosque.id);
    setMosques((prev) =>
      prev
        .map((m) => (m.id === mosque.id ? { ...m, isFavourite: isNowFav } : m))
        .sort((a, b) => {
          if (a.isFavourite && !b.isFavourite) return -1;
          if (!a.isFavourite && b.isFavourite) return 1;
          return a.distanceMeters - b.distanceMeters;
        })
    );
    toast({
      title: isNowFav ? "Added to Favourites ⭐" : "Removed from Favourites",
      description: mosque.name,
    });
  };

  const filteredMosques = useMemo(() => {
    if (!searchFilter.trim()) return mosques;
    const q = searchFilter.toLowerCase().trim();
    return mosques.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.nativeName && m.nativeName.toLowerCase().includes(q)) ||
        m.address.toLowerCase().includes(q)
    );
  }, [mosques, searchFilter]);

  // Find My Masjid Jamaat: favourite mosque with custom Jamaat times
  const myMasjidWithJamaat = useMemo(() => {
    return mosques.find((m) => m.isFavourite && m.jamaatTimes && Object.keys(m.jamaatTimes).some(k => k !== 'updatedAt' && Boolean(m.jamaatTimes?.[k as keyof MosqueJamaatTimes])));
  }, [mosques]);

  return (
    <LayoutManager activeTab="services">
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-36">
        <AppBar title="Nearby Mosques" showBack={true} />

        <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
          {/* Header Action & Search Bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                  Live Overpass API • 100% Free
                </span>
                <h1 className="text-xl font-extrabold text-[var(--text-primary)] truncate">
                  Nearby Mosques & Masjids
                </h1>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => loadMosques(true)}
                disabled={isLoading}
                className="h-8 px-2.5 rounded-xl border text-xs gap-1 font-semibold shrink-0"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                }}
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent)] ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh</span>
              </Button>
            </div>

            {/* Radius Selector Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] pl-2 pr-1">Radius:</span>
              {[
                { label: "2 km", value: 2000 },
                { label: "5 km", value: 5000 },
                { label: "10 km", value: 10000 },
              ].map((opt) => {
                const isActive = radiusMeters === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRadiusMeters(opt.value)}
                    className="flex-1 py-1.5 text-xs font-bold rounded-xl transition-all text-center cursor-pointer"
                    style={{
                      background: isActive ? "linear-gradient(135deg, var(--accent), var(--accent-2))" : "transparent",
                      color: isActive ? "var(--on-accent)" : "var(--text-secondary)",
                      boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Search Input Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input
                type="text"
                placeholder="Search by mosque name or locality..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 h-10 rounded-xl text-xs"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* MY MASJID JAMAAT SUMMARY CARD (if configured) */}
          {myMasjidWithJamaat && myMasjidWithJamaat.jamaatTimes && (
            <Card
              className="p-4 rounded-2xl border space-y-2.5 transition-all shadow-md"
              style={{
                background: "linear-gradient(135deg, var(--accent-soft), var(--surface))",
                borderColor: "var(--accent)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 fill-[var(--accent)] text-[var(--accent)] shrink-0" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[var(--accent-text)]">
                    My Masjid Jamaat Times
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMosqueForJamaat(myMasjidWithJamaat)}
                  className="text-[10px] font-bold text-[var(--accent-text)] underline cursor-pointer"
                >
                  Edit Times
                </button>
              </div>

              <div className="text-sm font-bold text-[var(--text-primary)]">
                {myMasjidWithJamaat.name}
              </div>

              {/* Jamaat Timetable Strip */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                {[
                  { label: "Fajr", time: myMasjidWithJamaat.jamaatTimes.fajr },
                  { label: "Dhuhr", time: myMasjidWithJamaat.jamaatTimes.dhuhr },
                  { label: "Asr", time: myMasjidWithJamaat.jamaatTimes.asr },
                  { label: "Maghrib", time: myMasjidWithJamaat.jamaatTimes.maghrib },
                  { label: "Isha", time: myMasjidWithJamaat.jamaatTimes.isha },
                  { label: "Jumu'ah", time: myMasjidWithJamaat.jamaatTimes.jummah },
                ].map((slot) => (
                  <div
                    key={slot.label}
                    className="p-1.5 rounded-xl border text-center flex flex-col justify-center"
                    style={{
                      background: "var(--surface-2)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{slot.label}</span>
                    <span className="text-xs font-bold text-[var(--text-primary)] ltr-num" dir="ltr">
                      {slot.time || "--:--"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Location Missing Warning */}
          {(lat === null || lon === null || isNaN(lat) || isNaN(lon)) && (
            <Card
              className="p-5 rounded-2xl border text-center space-y-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Compass className="w-8 h-8 mx-auto text-[var(--accent)] animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold">Location Required</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  Please enable location permissions or select your city from the Home Screen to find nearby mosques.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/")}
                className="rounded-xl text-xs font-bold"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  color: "var(--on-accent)",
                }}
              >
                Go to Home Screen
              </Button>
            </Card>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="py-10 text-center space-y-3">
              <RefreshCw className="w-6 h-6 mx-auto animate-spin text-[var(--accent)]" />
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                Scanning OpenStreetMap Overpass servers within {radiusMeters / 1000} km...
              </p>
            </div>
          )}

          {/* Zero Results / Offline Fallback */}
          {!isLoading && filteredMosques.length === 0 && (
            <Card
              className="p-6 rounded-2xl border text-center space-y-4"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Building className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-60" />
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {searchFilter ? "No Mosques Matching Filter" : "No Mosques Found in Radius"}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                  OpenStreetMap tags may be sparse in this locality or you may be offline. You can expand the radius or search directly in Google Maps.
                </p>
              </div>

              {lat !== null && lon !== null && (
                <Button
                  type="button"
                  onClick={() => openGoogleMapsSearchNearby(lat, lon)}
                  className="w-full text-xs font-bold h-11 rounded-xl gap-2"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "var(--on-accent)",
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  🗺️ Search Nearby Mosques in Google Maps
                </Button>
              )}
            </Card>
          )}

          {/* Mosques List */}
          {!isLoading && filteredMosques.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
                <span>
                  Found <strong className="text-[var(--text-primary)]">{filteredMosques.length}</strong> mosques (nearest first)
                </span>
                {lat !== null && lon !== null && (
                  <button
                    type="button"
                    onClick={() => openGoogleMapsSearchNearby(lat, lon)}
                    className="flex items-center gap-1 font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {filteredMosques.map((mosque) => (
                <Card
                  key={mosque.id}
                  className="p-3.5 rounded-2xl border transition-all space-y-2.5"
                  style={{
                    background: mosque.isFavourite
                      ? "linear-gradient(135deg, var(--accent-soft), var(--surface))"
                      : "var(--surface)",
                    borderColor: mosque.isFavourite ? "var(--accent)" : "var(--border)",
                    boxShadow: mosque.isFavourite ? "0 4px 14px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  {/* Mosque Header: Name, Distance & Favourite Button */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                          {mosque.name}
                        </h3>
                        {mosque.isFavourite && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase"
                            style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                          >
                            Pinned
                          </span>
                        )}
                      </div>

                      {mosque.nativeName && (
                        <p className="font-arabic text-xs text-[var(--accent-text)]" dir="rtl">
                          {mosque.nativeName}
                        </p>
                      )}

                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {mosque.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleFavourite(mosque)}
                        className="p-1.5 rounded-full hover:bg-[var(--surface-2)] active:scale-90 transition-all cursor-pointer"
                        title={mosque.isFavourite ? "Remove from favourites" : "Pin as favourite"}
                      >
                        <Star
                          className={`w-4 h-4 ${
                            mosque.isFavourite
                              ? "fill-[var(--accent)] text-[var(--accent)]"
                              : "text-[var(--text-secondary)]"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Distance & Walking / Driving Estimates Strip */}
                  <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold border ltr-num"
                      dir="ltr"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: "var(--border)",
                        color: "var(--accent-text)",
                      }}
                    >
                      <MapPin className="w-3 h-3 text-[var(--accent)]" />
                      {mosque.distanceFormatted}
                    </span>

                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border text-[var(--text-secondary)]"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <Footprints className="w-3 h-3" />
                      {mosque.walkingEstimate}
                    </span>

                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold border text-[var(--text-secondary)]"
                      style={{
                        background: "var(--surface-2)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <Car className="w-3 h-3" />
                      {mosque.drivingEstimate}
                    </span>
                  </div>

                  {/* Saved Custom Jamaat Times (if any) */}
                  {mosque.jamaatTimes && (
                    <div
                      className="p-2 rounded-xl border space-y-1"
                      style={{ background: "var(--surface-2)", borderColor: "var(--border)" }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                        🕌 Saved Jamaat Times
                      </span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 text-[11px] font-mono">
                        {mosque.jamaatTimes.fajr && (
                          <div className="truncate">F: <strong>{mosque.jamaatTimes.fajr}</strong></div>
                        )}
                        {mosque.jamaatTimes.dhuhr && (
                          <div className="truncate">Dh: <strong>{mosque.jamaatTimes.dhuhr}</strong></div>
                        )}
                        {mosque.jamaatTimes.asr && (
                          <div className="truncate">Asr: <strong>{mosque.jamaatTimes.asr}</strong></div>
                        )}
                        {mosque.jamaatTimes.maghrib && (
                          <div className="truncate">Mag: <strong>{mosque.jamaatTimes.maghrib}</strong></div>
                        )}
                        {mosque.jamaatTimes.isha && (
                          <div className="truncate">Ish: <strong>{mosque.jamaatTimes.isha}</strong></div>
                        )}
                        {mosque.jamaatTimes.jummah && (
                          <div className="truncate">Jum: <strong>{mosque.jamaatTimes.jummah}</strong></div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 1-Tap Action Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openGoogleMapsDirections(mosque.latitude, mosque.longitude)}
                      className="h-8 rounded-xl text-xs font-semibold gap-1.5"
                      style={{
                        borderColor: "var(--border)",
                        background: "var(--surface-2)",
                        color: "var(--text-primary)",
                      }}
                    >
                      <Navigation className="w-3.5 h-3.5 text-[var(--accent)]" />
                      Directions
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMosqueForJamaat(mosque)}
                      className="h-8 rounded-xl text-xs font-semibold gap-1.5"
                      style={{
                        borderColor: "var(--accent)",
                        background: "var(--accent-soft)",
                        color: "var(--accent-text)",
                      }}
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Jamaat Times
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Jamaat Times Modal */}
        {selectedMosqueForJamaat && (
          <MosqueJamaatModal
            mosque={selectedMosqueForJamaat}
            isOpen={Boolean(selectedMosqueForJamaat)}
            onClose={() => setSelectedMosqueForJamaat(null)}
            onSaved={() => loadMosques(false)}
          />
        )}
      </div>
    </LayoutManager>
  );
}
