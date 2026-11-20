import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
  Car,
  Plus,
  Trash2,
  BookmarkCheck,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppBar } from "@/components/AppBar";
import { LayoutManager } from "@/components/LayoutManager";
import { useToast } from "@/hooks/use-toast";
import { useLocationState } from "@/lib/location-state";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import {
  fetchNearbyMosques,
  searchMosquesOnline,
  getCurrentStreetLocation,
  getPrimaryMasjid,
  setPrimaryMasjid,
  saveCustomMosque,
  deleteCustomMosque,
  toggleFavouriteMosque,
  saveMosqueJamaatTimes,
  openGoogleMapsDirections,
  openGoogleMapsSearchNearby,
  type MosqueItem,
  type MosqueJamaatTimes,
  type StreetLocationResult,
} from "@/lib/mosque-service";

/* ─────────────────────────────────────────────────────────────
   MODAL 1: EDIT LOCAL JAMAAT TIMES FOR ANY MOSQUE
   ───────────────────────────────────────────────────────────── */
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
      description: `Updated congregation schedule for ${mosque.name}`,
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
        backgroundColor: "rgba(2, 4, 10, 0.85)",
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
            className="p-1.5 rounded-full hover:bg-[var(--surface-2)] text-[var(--text-secondary)] active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Record this Masjid&apos;s daily congregation (Iqamah) times. Saved offline on your device and displayed on the Home Screen.
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
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Zohar / Dhuhr</Label>
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
                placeholder="e.g. 06:05 PM"
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
            className="text-xs h-9 rounded-xl font-bold gap-1 cursor-pointer"
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

/* ─────────────────────────────────────────────────────────────
   MODAL 2: ADD LOCAL CUSTOM MASJID (+ JAMAAT TIMES)
   ───────────────────────────────────────────────────────────── */
interface AddMosqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultLat?: number | null;
  defaultLon?: number | null;
}

