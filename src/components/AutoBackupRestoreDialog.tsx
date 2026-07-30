import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { hasAutoBackup, getLastAutoBackupTime, restoreFromAutoBackup, clearAutoBackup } from '@/lib/backup';

const PROMPTED_KEY = 'auto-backup-prompted';

export function AutoBackupRestoreDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [lastTime, setLastTime] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(PROMPTED_KEY)) return;

    async function checkBackup() {
      if (!(await hasAutoBackup())) return;
      const time = await getLastAutoBackupTime();
      setLastTime(time);
      setIsOpen(true);
    }
    
    checkBackup();
  }, []);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      const result = await restoreFromAutoBackup();
      if (result.success) {
        setIsOpen(false);
        localStorage.setItem(PROMPTED_KEY, 'true');
        window.location.reload();
      }
    } catch {
      // silent
    } finally {
      setIsRestoring(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(PROMPTED_KEY, 'true');
    setIsOpen(false);
  };

  const handleDelete = async () => {
    await clearAutoBackup();
    localStorage.setItem(PROMPTED_KEY, 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleSkip}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Previous Backup Found</DialogTitle>
          <DialogDescription>
            We found an auto-backup saved on this device. Would you like to restore your data?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Last Backup:</span>
              <span className="font-medium">
                {lastTime
                  ? new Date(lastTime).toLocaleDateString() + ' ' + new Date(lastTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Unknown'}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Restoring will recover your prayer settings, bookmarks, qaza records, and other personal data. This backup was created automatically during your previous use.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleSkip} disabled={isRestoring}>
            Skip
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isRestoring}>
            Delete & Start Fresh
          </Button>
          <Button onClick={handleRestore} disabled={isRestoring}>
            {isRestoring ? 'Restoring...' : 'Restore Backup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
