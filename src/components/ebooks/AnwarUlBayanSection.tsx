import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  FolderUp,
  Layers,
  Upload,
  Sparkles,
  HardDrive,
  Trash2,
  CheckCircle,
  Download,
  Cloud,
  X,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  ANWAR_UL_BAYAN_VOLUMES,
  type AnwarUlBayanVolume,
  isVolumeLinkedLocally,
  linkVolumeLocalFile,
  unlinkVolumeLocalFile,
  getVolumeResolvedSource,
} from '@/lib/anwar-ul-bayan-data';
import { getPdfMetadata } from '@/lib/idb-pdf-store';
import { formatFileSize } from '@/lib/ebooks-storage';
import {
  downloadCloudEbook,
  cancelCloudEbookDownload,
  subscribeDownloadProgress,
  getDownloadState,
  formatBytes,
  syncCloudCatalogFromRemote,
  type DownloadProgressState,
} from '@/lib/ebooks-cloud';

interface AnwarUlBayanSectionProps {
  onOpenReader: (target: { url: string; title: string; localKey?: string }) => void;
}

export const AnwarUlBayanSection: React.FC<AnwarUlBayanSectionProps> = ({ onOpenReader }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [linkedStatus, setLinkedStatus] = useState<Record<string, boolean>>({});
  const [metadataMap, setMetadataMap] = useState<
    Record<string, { name: string; size: number; updatedAt: number } | null>
  >({});
  const [activeLinkingVolId, setActiveLinkingVolId] = useState<string | null>(null);
  const [overviewVolume, setOverviewVolume] = useState<AnwarUlBayanVolume | null>(null);
  const [downloads, setDownloads] = useState<Record<string, DownloadProgressState>>({});
  const [expandedVolSurahs, setExpandedVolSurahs] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  const refreshStatus = async () => {
    const statuses: Record<string, boolean> = {};
    const meta: Record<string, { name: string; size: number; updatedAt: number } | null> = {};

    for (const vol of ANWAR_UL_BAYAN_VOLUMES) {
      const linked = await isVolumeLinkedLocally(vol.localKey);
      statuses[vol.id] = linked;
      if (linked) {
        meta[vol.id] = await getPdfMetadata(vol.localKey);
      }
    }

    setLinkedStatus(statuses);
    setMetadataMap(meta);
  };

  useEffect(() => {
    void refreshStatus();
    void syncCloudCatalogFromRemote();

    // Populate initial download states
    const initDownloads: Record<string, DownloadProgressState> = {};
    ANWAR_UL_BAYAN_VOLUMES.forEach((v) => {
      const existing = getDownloadState(v.id);
      if (existing) initDownloads[v.id] = existing;
    });
    setDownloads(initDownloads);

    const unsubProgress = subscribeDownloadProgress((state) => {
      setDownloads((prev) => ({ ...prev, [state.volId]: state }));
      if (state.isCompleted) {
        void refreshStatus();
      }
    });

    const handleLinkedEvent = () => {
      void refreshStatus();
    };

    window.addEventListener('anwar-ul-bayan-linked', handleLinkedEvent);
    return () => {
      unsubProgress();
      window.removeEventListener('anwar-ul-bayan-linked', handleLinkedEvent);
    };
  }, []);

  const handleReadVolume = async (vol: AnwarUlBayanVolume) => {
    const isLinked = !!linkedStatus[vol.id];
    if (isLinked) {
      try {
        const source = await getVolumeResolvedSource(vol);
        onOpenReader({
          url: source.url,
          title: vol.title,
          localKey: source.localKey,
        });
        toast({
          title: `Opening ${vol.title}`,
          description: 'Reading from 100% offline local PDF storage.',
        });
      } catch (err) {
        console.warn('Failed to resolve volume source:', err);
        toast({
          title: 'Error Opening Book',
          description: 'Could not open the requested volume.',
          variant: 'destructive',
        });
      }
    } else {
      // Unlinked volume: show Cloud Delivery & Setup Modal
      setOverviewVolume(vol);
    }
  };

  const handleStartDownload = async (volId: string, autoOpen = true) => {
    const vol = ANWAR_UL_BAYAN_VOLUMES.find((v) => v.id === volId);
    if (!vol) return;

    toast({
      title: `Starting Download: Part ${vol.volNumber}`,
      description: 'Downloading from GitHub Releases CDN with offline storage...',
    });

    const success = await downloadCloudEbook(volId);
    if (success) {
      toast({
        title: '✓ Download Complete',
        description: `${vol.title} is now 100% available offline!`,
      });
      await refreshStatus();

      setOverviewVolume(null);
      if (autoOpen) {
        try {
          const source = await getVolumeResolvedSource(vol);
          onOpenReader({
            url: source.url,
            title: vol.title,
            localKey: source.localKey,
          });
        } catch (openErr) {
          console.warn('Auto-launch reader failed:', openErr);
        }
      }
    }
  };

  const handleCancelDownload = (volId: string) => {
    cancelCloudEbookDownload(volId);
    toast({
      title: 'Download Cancelled',
      description: 'The download process was stopped.',
    });
  };

  const handleTriggerLinkFile = (volId: string) => {
    setActiveLinkingVolId(volId);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeLinkingVolId) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: 'Invalid File',
        description: 'Please select a valid PDF file.',
        variant: 'destructive',
      });
      return;
    }

    const vol = ANWAR_UL_BAYAN_VOLUMES.find((v) => v.id === activeLinkingVolId);
    if (!vol) return;

    try {
      toast({
        title: 'Linking Local PDF File...',
        description: `Storing ${file.name} (${formatFileSize(file.size)}) in IndexedDB...`,
      });

      await linkVolumeLocalFile(vol.localKey, file);
      await refreshStatus();

      toast({
        title: '✓ Local PDF Linked Successfully',
        description: `${vol.title} is now permanently available 100% offline! Opening reader...`,
      });

      try {
        const source = await getVolumeResolvedSource(vol);
        onOpenReader({
          url: source.url,
          title: vol.title,
          localKey: source.localKey,
        });
      } catch (openErr) {
        console.warn('Auto-launch reader failed:', openErr);
      }
    } catch (err) {
      console.warn('Failed to link local file:', err);
      toast({
        title: 'Linking Failed',
        description: 'Could not save the PDF into offline storage.',
        variant: 'destructive',
      });
    } finally {
      setActiveLinkingVolId(null);
    }
  };

  const handleBatchFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    let linkedCount = 0;
    const fileList = Array.from(files);

    for (const vol of ANWAR_UL_BAYAN_VOLUMES) {
      const match = fileList.find((f) => {
        const lower = f.name.toLowerCase();
        const vNum = vol.volNumber;
        return (
          lower.includes(`vol${vNum}`) ||
          lower.includes(`vol-${vNum}`) ||
          lower.includes(`vol_${vNum}`) ||
          lower.includes(`vol ${vNum}`) ||
          lower.includes(`volume${vNum}`) ||
          lower.includes(`volume-${vNum}`) ||
          lower.includes(`volume_${vNum}`) ||
          lower.includes(`volume ${vNum}`) ||
          lower.includes(`part${vNum}`) ||
          lower.includes(`part ${vNum}`) ||
          lower.includes(`jild${vNum}`) ||
          lower.includes(`jild ${vNum}`)
        );
      });

      if (match) {
        try {
          await linkVolumeLocalFile(vol.localKey, match);
          linkedCount++;
        } catch (err) {
          console.warn(`Failed to auto-link ${vol.title}:`, err);
        }
      }
    }

    await refreshStatus();

    if (linkedCount > 0) {
      toast({
        title: `✓ ${linkedCount} Volume(s) Linked Successfully`,
        description: 'Linked volume(s) are now 100% available offline in IndexedDB storage.',
      });
    } else {
      toast({
        title: 'Could Not Auto-Match Files',
        description: 'Please ensure filenames include Vol 1 to Vol 5 (e.g., AnwarulBayan-Volume1.pdf).',
        variant: 'destructive',
      });
    }

    if (batchFileInputRef.current) {
      batchFileInputRef.current.value = '';
    }
  };

  const handleUnlinkVolume = async (vol: AnwarUlBayanVolume) => {
    try {
      await unlinkVolumeLocalFile(vol.localKey);
      await refreshStatus();
      toast({
        title: 'File Unlinked',
        description: `Local file for ${vol.title} has been unlinked.`,
      });
    } catch (err) {
      console.warn('Failed to unlink volume:', err);
    }
  };

  return (
    <section className="space-y-4">
      {/* Hidden File Input for Linking Single Local PDF */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Hidden File Input for Batch Linking Multiple Local PDFs */}
      <input
        type="file"
        ref={batchFileInputRef}
        accept="application/pdf,.pdf"
        multiple
        className="hidden"
        onChange={handleBatchFilesSelected}
      />

      {/* Showcase Master Banner */}
      <div
        className="relative overflow-hidden rounded-[24px] p-5 sm:p-6 border border-[var(--border)] shadow-xl"
        style={{
          background: 'linear-gradient(135deg, var(--surface), var(--surface-2))',
          boxShadow: 'inset 0 1px 0 var(--card-sheen-line, var(--card-sheen)), 0 10px 30px rgba(0,0,0,0.3)',
        }}
      >
        <div
          className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[35px] pointer-events-none"
          style={{ background: 'var(--accent-soft)' }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full blur-[28px] pointer-events-none"
          style={{ background: 'var(--accent-glow)' }}
        />

        <div className="relative z-10 space-y-3">
          {/* Top Badges Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap" style={{ marginBottom: '14px' }}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] shrink-0" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-text)]">
                Master Classical Tafsir • 5 Volumes
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono font-bold border-[var(--accent)] text-[var(--accent-text)] bg-[var(--accent-soft)]"
            >
              Juz 1 to 30 Complete
            </Badge>
          </div>

          {/* Titles & Author */}
          <div className="space-y-2">
            <h2
              dir="rtl"
              className="text-xl sm:text-2xl font-extrabold text-[var(--accent-text)]"
              style={{
                fontFamily: 'var(--font-urdu), serif',
                lineHeight: 2.15,
                marginTop: '6px',
                marginBottom: '8px',
              }}
            >
              تفسیر انوار البیان فی کشف اسرار القرآن
            </h2>
            <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
              Tafseer Anwar-ul-Bayan — Complete 5-Volume Set
            </h3>
            <p
              dir="rtl"
              className="text-xs text-[var(--text-secondary)] leading-relaxed"
              style={{ fontFamily: 'var(--font-urdu), serif', lineHeight: 1.9 }}
            >
              تالیف: حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی (رحمه الله)
            </p>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            A celebrated 20th-century exegesis renowned throughout the Muslim world for combining authentic classical sources (Tabari, Ibn Kathir, Qurtubi) with contemporary clarity. Stream directly from Noor Connect Cloud or save 100% offline into app storage.
          </p>

          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => batchFileInputRef.current?.click()}
              className="h-9 px-3.5 text-xs font-bold gap-2 border-[var(--accent)] text-[var(--accent-text)] bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 cursor-pointer shadow-sm"
            >
              <FolderUp className="w-4 h-4 shrink-0 text-[var(--accent)]" />
              <span>Link All 5 Volumes (Vol 1–5)</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 5 Volumes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {ANWAR_UL_BAYAN_VOLUMES.map((vol) => {
          const isLinked = !!linkedStatus[vol.id];
          const meta = metadataMap[vol.id];
          const dlState = downloads[vol.id];
          const isDownloading = Boolean(dlState?.isDownloading);
          const isSurahsExpanded = !!expandedVolSurahs[vol.id];
          const displayedSurahs = isSurahsExpanded ? vol.surahs : vol.surahs.slice(0, 4);

          return (
            <Card
              key={vol.id}
              className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] transition-all flex flex-col justify-between shadow-sm"
              style={{
                padding: '12px 14px',
                boxShadow: 'inset 0 1px 0 var(--card-sheen-line, var(--card-sheen))',
              }}
            >
              <div className="space-y-2.5">
                {/* Header Tag Row: Single-Line Top Badges */}
                <div className="flex items-center justify-between gap-1.5 w-full min-w-0 flex-nowrap">
                  <span
                    className="font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]"
                    style={{
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      fontSize: '0.64rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    PART {vol.volNumber} • JUZ {vol.juzStart}–{vol.juzEnd}
                  </span>

                  <span
                    dir="rtl"
                    className="font-bold bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]"
                    style={{
                      fontFamily: 'var(--font-urdu), serif',
                      fontSize: '0.76rem',
                      lineHeight: 1.3,
                      padding: '2px 9px',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      borderRadius: '9999px',
                    }}
                  >
                    جلد {vol.volNumber}
                  </span>

                  {isLinked ? (
                    <span
                      className="font-bold text-[var(--success)] bg-[var(--success)]/10 border border-[var(--success)]/40"
                      style={{
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircle className="w-3 h-3 shrink-0" />
                      <span>Saved Offline</span>
                    </span>
                  ) : isDownloading ? (
                    <span
                      className="font-bold text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)] animate-pulse"
                      style={{
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                      <span>{dlState?.percent || 0}%</span>
                    </span>
                  ) : (
                    <span
                      className="font-bold text-[var(--accent-text)] bg-[var(--accent-soft)] border border-[var(--accent)]"
                      style={{
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        fontSize: '0.64rem',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Cloud className="w-3 h-3 shrink-0" />
                      <span>Cloud Ready</span>
                    </span>
                  )}
                </div>

                {/* English Title & Coverage */}
                <div>
                  <h5 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    {vol.title}
                  </h5>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <p className="text-[11px] text-[var(--accent-text)] font-medium">
                      📖 {vol.coverage}
                    </p>
                    {/* Fix 4B: Explicit RTL BiDi Order so it ALWAYS reads 'پارہ 1 تا 7' */}
                    <div
                      dir="rtl"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-urdu), serif',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        borderRadius: '8px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--accent-text)',
                      }}
                    >
                      <span>پارہ</span>
                      <span dir="ltr" style={{ fontFamily: 'sans-serif', fontWeight: 700, fontSize: '0.72rem' }}>
                        {vol.juzStart}
                      </span>
                      <span>تا</span>
                      <span dir="ltr" style={{ fontFamily: 'sans-serif', fontWeight: 700, fontSize: '0.72rem' }}>
                        {vol.juzEnd}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {vol.description}
                </p>

                {/* Live Download Progress Bar */}
                {isDownloading && dlState && (
                  <div className="space-y-1 my-2 p-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--accent)] animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-[var(--accent-text)] font-bold flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {dlState.percent}%
                      </span>
                      <span
                        className="text-[var(--text-secondary)]"
                        style={{
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: '0.72rem',
                        }}
                      >
                        {formatBytes(dlState.loadedBytes)} / {formatBytes(dlState.totalBytes)}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--surface)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                      <div
                        className="bg-[var(--accent)] h-full transition-all duration-200"
                        style={{ width: `${Math.max(3, dlState.percent)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">
                      {dlState.statusText}
                    </p>
                  </div>
                )}

                {/* Surahs Included Pill Tags */}
                <div className="pt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                    Surahs Included:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {displayedSurahs.map((s) => (
                      <span
                        key={s.number}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)] shrink-0"
                      >
                        #{s.number} {s.name}
                      </span>
                    ))}
                    {vol.surahs.length > 4 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedVolSurahs((prev) => ({
                            ...prev,
                            [vol.id]: !prev[vol.id],
                          }))
                        }
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors cursor-pointer shrink-0 font-bold"
                      >
                        {isSurahsExpanded ? 'Show less' : `+${vol.surahs.length - 4} Surahs`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Local File Binding Info */}
                {isLinked && meta && (
                  <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] flex items-center justify-between">
                    <span className="truncate max-w-[170px]" title={meta.name}>
                      📁 {meta.name}
                    </span>
                    <span className="font-mono font-bold text-[var(--success)] shrink-0">
                      {formatFileSize(meta.size)}
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 mt-2.5 border-t border-[var(--border)] flex items-center gap-2">
                {isDownloading ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCancelDownload(vol.id)}
                    className="flex-1 text-xs font-semibold gap-1.5 cursor-pointer h-8 text-[var(--danger)] border-[var(--danger)]/50 hover:bg-[var(--danger)]/10"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel Download</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleReadVolume(vol)}
                    className="flex-1 text-xs font-bold gap-1.5 cursor-pointer h-8"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{isLinked ? 'Read (Offline)' : 'Read Volume'}</span>
                  </Button>
                )}

                {isLinked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkVolume(vol);
                    }}
                    title="Unlink local file"
                    className="h-8 px-2.5 text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                ) : !isDownloading ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartDownload(vol.id);
                      }}
                      title={`Download Part ${vol.volNumber} (${vol.estimatedSize})`}
                      className="h-8 px-2.5 cursor-pointer border-[var(--accent)] text-[var(--accent-text)] bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerLinkFile(vol.id);
                      }}
                      title="Link local PDF file from device storage"
                      className="h-8 px-2.5 text-xs font-semibold cursor-pointer border-[var(--border)] text-[var(--text-secondary)]"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>

      {/* In-App Volume Cloud Delivery & Setup Sheet */}
      <Dialog open={!!overviewVolume} onOpenChange={(open) => !open && setOverviewVolume(null)}>
        <DialogContent
          className="w-[94vw] rounded-2xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-2xl max-h-[88vh] overflow-y-auto"
          style={{
            maxWidth: 'calc(100vw - 32px)',
            overflowX: 'hidden',
            padding: '16px',
            boxSizing: 'border-box',
          }}
        >
          {overviewVolume && (
            <div className="space-y-3.5">
              <DialogHeader className="text-left space-y-1 pb-2 border-b border-[var(--border)] pr-10">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)] shrink-0">
                      PART {overviewVolume.volNumber} • JUZ {overviewVolume.juzStart}–{overviewVolume.juzEnd}
                    </span>
                    <div
                      dir="rtl"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-urdu), serif',
                        fontSize: '0.82rem',
                        lineHeight: 1.5,
                        padding: '2px 8px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        borderRadius: '8px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        color: 'var(--accent-text)',
                      }}
                    >
                      <span>پارہ</span>
                      <span dir="ltr" style={{ fontFamily: 'sans-serif', fontWeight: 700, fontSize: '0.72rem' }}>
                        {overviewVolume.juzStart}
                      </span>
                      <span>تا</span>
                      <span dir="ltr" style={{ fontFamily: 'sans-serif', fontWeight: 700, fontSize: '0.72rem' }}>
                        {overviewVolume.juzEnd}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono border-[var(--border)] text-[var(--text-secondary)] shrink-0 font-bold">
                    {overviewVolume.estimatedSize}
                  </Badge>
                </div>

                {/* Clean 1-Line Urdu Title Without Awkward Parenthesis Wraps */}
                <DialogTitle
                  dir="rtl"
                  className="font-bold text-[var(--accent-text)] mt-1.5"
                  style={{
                    fontFamily: 'var(--font-urdu), serif',
                    lineHeight: 1.8,
                    fontSize: '1.25rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    width: '100%',
                    maxWidth: '100%',
                    textAlign: 'right',
                  }}
                >
                  {overviewVolume.urduTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--text-secondary)] font-medium">
                  {overviewVolume.title} — {overviewVolume.coverage}
                </DialogDescription>
              </DialogHeader>

              {/* 2 Clear, 100% Working Delivery Options */}
              <div className="space-y-2.5 w-full max-w-full min-w-0">
                {/* Option 1: High-Speed Native Stream & Download from Noor Connect Cloud */}
                <div
                  className="p-3.5 rounded-xl border border-[var(--accent)] space-y-2.5 w-full max-w-full min-w-0"
                  style={{ background: 'var(--accent-soft)', boxSizing: 'border-box' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-text)]">
                      <Cloud className="w-4 h-4 text-[var(--accent)] shrink-0" />
                      <span>Download & Open from Noor Connect Cloud</span>
                    </div>
                    <span className="text-[10px] font-bold text-[var(--accent-text)] bg-[var(--surface)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      Permanent Offline
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Streams {overviewVolume.fileName} directly from the Noor Connect Release CDN into app IndexedDB storage. Opens automatically in the reader upon completion.
                  </p>

                  {downloads[overviewVolume.id]?.isDownloading ? (
                    <div className="space-y-1.5 p-2 rounded-lg bg-[var(--surface)] border border-[var(--accent)]">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-[var(--accent-text)] font-bold flex items-center gap-1">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Downloading ({downloads[overviewVolume.id].percent}%)
                        </span>
                        <span
                          className="text-[var(--text-secondary)]"
                          style={{
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '0.72rem',
                          }}
                        >
                          {formatBytes(downloads[overviewVolume.id].loadedBytes)} /{' '}
                          {formatBytes(downloads[overviewVolume.id].totalBytes)}
                        </span>
                      </div>
                      <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                        <div
                          className="bg-[var(--accent)] h-full transition-all duration-200"
                          style={{ width: `${Math.max(3, downloads[overviewVolume.id].percent)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] truncate">
                        {downloads[overviewVolume.id].statusText}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelDownload(overviewVolume.id)}
                        className="w-full text-xs font-semibold text-[var(--danger)] border-[var(--danger)]/50 mt-1"
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancel Download
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => handleStartDownload(overviewVolume.id, true)}
                      className="w-full text-xs font-bold gap-2 py-2 cursor-pointer shadow-md"
                    >
                      <Download className="w-4 h-4 shrink-0" />
                      <span>Download & Open Vol {overviewVolume.volNumber} ({overviewVolume.estimatedSize})</span>
                    </Button>
                  )}
                </div>

                {/* Option 2: Link Local PDF from Device */}
                <div
                  className="p-3 rounded-xl border border-[var(--border)] space-y-2 w-full max-w-full min-w-0"
                  style={{ background: 'var(--surface)' }}
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                    <HardDrive className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                    <span>Link Local PDF from Device (0s Instant)</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                    Already downloaded {overviewVolume.fileName} to your device? Link it instantly with zero network usage.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        const id = overviewVolume.id;
                        setOverviewVolume(null);
                        handleTriggerLinkFile(id);
                      }}
                      className="w-full text-xs font-semibold gap-1.5 py-1.5 border-[var(--border)]"
                    >
                      <FolderUp className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Select PDF File</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setOverviewVolume(null);
                        batchFileInputRef.current?.click();
                      }}
                      className="w-full text-xs font-semibold gap-1.5 py-1.5 border-[var(--border)]"
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0 text-[var(--accent)]" />
                      <span className="truncate">Auto-Link All 5</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Surahs Included in this Volume */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)] w-full max-w-full min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] truncate">
                    Surahs Covered in this Volume:
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0 whitespace-nowrap" style={{ fontSize: '0.68rem' }}>
                    Tap for Tafsir →
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 w-full max-w-full min-w-0">
                  {overviewVolume.surahs.map((s) => (
                    <button
                      key={s.number}
                      type="button"
                      onClick={() => {
                        setOverviewVolume(null);
                        navigate(`/tafsir?surah=${s.number}`);
                      }}
                      className="text-[11px] font-mono px-2 py-1 rounded-lg bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-all cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                      title={`Open Surah ${s.name} in interactive Tafsir`}
                    >
                      <span className="font-bold">#{s.number}</span>
                      <span>{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};