function AddCustomMosqueModal({
  isOpen,
  onClose,
  onSaved,
  defaultLat,
  defaultLon,
}: AddMosqueModalProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(defaultLat ? defaultLat.toFixed(5) : "");
  const [lon, setLon] = useState(defaultLon ? defaultLon.toFixed(5) : "");
  const [setAsPrimary, setSetAsPrimary] = useState(true);
  const [isDetectingGps, setIsDetectingGps] = useState(false);

  // Jamaat times
  const [fajr, setFajr] = useState("");
  const [dhuhr, setDhuhr] = useState("");
  const [asr, setAsr] = useState("");
  const [maghrib, setMaghrib] = useState("");
  const [isha, setIsha] = useState("");
  const [jummah, setJummah] = useState("");

  useEffect(() => {
    if (defaultLat && !lat) setLat(defaultLat.toFixed(6));
    if (defaultLon && !lon) setLon(defaultLon.toFixed(6));
  }, [defaultLat, defaultLon, lat, lon]);

  const handleAutoFillGps = async () => {
    setIsDetectingGps(true);
    try {
      if (Capacitor.isNativePlatform()) {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 7000 });
        if (pos?.coords && Number.isFinite(pos.coords.latitude) && Number.isFinite(pos.coords.longitude)) {
          setLat(pos.coords.latitude.toFixed(6));
          setLon(pos.coords.longitude.toFixed(6));
          toast({
            title: "GPS Captured 📍",
            description: `Exact pin: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
          });
          return;
        }
      }
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            setLat(pos.coords.latitude.toFixed(6));
            setLon(pos.coords.longitude.toFixed(6));
            toast({
              title: "GPS Captured 📍",
              description: `Exact pin: ${pos.coords.latitude.toFixed(4)}° N, ${pos.coords.longitude.toFixed(4)}° E`,
            });
          },
          () => {
            if (defaultLat && defaultLon) {
              setLat(defaultLat.toFixed(6));
              setLon(defaultLon.toFixed(6));
              toast({
                title: "Using Saved City GPS",
                description: "Live GPS was unavailable or permission denied.",
              });
            }
          },
          { enableHighAccuracy: true, timeout: 7000 }
        );
      } else if (defaultLat && defaultLon) {
        setLat(defaultLat.toFixed(6));
        setLon(defaultLon.toFixed(6));
      }
    } catch {
      if (defaultLat && defaultLon) {
        setLat(defaultLat.toFixed(6));
        setLon(defaultLon.toFixed(6));
      }
    } finally {
      setIsDetectingGps(false);
    }
  };

  if (!isOpen || typeof document === "undefined") return null;

  const handleSave = () => {
    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter the Masjid name.",
        variant: "destructive",
      });
      return;
    }

    const nLat = parseFloat(lat) || (defaultLat ?? 0);
    const nLon = parseFloat(lon) || (defaultLon ?? 0);

    const jamaatTimes: MosqueJamaatTimes = {
      fajr: fajr.trim() || undefined,
      dhuhr: dhuhr.trim() || undefined,
      asr: asr.trim() || undefined,
      maghrib: maghrib.trim() || undefined,
      isha: isha.trim() || undefined,
      jummah: jummah.trim() || undefined,
    };

    const newMosque = saveCustomMosque({
      name: name.trim(),
      address: address.trim() || "Local Masjid",
      latitude: nLat,
      longitude: nLon,
      jamaatTimes,
    });

    if (setAsPrimary) {
      setPrimaryMasjid(newMosque);
    }

    toast({
      title: "Local Masjid Added 🕌",
      description: `${name.trim()} is now saved ${setAsPrimary ? "and pinned as your Primary Masjid!" : "to your saved masjids."}`,
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
        backgroundColor: "rgba(2, 4, 10, 0.85)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[360px] max-h-[88vh] flex flex-col overflow-hidden text-[var(--text-primary)] rounded-[26px] border shadow-2xl transition-colors"
        style={{
          backgroundColor: "var(--bg-elev)",
          borderColor: "var(--border)",
        }}
      >
        {/* Header */}
        <div
          className="p-4 border-b flex items-center justify-between shrink-0"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="min-w-0 pr-2">
            <h3 className="text-sm font-bold truncate text-[var(--text-primary)]">
              ➕ Add Local Masjid
            </h3>
            <p className="text-[11px] text-[var(--text-secondary)] truncate">
              Save any local mosque with custom Jamaat schedule
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[var(--surface-2)] text-[var(--text-secondary)] active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 max-h-[70vh] pb-6">
          <div>
            <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Masjid Name *</Label>
            <Input
              type="text"
              placeholder="e.g. Madina Masjid, Chhapi"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-9 text-xs mt-1 rounded-xl"
            />
          </div>

          <div>
            <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Locality / Address</Label>
            <Input
              type="text"
              placeholder="e.g. Station Road, Vadgam, Gujarat"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-9 text-xs mt-1 rounded-xl"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-[11px] font-bold text-[var(--text-secondary)]">Coordinates (GPS)</Label>
              <button
                type="button"
                onClick={handleAutoFillGps}
                disabled={isDetectingGps}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg border text-[var(--accent-text)] cursor-pointer active:scale-95 transition-all"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <span>📍</span>
                <span>{isDetectingGps ? "Acquiring..." : "Auto-Fill My Exact GPS"}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Latitude</Label>
                <Input
                  type="text"
                  placeholder="24.08..."
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Longitude</Label>
                <Input
                  type="text"
                  placeholder="72.39..."
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
            </div>
            {Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lon)) && (
              <div className="mt-1 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => openGoogleMapsDirections(parseFloat(lat), parseFloat(lon))}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
                >
                  <span>Open in Google Maps ↗</span>
                </button>
              </div>
            )}
          </div>

          {/* Primary Masjid Toggle Checkbox */}
          <label className="flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer select-none" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
            <input
              type="checkbox"
              checked={setAsPrimary}
              onChange={(e) => setSetAsPrimary(e.target.checked)}
              className="w-4 h-4 rounded text-[var(--accent)] accent-[var(--accent)]"
            />
            <div className="text-xs">
              <span className="font-bold text-[var(--text-primary)] block">Set as Primary Masjid</span>
              <span className="text-[10px] text-[var(--text-secondary)] block">Displays Jamaat times directly on Home Screen Fard rows</span>
            </div>
          </label>

          {/* Jamaat Times Section */}
          <div className="pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--accent-text)] block mb-1.5">
              🕌 Daily Jamaat (Iqamah) Times (Optional)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Fajr</Label>
                <Input
                  type="text"
                  placeholder="06:15 AM"
                  value={fajr}
                  onChange={(e) => setFajr(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Zohar / Dhuhr</Label>
                <Input
                  type="text"
                  placeholder="01:30 PM"
                  value={dhuhr}
                  onChange={(e) => setDhuhr(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Asr</Label>
                <Input
                  type="text"
                  placeholder="05:00 PM"
                  value={asr}
                  onChange={(e) => setAsr(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Maghrib</Label>
                <Input
                  type="text"
                  placeholder="06:05 PM"
                  value={maghrib}
                  onChange={(e) => setMaghrib(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Isha</Label>
                <Input
                  type="text"
                  placeholder="08:30 PM"
                  value={isha}
                  onChange={(e) => setIsha(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
              <div>
                <Label className="text-[10px] text-[var(--text-secondary)]">Jumu&apos;ah</Label>
                <Input
                  type="text"
                  placeholder="01:45 PM"
                  value={jummah}
                  onChange={(e) => setJummah(e.target.value)}
                  className="h-8 text-xs mt-0.5 rounded-xl font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-3 border-t flex items-center justify-end gap-2 shrink-0"
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
            className="text-xs h-9 rounded-xl font-bold gap-1 cursor-pointer"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "var(--on-accent)",
            }}
          >
            <Check className="w-3.5 h-3.5" />
            Save Masjid
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ─────────────────────────────────────────────────────────────
   INLINE 6-PRAYER JAMAAT STRIP COMPONENT
   ───────────────────────────────────────────────────────────── */
interface InlineJamaatStripProps {
  times?: MosqueJamaatTimes;
  onEdit: () => void;
}

function InlineJamaatStrip({ times, onEdit }: InlineJamaatStripProps) {
  const slots = [
    { label: "FAJR", time: times?.fajr },
    { label: "ZOHAR", time: times?.dhuhr },
    { label: "ASR", time: times?.asr },
    { label: "MAGHRIB", time: times?.maghrib },
    { label: "ISHA", time: times?.isha },
  ];

  const hasAnyTime = times && Object.keys(times).some(k => k !== 'updatedAt' && Boolean(times[k as keyof MosqueJamaatTimes]));

  return (
    <div
      className="p-2 rounded-xl border space-y-1.5 transition-all select-none"
      style={{
        background: "var(--surface-2)",
        borderColor: "var(--border)",
      }}
    >
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-extrabold uppercase tracking-wider text-[var(--accent-text)] flex items-center gap-1">
          <span>🕌</span>
          <span>Jamaat Schedule</span>
        </span>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-0.5 text-[10px] font-bold text-[var(--accent-text)] hover:underline cursor-pointer"
        >
          <Edit3 className="w-2.5 h-2.5" />
          <span>{hasAnyTime ? "Edit Times" : "+ Add Times"}</span>
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1 text-center">
        {slots.map((s) => (
          <div
            key={s.label}
            className="p-1 rounded-lg border flex flex-col justify-center"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            <span className="text-[9px] font-bold text-[var(--text-secondary)] leading-tight">{s.label}</span>
            <span
              className="text-[11px] font-mono font-bold leading-tight ltr-num tabular-nums mt-0.5"
              dir="ltr"
              style={{
                color: s.time ? "var(--accent-text)" : "var(--text-secondary)",
                opacity: s.time ? 1 : 0.6,
              }}
            >
              {s.time || "--:--"}
            </span>
          </div>
        ))}
      </div>

      {times?.jummah && (
        <div className="flex items-center justify-between px-1 pt-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
          <span>Jumu&apos;ah Jamaat:</span>
          <span className="font-mono font-bold text-[var(--text-primary)] ltr-num" dir="ltr">
            {times.jummah}
          </span>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE: DEENIYAT-GRADE MOSQUE FINDER
   ───────────────────────────────────────────────────────────── */
export default function MosqueFinder() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const location = useLocationState();

  const [radiusMeters, setRadiusMeters] = useState<number>(5000);
  const [mosques, setMosques] = useState<MosqueItem[]>([]);
  const [primaryMasjid, setPrimaryMasjidState] = useState<MosqueItem | null>(() => getPrimaryMasjid());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [onlineResults, setOnlineResults] = useState<MosqueItem[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState<boolean>(false);
  const [selectedMosqueForJamaat, setSelectedMosqueForJamaat] = useState<MosqueItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [streetCoords, setStreetCoords] = useState<StreetLocationResult | null>(null);

  const lat = location.latitude;
  const lon = location.longitude;

  // Sync primary masjid changes
  useEffect(() => {
    const handleMasjidChange = () => {
      setPrimaryMasjidState(getPrimaryMasjid());
    };
    window.addEventListener("noor-primary-masjid-changed", handleMasjidChange);
    window.addEventListener("storage", handleMasjidChange);
    return () => {
      window.removeEventListener("noor-primary-masjid-changed", handleMasjidChange);
      window.removeEventListener("storage", handleMasjidChange);
    };
  }, []);

  // Fresh street GPS & multi-source fetch
  const loadMosques = useCallback(
    async (force = false) => {
      setIsLoading(true);
      try {
        const freshPos = await getCurrentStreetLocation(lat, lon);
        setStreetCoords(freshPos);
        const results = await fetchNearbyMosques(freshPos.latitude, freshPos.longitude, radiusMeters, force);
        setMosques(results);
        setPrimaryMasjidState(getPrimaryMasjid());
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

  // Live Server-Side Online Search (debounced 350ms)
  useEffect(() => {
    const trimmed = searchFilter.trim();
    if (trimmed.length < 3) {
      setOnlineResults([]);
      setIsSearchingOnline(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingOnline(true);
      try {
        const activeLat = streetCoords?.latitude ?? lat ?? 24.08;
        const activeLon = streetCoords?.longitude ?? lon ?? 72.39;
        const hits = await searchMosquesOnline(trimmed, activeLat, activeLon);
        setOnlineResults(hits);
      } catch {
        // Search error handled gracefully
      } finally {
        setIsSearchingOnline(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchFilter, streetCoords, lat, lon]);

  // Combined & Deduplicated Mosque List
  const displayedMosques = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();
    const map = new Map<string, MosqueItem>();

    // Add local results
    for (const m of mosques) {
      map.set(m.id, m);
    }

    // Add online search hits
    for (const m of onlineResults) {
      if (!map.has(m.id)) {
        map.set(m.id, m);
      }
    }

    let all = Array.from(map.values());

    if (q) {
      all = all.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.nativeName && m.nativeName.toLowerCase().includes(q)) ||
          m.address.toLowerCase().includes(q)
      );
    }

    // Sort: Primary masjid first, then Favourites, then by nearest distance
    return all.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      if (a.isFavourite && !b.isFavourite) return -1;
      if (!a.isFavourite && b.isFavourite) return 1;
      return a.distanceMeters - b.distanceMeters;
    });
  }, [mosques, onlineResults, searchFilter]);

  const handleToggleFavourite = (mosque: MosqueItem) => {
    const isNowFav = toggleFavouriteMosque(mosque.id);
    setMosques((prev) =>
      prev.map((m) => (m.id === mosque.id ? { ...m, isFavourite: isNowFav } : m))
    );
    toast({
      title: isNowFav ? "Added to Favourites ⭐" : "Removed from Favourites",
      description: mosque.name,
    });
  };

  const handleSetPrimary = (mosque: MosqueItem) => {
    if (primaryMasjid?.id === mosque.id) {
      setPrimaryMasjid(null);
      toast({
        title: "Primary Masjid Removed",
        description: "Home Screen will show general prayer times.",
      });
    } else {
      setPrimaryMasjid(mosque);
      toast({
        title: "Primary Masjid Synced 🕌",
        description: `${mosque.name} is now pinned to your Home Screen!`,
      });
    }
    loadMosques(false);
  };

  const handleDeleteCustom = (mosque: MosqueItem) => {
    deleteCustomMosque(mosque.id);
    toast({
      title: "Masjid Removed",
      description: `${mosque.name} deleted from local storage.`,
    });
    loadMosques(false);
  };

  const activeLat = streetCoords?.latitude ?? lat;
  const activeLon = streetCoords?.longitude ?? lon;

  return (
    <LayoutManager activeTab="services">
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] pb-36 select-none overflow-x-hidden">
        <AppBar title="Nearby Mosques" showBack={true} />

        <div className="max-w-lg mx-auto px-4 pt-3.5 space-y-3.5">
          {/* Header Action & Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)] block">
                  100% Free • OpenStreetMap & Komoot
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg font-extrabold text-[var(--text-primary)] truncate">
                    Nearby Mosques
                  </h1>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 select-none"
                    style={{
                      background: streetCoords?.isLiveGps ? "rgba(16, 185, 129, 0.15)" : "var(--surface-2)",
                      color: streetCoords?.isLiveGps ? "#10B981" : "var(--text-secondary)",
                      border: `1px solid ${streetCoords?.isLiveGps ? "rgba(16, 185, 129, 0.3)" : "var(--border)"}`,
                    }}
                  >
                    <span>{streetCoords?.isLiveGps ? "📍 Live GPS" : `📍 ${location.locationName?.split(',')[0]?.trim() || "Saved City"}`}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="h-8 px-2.5 rounded-xl text-xs gap-1 font-bold cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "var(--on-accent)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => loadMosques(true)}
                  disabled={isLoading}
                  className="h-8 px-2 rounded-xl border text-xs gap-1 font-semibold cursor-pointer"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface-2)",
                    color: "var(--text-primary)",
                  }}
                  title="Refresh GPS & Nearby Mosques"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[var(--accent)] ${isLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Radius Selector Pills (2 km | 5 km | 15 km) */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl border" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
              <span className="text-[11px] font-bold text-[var(--text-secondary)] pl-2 pr-1">Radius:</span>
              {[
                { label: "2 km", value: 2000 },
                { label: "5 km", value: 5000 },
                { label: "15 km", value: 15000 },
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

            {/* Live Search Input Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input
                type="text"
                placeholder="Search by name (e.g. Aqsa, Chhapi, Jumma)..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-9 pr-8 h-10 rounded-xl text-xs"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  color: "var(--text-primary)",
                }}
              />
              {isSearchingOnline && (
                <RefreshCw className="w-3.5 h-3.5 absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-[var(--accent)]" />
              )}
              {searchFilter && (
                <button
                  type="button"
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] p-1 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* PINNED PRIMARY MASJID HERO CARD (if set) */}
          {primaryMasjid && (
            <Card
              className="p-3.5 rounded-2xl border space-y-2.5 transition-all shadow-md select-none"
              style={{
                background: "linear-gradient(135deg, var(--accent-soft), var(--surface))",
                borderColor: "var(--accent)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Star className="w-4 h-4 fill-[var(--accent)] text-[var(--accent)] shrink-0" />
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--accent-text)] truncate">
                    🕌 Primary Masjid (Active on Home)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleSetPrimary(primaryMasjid)}
                  className="text-[10px] font-semibold text-[var(--text-secondary)] hover:text-red-400 cursor-pointer"
                >
                  Remove
                </button>
              </div>

              <div>
                <h2 className="text-sm font-extrabold text-[var(--text-primary)] leading-tight">
                  {primaryMasjid.name}
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                  {primaryMasjid.address}
                </p>
              </div>

              {/* Inline 6-prayer Jamaat Strip */}
              <InlineJamaatStrip
                times={primaryMasjid.jamaatTimes}
                onEdit={() => setSelectedMosqueForJamaat(primaryMasjid)}
              />

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openGoogleMapsDirections(primaryMasjid.latitude, primaryMasjid.longitude)}
                  className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-primary)",
                  }}
                >
                  <Navigation className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Directions</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSelectedMosqueForJamaat(primaryMasjid)}
                  className="h-8 rounded-xl text-xs font-bold gap-1 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "var(--on-accent)",
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Jamaat</span>
                </Button>
              </div>
            </Card>
          )}

          {/* Location Missing Card */}
          {(activeLat === null || activeLon === null || isNaN(activeLat) || isNaN(activeLon)) && (
            <Card
              className="p-5 rounded-2xl border text-center space-y-3"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Compass className="w-8 h-8 mx-auto text-[var(--accent)] animate-pulse" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold">Location Required</h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
                  Please enable location permissions or select your city from the Home Screen to discover nearby masjids.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => navigate("/")}
                className="rounded-xl text-xs font-bold cursor-pointer"
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
                Scanning OpenStreetMap & Komoot servers within {radiusMeters / 1000} km...
              </p>
            </div>
          )}

          {/* Zero Results / Offline Fallback */}
          {!isLoading && displayedMosques.length === 0 && (
            <Card
              className="p-6 rounded-2xl border text-center space-y-4"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <Building className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-60" />
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {searchFilter ? "No Mosques Matching Search" : "No Mosques Found in Radius"}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                  OpenStreetMap tags may be sparse in this locality or you may be offline. You can tap &quot;+ Add&quot; above to add your local masjid manually or search directly in Google Maps.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="w-full text-xs font-bold h-10 rounded-xl gap-1.5 cursor-pointer"
                  style={{
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    color: "var(--on-accent)",
                  }}
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Your Local Masjid</span>
                </Button>

                {activeLat !== null && activeLon !== null && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openGoogleMapsSearchNearby(activeLat, activeLon)}
                    className="w-full text-xs font-semibold h-10 rounded-xl gap-2 cursor-pointer"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface-2)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <ExternalLink className="w-4 h-4 text-[var(--accent)]" />
                    <span>Open in Google Maps</span>
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Mosques List */}
          {!isLoading && displayedMosques.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] px-1">
                <span>
                  Found <strong className="text-[var(--text-primary)]">{displayedMosques.length}</strong> mosques (nearest first)
                </span>
                {activeLat !== null && activeLon !== null && (
                  <button
                    type="button"
                    onClick={() => openGoogleMapsSearchNearby(activeLat, activeLon)}
                    className="flex items-center gap-1 font-semibold text-[var(--accent-text)] hover:underline cursor-pointer"
                  >
                    <span>Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>

              {displayedMosques.map((mosque) => {
                const isPrimary = primaryMasjid?.id === mosque.id;

                return (
                  <Card
                    key={mosque.id}
                    className="p-3.5 rounded-2xl border transition-all space-y-2.5"
                    style={{
                      background: isPrimary
                        ? "linear-gradient(135deg, var(--accent-soft), var(--surface))"
                        : "var(--surface)",
                      borderColor: isPrimary ? "var(--accent)" : "var(--border)",
                      boxShadow: isPrimary ? "0 4px 14px rgba(0,0,0,0.15)" : "none",
                    }}
                  >
                    {/* Mosque Header: Name, Distance & Favourite Button */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-bold text-[var(--text-primary)] leading-snug">
                            {mosque.name}
                          </h3>
                          {isPrimary && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase"
                              style={{ background: "var(--accent)", color: "var(--on-accent)" }}
                            >
                              ✓ Primary
                            </span>
                          )}
                          {mosque.isCustom && (
                            <span
                              className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full border text-[var(--text-secondary)]"
                              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
                            >
                              Local
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

                        {mosque.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustom(mosque)}
                            className="p-1.5 rounded-full hover:bg-[var(--surface-2)] active:scale-90 transition-all text-[var(--text-secondary)] hover:text-red-400 cursor-pointer"
                            title="Delete custom masjid"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Distance & Walking / Driving Estimates Strip */}
                    <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold border ltr-num"
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

                    {/* Inline 6-Prayer Jamaat Strip */}
                    <InlineJamaatStrip
                      times={mosque.jamaatTimes}
                      onEdit={() => setSelectedMosqueForJamaat(mosque)}
                    />

                    {/* 1-Tap Action Row */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openGoogleMapsDirections(mosque.latitude, mosque.longitude)}
                        className="h-8 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
                        style={{
                          borderColor: "var(--border)",
                          background: "var(--surface-2)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <Navigation className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Directions</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(mosque)}
                        className="h-8 rounded-xl text-xs font-semibold gap-1 cursor-pointer"
                        style={{
                          borderColor: isPrimary ? "var(--accent)" : "var(--border)",
                          background: isPrimary ? "var(--accent-soft)" : "var(--surface-2)",
                          color: isPrimary ? "var(--accent-text)" : "var(--text-primary)",
                        }}
                      >
                        <BookmarkCheck className={`w-3.5 h-3.5 ${isPrimary ? "text-[var(--accent)]" : ""}`} />
                        <span>{isPrimary ? "✓ Primary" : "Set Primary"}</span>
                      </Button>
                    </div>
                  </Card>
                );
              })}
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

        {/* Add Local Masjid Modal */}
        {isAddModalOpen && (
          <AddCustomMosqueModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSaved={() => loadMosques(true)}
            defaultLat={activeLat}
            defaultLon={activeLon}
          />
        )}
      </div>
    </LayoutManager>
  );
}
