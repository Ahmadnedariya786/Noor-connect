import { Card, CardContent } from "@/components/ui/card";
import { Reciter } from "@/lib/quran-audio";

interface ReciterInfoProps {
  reciter: Reciter;
}

export function ReciterInfo({ reciter }: ReciterInfoProps) {
  return (
    <Card className="bg-gradient-to-r from-[var(--surface)] to-[var(--surface-2)] border border-[var(--border)]">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--accent-soft)] rounded-full flex items-center justify-center border border-[var(--border)]">
            <span className="text-[var(--accent)] font-bold text-lg">🎵</span>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-[var(--text-primary)]">{reciter.name}</h4>
            <p className="text-sm text-[var(--text-secondary)]">{reciter.arabicName}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
