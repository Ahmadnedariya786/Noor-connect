/**
 * Profile Switcher Component
 * Quick dropdown for switching between profiles
 */

import { useState } from 'react';
import { User, ChevronDown, Plus, Check, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useProfileContext } from '@/contexts/ProfileContext';

interface ProfileSwitcherProps {
  onManageProfiles?: () => void;
}

export function ProfileSwitcher({ onManageProfiles }: ProfileSwitcherProps) {
  const { currentProfile, allProfiles, switchProfile, isLoading } = useProfileContext();
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !currentProfile) return null;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2 h-8"
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ backgroundColor: currentProfile.color }}
        >
          {currentProfile.name.charAt(0).toUpperCase()}
        </div>
        <span className="text-sm font-medium max-w-[80px] truncate">{currentProfile.name}</span>
        <ChevronDown className="w-3 h-3" />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 bg-popover border rounded-lg shadow-lg py-1">
            <div className="px-3 py-2 border-b">
              <p className="text-xs font-medium text-muted-foreground">Switch Profile</p>
            </div>

            {allProfiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => {
                  switchProfile(profile.id);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.name}</p>
                  {profile.isDefault && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      Active
                    </Badge>
                  )}
                </div>
                {profile.id === currentProfile.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </button>
            ))}

            <div className="border-t mt-1 pt-1">
              {onManageProfiles && (
                <button
                  onClick={() => {
                    onManageProfiles();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
                >
                  <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Manage Profiles</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ProfileSwitcher;
