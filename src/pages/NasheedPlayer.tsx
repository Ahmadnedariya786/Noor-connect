import { useState, useMemo, useCallback } from 'react';
import { AppBar } from '@/components/AppBar';
import { PageTransition } from '@/components/PageTransition';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Search, Play, Pause, Music2, ExternalLink,
    Heart, Clock, Shuffle, ListMusic
} from 'lucide-react';
import nasheedsData from '@/data/nasheeds.json';
import { useGlobalNasheed, type NasheedTrack } from '@/lib/global-nasheed';

const CDN_URL = "https://noor-nasheed-cdn.arifubaid0345.workers.dev";

type Tab = 'all' | 'favorites' | 'recent';

// Normalize track URLs to always point at real CDN
const allTracks: NasheedTrack[] = nasheedsData.tracks.map(t => ({
    ...t,
    url: t.url.startsWith('http') ? t.url : `${CDN_URL}${t.url}`
}));

export default function NasheedPlayer() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<Tab>('all');

    const {
        isPlaying, currentTrack,
        playTrack, pause,
        favorites, recentlyPlayed,
        toggleFavorite, toggleShuffle, isShuffled,
    } = useGlobalNasheed();

    // ── Derived track lists ───────────────────────────────────────────────────
    const filteredAll = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return allTracks.filter(t =>
            t.title.toLowerCase().includes(q) ||
            t.artist.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const favoriteTracks = useMemo(() =>
        favorites
            .map(id => allTracks.find(t => t.id === id))
            .filter((t): t is NasheedTrack => !!t)
            .filter(t => {
                const q = searchQuery.toLowerCase();
                return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
            }),
        [favorites, searchQuery]
    );

    const recentTracks = useMemo(() =>
        recentlyPlayed
            .map(id => allTracks.find(t => t.id === id))
            .filter((t): t is NasheedTrack => !!t)
            .filter(t => {
                const q = searchQuery.toLowerCase();
                return t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q);
            }),
        [recentlyPlayed, searchQuery]
    );

    const displayedTracks = activeTab === 'all'
        ? filteredAll
        : activeTab === 'favorites'
        ? favoriteTracks
        : recentTracks;

    // ── Play action: always passes the current displayed list as queue ────────
    const handlePlay = useCallback((track: NasheedTrack) => {
        if (currentTrack?.id === track.id && isPlaying) {
            pause();
        } else {
            playTrack(track, displayedTracks);
        }
    }, [currentTrack, isPlaying, playTrack, pause, displayedTracks]);

    // ── Play All ──────────────────────────────────────────────────────────────
    const handlePlayAll = () => {
        if (filteredAll.length > 0) {
            playTrack(filteredAll[0], filteredAll);
        }
    };

    const tabs: { id: Tab; label: string; icon: typeof Music2; count: number }[] = [
        { id: 'all', label: 'All', icon: ListMusic, count: allTracks.length },
        { id: 'favorites', label: 'Favorites', icon: Heart, count: favorites.length },
        { id: 'recent', label: 'Recent', icon: Clock, count: recentlyPlayed.length },
    ];

    return (
        <PageTransition>
            <div className="min-h-screen bg-background pb-40">
                <AppBar title="Islamic Nasheeds" showBack={true} />

                <div className="px-4 pt-4 pb-6 space-y-5">
                    {/* ── Hero Card ────────────────────────────────────────── */}
                    <Card className="p-5 bg-gradient-to-br from-emerald-950 via-teal-950 to-zinc-900 text-white rounded-2xl border-0 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-4">
                                <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/10">
                                    <Music2 className="w-7 h-7 text-emerald-300" />
                                </div>
                                <div className="flex items-center gap-1.5 bg-emerald-500/20 px-3 py-1.5 rounded-full border border-emerald-500/30">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                                    <span className="text-xs font-bold text-emerald-300">{allTracks.length} Tracks</span>
                                </div>
                            </div>

                            <h2 className="text-2xl font-extrabold mb-1 tracking-tight">Copyright Free Nasheeds</h2>
                            <p className="text-emerald-200/70 text-sm mb-5 leading-relaxed max-w-[280px]">
                                Beautiful vocals-only nasheeds for your spiritual journey
                            </p>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={handlePlayAll}
                                    className="bg-emerald-500 hover:bg-emerald-400 text-white border-0 font-bold rounded-full px-5 h-10 gap-2 flex-1"
                                >
                                    <Play className="w-4 h-4 fill-current" />
                                    Play All
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={toggleShuffle}
                                    className={`rounded-full h-10 w-10 border border-white/20 bg-white/5 hover:bg-white/10 p-0 shrink-0 transition-all ${
                                        isShuffled ? 'text-emerald-400 border-emerald-500/50 bg-emerald-500/20' : 'text-white/60'
                                    }`}
                                >
                                    <Shuffle className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* ── Attribution ──────────────────────────────────────── */}
                    <div className="flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900">
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-tight">
                            Licensed from <strong>NoCopyrightNasheeds</strong><br />
                            <span className="opacity-70">NCN Community License</span>
                        </p>
                        <a
                            href={nasheedsData.attribution.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 transition-colors px-3 py-1.5 rounded-full text-white font-medium shrink-0"
                        >
                            Visit <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    {/* ── Search ───────────────────────────────────────────── */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
                        <Input
                            placeholder="Search nasheeds or artists..."
                            className="pl-10 h-11 bg-card border-border rounded-xl shadow-sm text-[15px]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* ── Tabs ─────────────────────────────────────────────── */}
                    <div className="flex gap-2">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all flex-1 justify-center border ${
                                        isActive
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                            : 'bg-card text-muted-foreground border-border hover:border-emerald-500/50 hover:text-foreground'
                                    }`}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${tab.id === 'favorites' && !isActive ? 'stroke-current' : ''} ${tab.id === 'favorites' && isActive ? 'fill-white' : ''}`} />
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

                    {/* ── Track List ───────────────────────────────────────── */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                {activeTab === 'all' ? 'Library' : activeTab === 'favorites' ? 'Your Favorites' : 'Recently Played'}
                            </h3>
                            <span className="text-xs text-muted-foreground font-medium">{displayedTracks.length}</span>
                        </div>

                        {displayedTracks.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground">
                                {activeTab === 'favorites' ? (
                                    <>
                                        <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No favorites yet</p>
                                        <p className="text-sm mt-1 opacity-70">Tap the ♥ on any track to save it</p>
                                    </>
                                ) : activeTab === 'recent' ? (
                                    <>
                                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">Nothing played yet</p>
                                        <p className="text-sm mt-1 opacity-70">Your playback history will appear here</p>
                                    </>
                                ) : (
                                    <>
                                        <Music2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No nasheeds match your search</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {displayedTracks.map((track, idx) => {
                                    const isCurrentTrack = currentTrack?.id === track.id;
                                    const isCurrentlyPlaying = isCurrentTrack && isPlaying;
                                    const isFav = favorites.includes(track.id);

                                    return (
                                        <Card
                                            key={`${track.id}-${activeTab}`}
                                            className={`rounded-xl border transition-all duration-200 ${
                                                isCurrentTrack
                                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/50 shadow-sm'
                                                    : 'bg-card hover:bg-accent/40 border-border'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 p-3">
                                                {/* Track Number / Play Button */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={`w-10 h-10 rounded-full shrink-0 transition-all ${
                                                        isCurrentTrack
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                            : 'bg-muted/60 text-muted-foreground hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-700'
                                                    }`}
                                                    onClick={() => handlePlay(track)}
                                                >
                                                    {isCurrentlyPlaying ? (
                                                        <Pause className="w-4 h-4 fill-current" />
                                                    ) : isCurrentTrack && !isPlaying ? (
                                                        <Play className="w-4 h-4 fill-current ml-0.5" />
                                                    ) : (
                                                        <span className="text-xs font-bold">{idx + 1}</span>
                                                    )}
                                                </Button>

                                                {/* Track Info */}
                                                <div
                                                    className="flex-1 min-w-0 cursor-pointer"
                                                    onClick={() => handlePlay(track)}
                                                >
                                                    <h4 className={`font-semibold text-[14px] truncate leading-tight mb-0.5 ${
                                                        isCurrentTrack ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'
                                                    }`}>
                                                        {track.title}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground truncate uppercase tracking-wide font-medium">
                                                        {track.artist}
                                                    </p>
                                                </div>

                                                {/* Equalizer animation */}
                                                {isCurrentlyPlaying && (
                                                    <div className="flex items-end gap-0.5 h-4 shrink-0">
                                                        {[...Array(4)].map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className="w-1 bg-emerald-500 rounded-full animate-bounce"
                                                                style={{
                                                                    animationDelay: `${i * 120}ms`,
                                                                    animationDuration: `${700 + i * 100}ms`,
                                                                    height: `${50 + i * 15}%`
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Favorite Button */}
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className={`w-8 h-8 rounded-full shrink-0 transition-all ${
                                                        isFav
                                                            ? 'text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                                                            : 'text-muted-foreground/40 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                                                    }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleFavorite(track.id);
                                                    }}
                                                >
                                                    <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
}
