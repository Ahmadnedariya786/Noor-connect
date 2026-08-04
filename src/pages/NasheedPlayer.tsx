import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { AppBar } from '@/components/AppBar';
import { PageTransition } from '@/components/PageTransition';
import { Input } from '@/components/ui/input';
import { useLanguage } from "@/contexts/LanguageContext-new";
import { Equalizer } from '@/components/Equalizer';
import {
    Search, Play, Music2, ExternalLink,
    Heart, Clock, Shuffle, ListMusic, X, CheckCircle2
} from 'lucide-react';
import nasheedsData from '@/data/nasheeds.json';
import { useGlobalNasheed, type NasheedTrack } from '@/lib/global-nasheed';
import { nasheedCache } from '@/lib/nasheed-cache';

const CDN_URL = "https://noor-nasheed-cdn.arifubaid0345.workers.dev";

type Tab = 'all' | 'favorites' | 'recent';

// Normalise artist: fallback generic/empty names to "Unknown Artist"
const GENERIC_ARTIST_NAMES = new Set([
    'nasheed', 'background nasheed', 'beautiful nasheed', 'heart touching nasheed'
]);
function normaliseArtist(raw?: string): string {
    const a = raw?.trim();
    if (!a) return 'Unknown Artist';
    if (GENERIC_ARTIST_NAMES.has(a.toLowerCase())) return 'Unknown Artist';
    return a;
}

// ── Memoised TrackRow: only re-renders when its own props change ──────────────
interface TrackRowProps {
    track: NasheedTrack;
    index: number;
    isCurrentTrack: boolean;
    isCurrentlyPlaying: boolean;
    isFav: boolean;
    isCached: boolean;
    onPlay: (track: NasheedTrack) => void;
    onToggleFav: (id: string) => void;
    onDeleteCache: (url: string) => void;
}

