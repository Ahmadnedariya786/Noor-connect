/**
 * Backup Restore Dialog
 * Shows a dialog when a backup is found on app reinstall
 */

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
import { backupRestoreService, type BackupMetadata } from '@/lib/backup-restore-service';
import { formatDate } from '@/lib/utils';

export function BackupRestoreDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [backupMetadata, setBackupMetadata] = useState<BackupMetadata | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const handleBackupFound = (event: Event) => {
      const customEvent = event as CustomEvent<BackupMetadata>;
      setBackupMetadata(customEvent.detail);
      setIsOpen(true);
    };

    window.addEventListener('backup-found', handleBackupFound);

    // Check for backup on mount
    backupRestoreService.checkForBackup();

    return () => {
      window.removeEventListener('backup-found', handleBackupFound);
    };
  }, []);

  const handleRestore = async () => {
    if (!backupMetadata) return;

    setIsRestoring(true);
    try {
      const success = await backupRestoreService.restoreBackup();
      if (success) {
        setIsOpen(false);
        // Reload the app to apply restored data
        window.location.reload();
      } else {
        console.error('Restore failed');
      }
    } catch (error) {
      console.error('Restore error:', error);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = async () => {
    if (!backupMetadata) return;

    setIsDeleting(true);
    try {
      const success = await backupRestoreService.deleteBackup();
      if (success) {
        setIsOpen(false);
        // Create new backup for fresh install
        await backupRestoreService.createBackup();
      } else {
        console.error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSkip = async () => {
    // Skip restoration but mark as checked
    await backupRestoreService.markBackupCheckDone();
    setIsOpen(false);
    // Create new backup for fresh install
    await backupRestoreService.createBackup();
  };

  if (!backupMetadata) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Backup Found</DialogTitle>
          <DialogDescription>
            We found a backup from your previous installation. Would you like to restore your data?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Backup Date:</span>
              <span className="font-medium">
                {formatDate(new Date(backupMetadata.lastBackupDate))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">App Version:</span>
              <span className="font-medium">{backupMetadata.appVersion}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data Items:</span>
              <span className="font-medium">{backupMetadata.dataCount}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Restoring will recover your prayer settings, bookmarks, favorites, and other personal data.
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isRestoring || isDeleting}
          >
            Skip
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isRestoring || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete & Start Fresh'}
          </Button>
          <Button
            onClick={handleRestore}
            disabled={isRestoring || isDeleting}
          >
            {isRestoring ? 'Restoring...' : 'Restore Backup'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}