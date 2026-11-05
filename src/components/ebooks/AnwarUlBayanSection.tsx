import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  FileCheck,
  Upload,
  Sparkles,
  HardDrive,
  Trash2,
  ExternalLink,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const { toast } = useToast();
  const [linkedStatus, setLinkedStatus] = useState<Record<string, boolean>>({});
  const [metadataMap, setMetadataMap] = useState<
    Record<string, { name: string; size: number; updatedAt: number } | null>
  >({});
  const [activeLinkingVolId, setActiveLinkingVolId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    try {
      const source = await getVolumeResolvedSource(vol);
      onOpenReader({
        url: source.url,
        title: vol.title,
        localKey: source.localKey,
      });
      toast({
        title: `Opening ${vol.title}`,
        description: source.isLocal
          ? 'Reading from 100% offline local PDF storage.'
          : 'Streaming from online Archive.org collection.',
      });
    } catch (err) {
      console.warn('Failed to resolve volume source:', err);
      toast({
        title: 'Error Opening Book',
        description: 'Could not open the requested volume.',
        variant: 'destructive',
      });
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
        description: `${vol.title} is now permanently available 100% offline!`,
      });
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
      {/* Hidden File Input for Linking Local PDF */}
      <input
        type="file"
        ref={fileInputRef}
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleFileSelected}
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

        <div className="relative z-10 space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--border)]">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
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

          <div>
            <h2
              dir="rtl"
              className="text-2xl sm:text-3xl font-extrabold text-[var(--accent-text)] mb-1 leading-normal"
              style={{ fontFamily: 'var(--font-urdu), serif' }}
            >
              تفسیر انوار البیان فی کشف اسرار القرآن
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
              Tafseer Anwar-ul-Bayan — Complete 5-Volume Set
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              By حضرت مولانا مفتی محمد عاشق الٰہی بلند شہری مہاجر مدنی (رحمه الله)
            </p>
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-2xl">
            A celebrated 20th-century exegesis renowned throughout the Muslim world for combining authentic classical sources (Tabari, Ibn Kathir, Qurtubi) with contemporary clarity. Stream online or link your local 100MB+ PDF files for seamless, 100% offline reading anytime.
          </p>
        </div>
      </div>

      {/* 5 Volumes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {ANWAR_UL_BAYAN_VOLUMES.map((vol) => {
          const isLinked = !!linkedStatus[vol.id];
          const meta = metadataMap[vol.id];

          return (
            <Card
              key={vol.id}
              className="overflow-hidden border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--accent)] transition-all flex flex-col justify-between p-4 shadow-sm"
              style={{
                boxShadow: 'inset 0 1px 0 var(--card-sheen)',
              }}
            >
              <div className="space-y-3">
                {/* Header Tag Row */}
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-soft)] text-[var(--accent-text)] border border-[var(--accent)]">
                    Part {vol.volNumber} • {vol.juzCoverage}
                  </span>

                  {isLinked ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded-full border border-[var(--success)]/40">
                      <CheckCircle className="w-3 h-3" />
                      Offline Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      <HardDrive className="w-3 h-3" />
                      {vol.estimatedSize}
                    </span>
                  )}
                </div>

                {/* Urdu & English Titles */}
                <div>
                  <h4
                    dir="rtl"
                    className="text-base font-bold text-[var(--accent-text)] line-clamp-1 leading-normal"
                    style={{ fontFamily: 'var(--font-urdu), serif' }}
                  >
                    {vol.urduTitle}
                  </h4>
                  <h5 className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                    {vol.title}
                  </h5>
                  <p className="text-[11px] text-[var(--accent-text)] font-medium mt-1">
                    📖 {vol.coverage}
                  </p>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                  {vol.description}
                </p>

                {/* Surahs Included Pill Tags */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1.5">
                    Surahs Included:
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5">
                    {vol.surahs.slice(0, 6).map((s) => (
                      <span
                        key={s.number}
                        className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]"
                      >
                        #{s.number} {s.name}
                      </span>
                    ))}
                    {vol.surahs.length > 6 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-2)] text-[var(--accent-text)] border border-[var(--border)]">
                        +{vol.surahs.length - 6} more
                      </span>
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
              <div className="pt-3.5 mt-3 border-t border-[var(--border)] flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleReadVolume(vol)}
                  className="flex-1 text-xs font-bold gap-1.5 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Read Volume
                </Button>

                {isLinked ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnlinkVolume(vol)}
                    title="Unlink local file"
                    className="h-9 px-2.5 text-[var(--text-secondary)] hover:text-[var(--danger)] cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTriggerLinkFile(vol.id)}
                    title="Link local PDF file from device storage"
                    className="h-9 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer border-[var(--accent)] text-[var(--accent-text)] bg-[var(--accent-soft)]"
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
    </section>
  );
};
