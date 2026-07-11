/**
 * Profile Settings Component
 * CRUD operations for managing profiles
 */

import { useState } from 'react';
import { User, Plus, Trash2, Edit2, Check, X, Palette } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { useProfileContext } from '@/contexts/ProfileContext';
import type { Profile } from '@/types/menstrual';

const PROFILE_COLORS = [
  '#e11d48', // rose-600
  '#8b5cf6', // violet-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f97316', // orange-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#eab308', // yellow-500
];

export function ProfileSettings() {
  const { toast } = useToast();
  const { currentProfile, allProfiles, createProfile, updateProfile, deleteProfile, switchProfile } = useProfileContext();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PROFILE_COLORS[0]);
  const [editName, setEditName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: 'Error', description: 'Please enter a profile name.', variant: 'destructive' });
      return;
    }
    try {
      await createProfile(newName.trim(), newColor);
      setNewName('');
      setNewColor(PROFILE_COLORS[0]);
      setShowCreateForm(false);
      toast({ title: 'Profile Created', description: `"${newName.trim()}" has been created.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to create profile.', variant: 'destructive' });
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateProfile(id, { name: editName.trim() });
      setEditingProfile(null);
      toast({ title: 'Updated', description: 'Profile name updated.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile.', variant: 'destructive' });
    }
  };

  const handleDelete = async (profile: Profile) => {
    if (allProfiles.length <= 1) {
      toast({ title: 'Cannot Delete', description: 'You must have at least one profile.', variant: 'destructive' });
      return;
    }
    try {
      await deleteProfile(profile.id);
      toast({ title: 'Deleted', description: `"${profile.name}" has been deleted.` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete profile.', variant: 'destructive' });
    }
  };

  const handleColorChange = async (id: string, color: string) => {
    try {
      await updateProfile(id, { color });
      toast({ title: 'Updated', description: 'Profile color updated.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update color.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold flex items-center gap-2">
            <User className="w-5 h-5" />
            Profiles
          </h3>
          <Button size="sm" variant="outline" onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="mb-4 p-3 bg-muted/30 rounded-lg space-y-3">
            <input
              type="text"
              placeholder="Profile name (e.g., Mom, Daughter)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />

            <div>
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="flex gap-2 mt-1">
                {PROFILE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewColor(color)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      newColor === color ? 'scale-110 border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} className="flex-1">
                <Check className="w-4 h-4 mr-1" /> Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Profile List */}
        <div className="space-y-2">
          {allProfiles.map(profile => (
            <div
              key={profile.id}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                profile.id === currentProfile?.id
                  ? 'bg-primary/5 border-primary/20'
                  : 'bg-muted/20 border-transparent'
              }`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: profile.color }}
              >
                {profile.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                {editingProfile === profile.id ? (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border rounded bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                      onKeyDown={e => e.key === 'Enter' && handleUpdate(profile.id)}
                    />
                    <Button size="sm" variant="ghost" onClick={() => handleUpdate(profile.id)}>
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingProfile(null)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium truncate">{profile.name}</p>
                    <div className="flex items-center gap-2">
                      {profile.isDefault && (
                        <Badge variant="secondary" className="text-xs h-4 px-1">
                          Active
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Created {new Date(profile.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                {profile.id !== currentProfile?.id && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => switchProfile(profile.id)}
                    className="h-7 text-xs"
                  >
                    Switch
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEditingProfile(profile.id);
                    setEditName(profile.name);
                  }}
                  className="h-7 w-7 p-0"
                >
                  <Edit2 className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(profile)}
                  className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  disabled={allProfiles.length <= 1}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Current Profile Settings */}
      {currentProfile && (
        <Card className="p-4 space-y-4">
          <h3 className="font-bold flex items-center gap-2">
            <Palette className="w-5 h-5" />
            Profile Settings
          </h3>

          {/* Color picker */}
          <div>
            <Label className="text-sm">Profile Color</Label>
            <div className="flex gap-2 mt-2">
              {PROFILE_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange(currentProfile.id, color)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    currentProfile.color === color ? 'scale-110 border-foreground' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Cycle settings */}
          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Default Cycle Length</Label>
              <span className="text-sm font-bold">{currentProfile.settings.defaultCycleLength} days</span>
            </div>
            <Slider
              value={[currentProfile.settings.defaultCycleLength]}
              onValueChange={([v]) => updateProfile(currentProfile.id, {
                settings: { ...currentProfile.settings, defaultCycleLength: v }
              })}
              min={21}
              max={40}
              step={1}
              className="mt-2"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Default Period Length</Label>
              <span className="text-sm font-bold">{currentProfile.settings.defaultPeriodLength} days</span>
            </div>
            <Slider
              value={[currentProfile.settings.defaultPeriodLength]}
              onValueChange={([v]) => updateProfile(currentProfile.id, {
                settings: { ...currentProfile.settings, defaultPeriodLength: v }
              })}
              min={2}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>

          {/* Prayer integration toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Prayer Time Integration</Label>
              <p className="text-xs text-muted-foreground">Adjust suggestions based on prayer times</p>
            </div>
            <Switch
              checked={currentProfile.settings.prayerTimeIntegration}
              onCheckedChange={(checked) => updateProfile(currentProfile.id, {
                settings: { ...currentProfile.settings, prayerTimeIntegration: checked }
              })}
            />
          </div>
        </Card>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Each profile has its own isolated data. Switching profiles changes which data is visible.
        {allProfiles.length > 1 && ` You have ${allProfiles.length} profiles.`}
      </p>
    </div>
  );
}

export default ProfileSettings;