const TrackRow = memo(function TrackRow({
    track, index, isCurrentTrack, isCurrentlyPlaying, isFav, isCached,
    onPlay, onToggleFav, onDeleteCache,
}: TrackRowProps) {
    return (
        <div
            className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer ${
                isCurrentTrack
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/20'
                    : 'hover:bg-muted/60 active:opacity-80'
            }`}
            onClick={() => onPlay(track)}
            // contentVisibility lets browser skip off-screen paint/layout
            style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 60px' }}
        >
            {/* Play / number indicator */}
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 relative overflow-hidden bg-muted/40 group-hover:bg-emerald-500/10 transition-colors">
                {isCurrentlyPlaying ? (
                    <Equalizer
                        bars={3}
                        delayStep={120}
                        durationBase={700}
                        durationStep={100}
                        heightPercent={(i) => 40 + i * 20}
                        className="text-emerald-600 dark:text-emerald-400 scale-[0.7]"
                    />
                ) : isCurrentTrack ? (
                    <Play className="w-4 h-4 fill-emerald-600 text-emerald-600 dark:fill-emerald-400 dark:text-emerald-400 ml-0.5" />
                ) : (
                    <>
                        <span className="text-[11px] font-bold text-muted-foreground group-hover:opacity-0 transition-opacity select-none">
                            {index + 1}
                        </span>
                        <Play className="w-4 h-4 fill-emerald-600 text-emerald-600 absolute opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                    </>
                )}
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
                <p className={`font-semibold text-[14px] truncate tracking-tight transition-colors leading-tight ${
                    isCurrentTrack ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                }`}>
                    {track.title}
                </p>
                <p className="text-[11px] text-muted-foreground/70 truncate font-medium mt-0.5">
                    {normaliseArtist(track.artist)}
                </p>
            </div>

            {/* Actions — always visible for touch, opacity on hover for pointer */}
            <div className="flex items-center gap-0.5">
                {isCached && (
                    <button
                        className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shrink-0"
                        onClick={(e) => { e.stopPropagation(); onDeleteCache(track.url); }}
                        title="Remove from offline cache"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                    </button>
                )}
                <button
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                        isFav
                            ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                            : 'text-muted-foreground/60 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                    }`}
                    onClick={(e) => { e.stopPropagation(); onToggleFav(track.id); }}
                    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                >
                    <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                </button>
            </div>
        </div>
    );
});

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function NasheedPlayer() {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [selectedAuthors, setSelectedAuthors] = useState<string[]>([]);
    const [cachedUrls, setCachedUrls] = useState<Set<string>>(new Set());

    // ── Debounced search (300 ms) — avoids expensive filter on every keystroke (INP fix) ──
    const [inputValue, setInputValue] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        setInputValue(v);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setSearchQuery(v), 300);
    }, []);
    useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

    const allTracks = useMemo(() =>
        nasheedsData.tracks.map(t => ({
            ...t,
            url: t.url.startsWith('http') ? t.url : `${CDN_URL}${t.url}`
        })), []);

    const uniqueArtists = useMemo(() =>
        [...new Set(allTracks.map(t => t.artist))].sort(), [allTracks]);

    const {
        isPlaying, currentTrack,
        playTrack, pause,
        favorites, recentlyPlayed,
        toggleFavorite, toggleShuffle, isShuffled,
    } = useGlobalNasheed();

    // ── O(1) Set lookup for favorites ─────────────────────────────────────────
    const favSet = useMemo(() => new Set(favorites), [favorites]);

    // ── Cache status ──────────────────────────────────────────────────────────
    useEffect(() => {
        nasheedCache.getCachedUrls().then(urls => setCachedUrls(new Set(urls)));
    }, [currentTrack?.url]);

    const handleDeleteFromCache = useCallback(async (url: string) => {
        const deleted = await nasheedCache.deleteCached(url);
        if (deleted) setCachedUrls(prev => { const n = new Set(prev); n.delete(url); return n; });
    }, []);

    const handleClearAllCache = useCallback(async () => {
        await nasheedCache.clearAll();
        setCachedUrls(new Set());
    }, []);

    const toggleAuthor = useCallback((author: string) =>
        setSelectedAuthors(prev =>
            prev.includes(author) ? prev.filter(a => a !== author) : [...prev, author]
        ), []);

    const clearAuthors = useCallback(() => setSelectedAuthors([]), []);

    // ── Derived track lists ───────────────────────────────────────────────────
    const filteredAll = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return allTracks.filter(t => {
            const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
            const matchesAuthor = selectedAuthors.length === 0 || selectedAuthors.includes(t.artist);
            return matchesSearch && matchesAuthor;
        });
    }, [allTracks, searchQuery, selectedAuthors]);

    const favoriteTracks = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return favorites
            .map(id => allTracks.find(t => t.id === id))
            .filter((t): t is NasheedTrack => !!t)
            .filter(t => {
                const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
                const matchesAuthor = selectedAuthors.length === 0 || selectedAuthors.includes(t.artist);
                return matchesSearch && matchesAuthor;
            });
    }, [allTracks, favorites, searchQuery, selectedAuthors]);

    const recentTracks = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return recentlyPlayed
            .map(id => allTracks.find(t => t.id === id))
            .filter((t): t is NasheedTrack => !!t)
            .filter(t => {
                const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
                const matchesAuthor = selectedAuthors.length === 0 || selectedAuthors.includes(t.artist);
                return matchesSearch && matchesAuthor;
            });
    }, [allTracks, recentlyPlayed, searchQuery, selectedAuthors]);

    const displayedTracks = activeTab === 'all' ? filteredAll
        : activeTab === 'favorites' ? favoriteTracks
        : recentTracks;

    // ── Play action ───────────────────────────────────────────────────────────
    const handlePlay = useCallback((track: NasheedTrack) => {
        if (currentTrack?.id === track.id && isPlaying) {
            pause();
        } else {
            playTrack(track, displayedTracks);
        }
    }, [currentTrack, isPlaying, playTrack, pause, displayedTracks]);

    const handlePlayAll = useCallback(() => {
        if (filteredAll.length > 0) playTrack(filteredAll[0], filteredAll);
    }, [filteredAll, playTrack]);

    const tabs: { id: Tab; label: string; icon: typeof Music2; count: number }[] = [
        { id: 'all', label: 'All', icon: ListMusic, count: allTracks.length },
        { id: 'favorites', label: 'Favorites', icon: Heart, count: favorites.length },
        { id: 'recent', label: 'Recent', icon: Clock, count: recentlyPlayed.length },
    ];

    return (
        <PageTransition>
            <div className="min-h-screen bg-background pb-48">
                <AppBar title={t("islamicNasheeds") || "Islamic Nasheeds"} showBack={true} />

                <div className="px-4 pt-4 pb-6 space-y-4">
                    {/* ── Hero Card ────────────────────────────────────────── */}
                    <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-950 via-teal-950 to-zinc-900 text-white shadow-xl">
                        {/* Decorative glows */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-28 h-28 bg-teal-500/8 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none" />

                        <div className="relative z-10 p-5">
                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-white/10 p-2.5 rounded-2xl border border-white/10">
                                    <Music2 className="w-6 h-6 text-emerald-300" />
                                </div>
                                <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                    <span className="text-xs font-bold text-emerald-300">{allTracks.length} Tracks</span>
                                </div>
                            </div>

                            <h2 className="text-xl font-extrabold mb-1 tracking-tight">Copyright Free Nasheeds</h2>
                            <p className="text-emerald-200/60 text-sm mb-4 leading-relaxed max-w-[260px]">
                                Beautiful vocals-only nasheeds for your spiritual journey
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handlePlayAll}
                                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 active:bg-emerald-600 text-white font-bold rounded-full h-10 text-sm transition-colors"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Play All
                                </button>
                                <button
                                    onClick={toggleShuffle}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center border transition-colors ${
                                        isShuffled
                                            ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/20'
                                            : 'text-white/60 border-white/20 bg-white/5'
                                    }`}
                                >
                                    <Shuffle className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Attribution ──────────────────────────────────────── */}
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900">
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-tight">
                            Licensed from <strong>NoCopyrightNasheeds</strong><br />
                            <span className="opacity-70">NCN Community License</span>
                        </p>
                        <a
                            href={nasheedsData?.attribution?.website ?? '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-emerald-600 active:bg-emerald-700 px-3 py-1.5 rounded-full text-white font-medium shrink-0 transition-colors"
                        >
                            Visit <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {/* ── Search (debounced) ───────────────────────────────── */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Search nasheeds or artists..."
                            className="pl-10 h-11 bg-card border-border rounded-xl text-[15px]"
                            value={inputValue}
                            onChange={handleSearchChange}
                        />
                    </div>

                    {/* ── Cache Status ─────────────────────────────────────── */}
                    {cachedUrls.size > 0 && (
                        <div className="flex items-center justify-between text-[11px] font-medium px-1">
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                {cachedUrls.size} cached for offline
                            </span>
                            <button
                                onClick={handleClearAllCache}
                                className="text-muted-foreground hover:text-rose-500 transition-colors"
                            >
                                Clear cache
                            </button>
                        </div>
                    )}

                    {/* ── Artist Filter ─────────────────────────────────────── */}
                    {uniqueArtists.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            <div
                                className="flex-1 overflow-x-auto"
                                style={{ scrollbarWidth: 'none' }}
                            >
                                <div className="flex gap-1.5 pb-0.5">
                                    {uniqueArtists.map(author => {
                                        const isSelected = selectedAuthors.includes(author);
                                        return (
                                            <button
                                                key={author}
                                                onClick={() => toggleAuthor(author)}
                                                className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 transition-colors ${
                                                    isSelected
                                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                                        : 'bg-card text-muted-foreground border-border hover:border-emerald-500/50'
                                                }`}
                                            >
                                                {author}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            {selectedAuthors.length > 0 && (
                                <button
                                    onClick={clearAuthors}
                                    className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
                                    aria-label="Clear filter"
                                >
                                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── Tabs ─────────────────────────────────────────────── */}
                    <div className="flex gap-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-semibold flex-1 justify-center border transition-colors ${
                                        isActive
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-card text-muted-foreground border-border hover:border-emerald-500/50'
                                    }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${tab.id === 'favorites' && isActive ? 'fill-white' : ''}`} />
                                    {tab.label}
                                    {tab.count > 0 && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-white/20' : 'bg-muted'}`}>
                                            {tab.count > 99 ? '99+' : tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* ── Track List Header ─────────────────────────────────── */}
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                            {activeTab === 'all' ? 'Library' : activeTab === 'favorites' ? 'Your Favorites' : 'Recently Played'}
                        </h3>
                        <span className="text-xs text-muted-foreground font-medium">{displayedTracks.length}</span>
                    </div>

                    {/* ── Track List ───────────────────────────────────────── */}
                    {displayedTracks.length === 0 ? (
                        <div className="text-center py-14 text-muted-foreground">
                            {activeTab === 'favorites' ? (
                                <>
                                    <Heart className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium text-sm">No favorites yet</p>
                                    <p className="text-xs mt-1 opacity-60">Tap ♥ on any track to save it</p>
                                </>
                            ) : activeTab === 'recent' ? (
                                <>
                                    <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium text-sm">Nothing played yet</p>
                                    <p className="text-xs mt-1 opacity-60">Your history will appear here</p>
                                </>
                            ) : (
                                <>
                                    <Music2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">No nasheeds match your search</p>
                                </>
                            )}
                        </div>
                    ) : (
                        // `contain: layout style` isolates each row from outside layout changes
                        <div className="flex flex-col" style={{ contain: 'layout style' }}>
                            {displayedTracks.map((track, index) => (
                                <TrackRow
                                    key={track.id}
                                    track={track}
                                    index={index}
                                    isCurrentTrack={currentTrack?.id === track.id}
                                    isCurrentlyPlaying={currentTrack?.id === track.id && isPlaying}
                                    isFav={favSet.has(track.id)}
                                    isCached={cachedUrls.has(track.url)}
                                    onPlay={handlePlay}
                                    onToggleFav={toggleFavorite}
                                    onDeleteCache={handleDeleteFromCache}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
}
