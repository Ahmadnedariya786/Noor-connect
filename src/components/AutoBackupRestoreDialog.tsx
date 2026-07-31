import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  checkForRestoreOpportunity,
  restoreFromAutoBackup,
  clearAutoBackup,
  type RestoreOpportunity,
} from '@/lib/backup-service';

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

export function AutoBackupRestoreDialog() {
  const [opportunity, setOpportunity] = useState<RestoreOpportunity | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkForRestoreOpportunity().then(opp => {
      if (!cancelled && opp) setOpportunity(opp);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restoreFromAutoBackup();
      if (result.success && result.data) {
        if (result.data.failedKeys > 0) {
          console.warn('Backup restore partially failed', result.data);
        }
        setOpportunity(null);
        window.location.reload();
      } else {
        console.error('Restore failed:', result.error);
      }
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSkip = () => {
    setOpportunity(null);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await clearAutoBackup();
    } finally {
      setIsDeleting(false);
      setOpportunity(null);
    }
  };

  const isBusy = isRestoring || isDeleting;

  return (
    <Dialog open={opportunity !== null} onOpenChange={handleSkip}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Welcome back! Your data is here</DialogTitle>
          <DialogDescription>
            Noor Connect found your previous data on this device. Would you like to restore it?
            Everything will come back — prayer records, bookmarks, and settings.
          </DialogDescription>
        </DialogHeader>

        {opportunity && (
          <div className="py-4 space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last saved:</span>
                <span className="font-medium">{formatTime(opportunity.snapshot.timestamp)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Saved copies:</span>
                <span className="font-medium">{opportunity.snapshotCount}</span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Your data is saved on this device automatically. If you skip this now, you can
              restore it later from the Settings page.
            </p>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={isBusy}>
            Skip
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isBusy}>
            {isDeleting ? 'Deleting...' : 'Delete & Start Fresh'}
          </Button>
          <Button onClick={handleRestore} disabled={isBusy}>
            {isRestoring ? 'Restoring...' : 'Restore My Data'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
