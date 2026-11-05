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

    const handleLinkedEvent = () => {
      void refreshStatus();
    };

    window.addEventListener('anwar-ul-bayan-linked', handleLinkedEvent);
    return () => window.removeEventListener('anwar-ul-bayan-linked', handleLinkedEvent);
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
      // Unlinked volume: show the rich Volume Overview & Local PDF Setup Dialog
      setOverviewVolume(vol);
    }
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

      // Auto-launch NativePdfViewer upon successful linking
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBatchFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );

    if (fileList.length === 0) {
      toast({
        title: 'No PDF Files Found',
        description: 'Please select valid PDF files.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Linking Volumes in Batch...',
      description: `Processing ${fileList.length} PDF file(s) into IndexedDB offline storage...`,
    });

    let linkedCount = 0;
    for (const file of fileList) {
      const lower = file.name.toLowerCase();
      let matchedVol: AnwarUlBayanVolume | undefined;

      // 1. Try matching volume number 1..5 in filename
      for (const vol of ANWAR_UL_BAYAN_VOLUMES) {
        const v = vol.volNumber;
        const regexes = [
          new RegExp(`vol(ume)?[_\\s-]*0?${v}\\b`, 'i'),
          new RegExp(`part[_\\s-]*0?${v}\\b`, 'i'),
          new RegExp(`جلد[_\\s-]*0?${v}\\b`, 'i'),
          new RegExp(`[\\b_\\-]0?${v}[\\b_\\-]`, 'i'),
        ];
        if (regexes.some((r) => r.test(lower))) {
          matchedVol = vol;
          break;
        }
      }

      // 2. If exactly 1 file was selected with activeLinkingVolId
      if (!matchedVol && activeLinkingVolId) {
        matchedVol = ANWAR_UL_BAYAN_VOLUMES.find((v) => v.id === activeLinkingVolId);
      }

      // 3. If user selected exactly 5 files, match sequentially
      if (!matchedVol && fileList.length === ANWAR_UL_BAYAN_VOLUMES.length) {
        const idx = fileList.indexOf(file);
        matchedVol = ANWAR_UL_BAYAN_VOLUMES[idx];
      }

      if (matchedVol) {
        try {
          await linkVolumeLocalFile(matchedVol.localKey, file);
          linkedCount++;
        } catch (err) {
          console.warn(`Failed to link ${matchedVol.title}:`, err);
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
        description: 'Please ensure filenames include Vol 1 to Vol 5 (e.g., AnwarulBayan-Vol1.pdf).',
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
          boxShadow: 'inset 0 1px 0 var(--card-sheen), 0 10px 30px rgba(0,0,0,0.3)',
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
            A celebrated 20th-century exegesis renowned throughout the Muslim world for combining authentic classical sources (Tabari, Ibn Kathir, Qurtubi) with contemporary clarity. Link your local 100MB+ PDF files for seamless, 100% offline reading anytime.
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
          const isSurahsExpanded = !!expandedVolSurahs[vol.id];
          const displayedSurahs = isSurahsExpanded ? vol.surahs : vol.surahs.slice(0, 4);

          return (
            <Card
              key={vol.id}
              className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] transition-all flex flex-col justify-between shadow-sm"
              style={{
                padding: '12px 14px',
                boxShadow: 'inset 0 1px 0 var(--card-sheen)',
              }}
            >
              <div className="space-y-2.5">
                {/* Header Tag Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]">
                    Part {vol.volNumber} • {vol.juzCoverage}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span
                      dir="rtl"
                      className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]"
                      style={{ fontFamily: 'var(--font-urdu), serif', lineHeight: 1.4 }}
                    >
                      جلد {vol.volNumber}
                    </span>
                    {isLinked ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full border border-[var(--success)]/40">
                        <CheckCircle className="w-3 h-3 shrink-0" />
                        Offline
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                        <HardDrive className="w-3 h-3 shrink-0" />
                        {vol.estimatedSize}
                      </span>
                    )}
                  </div>
                </div>

                {/* Urdu & English Titles */}
                <div>
                  <h4
                    dir="rtl"
                    className="text-base font-bold text-[var(--accent-text)]"
                    style={{
                      fontFamily: 'var(--font-urdu), serif',
                      lineHeight: 1.9,
                      marginBottom: '2px',
                    }}
                  >
                    {vol.urduTitle}
                  </h4>
                  <h5 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    {vol.title}
                  </h5>
                  <p className="text-[11px] text-[var(--accent-text)] font-medium mt-0.5">
                    📖 {vol.coverage}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {vol.description}
                </p>

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
                <Button
                  size="sm"
                  onClick={() => handleReadVolume(vol)}
                  className="flex-1 text-xs font-bold gap-1.5 cursor-pointer h-8"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Read Volume
                </Button>

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
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTriggerLinkFile(vol.id);
                    }}
                    title="Link local PDF file from device storage"
                    className="h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer border-[var(--accent)] text-[var(--accent-text)] bg-[var(--accent-soft)]"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Link Local PDF</span>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* In-App Volume Overview & Local PDF Setup Sheet */}
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)] shrink-0">
                    Part {overviewVolume.volNumber} • {overviewVolume.juzCoverage}
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-[var(--border)] text-[var(--text-secondary)] shrink-0">
                    ~{overviewVolume.estimatedSize}
                  </Badge>
                </div>
                <DialogTitle
                  dir="rtl"
                  className="text-lg sm:text-xl font-bold text-[var(--accent-text)] leading-normal mt-1"
                  style={{ fontFamily: 'var(--font-urdu), serif', lineHeight: 2.0 }}
                >
                  {overviewVolume.urduTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-[var(--text-secondary)] font-medium">
                  {overviewVolume.title} — {overviewVolume.coverage}
                </DialogDescription>
              </DialogHeader>

              {/* Primary Local PDF Linking Actions */}
              <div
                className="p-3.5 rounded-xl border border-[var(--accent)] space-y-2.5"
                style={{ background: 'var(--accent-soft)' }}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--accent-text)]">
                  <HardDrive className="w-4 h-4 text-[var(--accent)] shrink-0" />
                  <span>100% Offline Fast Reading (Recommended)</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Tafseer Anwar-ul-Bayan volumes are extensive ~100MB to 160MB books. Link your local PDF file into browser IndexedDB storage for instant loading, zero data usage, and offline access.
                </p>
                <div className="space-y-2 pt-1">
                  <Button
                    onClick={() => {
                      const id = overviewVolume.id;
                      setOverviewVolume(null);
                      handleTriggerLinkFile(id);
                    }}
                    className="w-full text-xs font-bold gap-2 py-2 cursor-pointer shadow-md"
                  >
                    <FolderUp className="w-4 h-4 shrink-0" />
                    <span>Select & Link Local PDF (Part {overviewVolume.volNumber})</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOverviewVolume(null);
                      batchFileInputRef.current?.click();
                    }}
                    className="w-full text-xs font-semibold gap-2 border-[var(--border)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    <Layers className="w-4 h-4 text-[var(--accent)] shrink-0" />
                    <span>Link All 5 Volumes (Vol 1–5)</span>
                  </Button>
                </div>
              </div>

              {/* Surahs Included in this Volume */}
              <div className="space-y-2 pt-2 border-t border-[var(--border)]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                    Surahs Covered in this Volume:
                  </span>
                  <span className="text-[10px] text-[var(--text-secondary)]">
                    Tap to open in Tafsir
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
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
