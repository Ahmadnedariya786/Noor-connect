import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Target, Flame, Calendar, TrendingUp, CheckCircle, Circle, Trash2, Edit2, Save, X, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { habitTracker, type Habit, type HabitEntry, type HabitStats, DEFAULT_HABITS } from "@/lib/habit-tracker";
import { useLanguage } from "@/contexts/LanguageContext-new";

const HabitTracker = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todayEntries, setTodayEntries] = useState<HabitEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showStats, setShowStats] = useState(false);
  
  const [newHabit, setNewHabit] = useState({
    name: '',
    description: '',
    category: 'general' as const,
    icon: '🌟',
    color: 'bg-gray-500',
    targetCount: 1,
    unit: ''
  });

  const categoryIcons = {
    quran: '📖',
    prayer: '🙏',
    dhikr: '🕌',
    charity: '💝',
    fasting: '🌅',
    general: '🌟'
  };

  const categoryColors = {
    quran: 'bg-green-500',
    prayer: 'bg-blue-500',
    dhikr: 'bg-purple-500',
    charity: 'bg-pink-500',
    fasting: 'bg-orange-500',
    general: 'bg-gray-500'
  };

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = () => {
    const allHabits = habitTracker.getHabits();
    const entries = habitTracker.getEntriesForDate(selectedDate);
    
    setHabits(allHabits);
    setTodayEntries(entries);
  };

  const toggleHabit = (habitId: string) => {
    habitTracker.toggleHabit(habitId, selectedDate);
    loadData();
    
    const habit = habits.find(h => h.id === habitId);
    const isCompleted = todayEntries.some(e => e.habitId === habitId);
    
    toast({
      title: isCompleted ? "Habit uncompleted" : "Habit completed!",
      description: `${habit?.name} marked as ${isCompleted ? 'incomplete' : 'complete'}`,
    });
  };

  const addCustomHabit = () => {
    if (!newHabit.name.trim()) {
      toast({
        title: "Error",
        description: "Habit name is required",
        variant: "destructive"
      });
      return;
    }

    habitTracker.addCustomHabit({
      ...newHabit,
      icon: categoryIcons[newHabit.category],
      color: categoryColors[newHabit.category]
    });

    setNewHabit({
      name: '',
      description: '',
      category: 'general',
      icon: '🌟',
      color: 'bg-gray-500',
      targetCount: 1,
      unit: ''
    });

    setShowAddHabit(false);
    loadData();
    
    toast({
      title: "Habit added",
      description: "New habit has been added successfully",
    });
  };

  const deleteCustomHabit = (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    
    if (!habit) {
      console.error('Habit not found!');
      return;
    }
    
    if (confirm(`Are you sure you want to delete "${habit.name}"? This will remove the habit and all its tracking history.`)) {
      try {
        habitTracker.deleteHabit(habitId);
        loadData();
        
        toast({
          title: "Habit deleted",
          description: `"${habit.name}" and all its entries have been removed`,
          variant: "destructive"
        });
      } catch (error) {
        console.error('Error during deletion:', error);
        toast({
          title: "Error",
          description: "Failed to delete habit. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const updateCustomHabit = () => {
    if (!editingHabit || !editingHabit.name.trim()) {
      toast({
        title: "Error",
        description: "Habit name is required",
        variant: "destructive"
      });
      return;
    }

    // Delete old habit and create new one with same ID
    const oldHabitId = editingHabit.id;
    habitTracker.deleteHabit(oldHabitId);
    
    habitTracker.addCustomHabit({
      ...editingHabit,
      icon: categoryIcons[editingHabit.category],
      color: categoryColors[editingHabit.category]
    });

    setEditingHabit(null);
    loadData();
    
    toast({
      title: "Habit updated",
      description: `"${editingHabit.name}" has been updated successfully`,
    });
  };

  const getHabitEntry = (habitId: string) => {
    return todayEntries.find(entry => entry.habitId === habitId);
  };

  const getHabitStats = (habitId: string): HabitStats => {
    return habitTracker.getHabitStats(habitId, 30);
  };

  const getOverallStats = () => {
    return habitTracker.getOverallStats(30);
  };

  const exportData = () => {
    const data = habitTracker.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habit-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data exported",
      description: "Your habit data has been exported successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Habit Tracker</h1>
            <p className="text-xs text-muted-foreground">Track your daily Islamic practices</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart3 className="w-4 h-4 me-2" />
              Stats
            </Button>
            <Dialog open={showAddHabit} onOpenChange={setShowAddHabit}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="bg-primary"
                >
                  <Plus className="w-4 h-4 me-2" />
                  Add Habit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add Custom Habit</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="habit-name">Habit Name</Label>
                    <Input
                      id="habit-name"
                      value={newHabit.name}
                      onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                      placeholder="e.g., Read Islamic Books"
                    />
                  </div>

                  <div>
                    <Label htmlFor="habit-description">Description</Label>
                    <Textarea
                      id="habit-description"
                      value={newHabit.description}
                      onChange={(e) => setNewHabit({ ...newHabit, description: e.target.value })}
                      placeholder="Describe your habit..."
                      rows={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="habit-category">Category</Label>
                    <Select value={newHabit.category} onValueChange={(value: any) => setNewHabit({ ...newHabit, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="quran">📖 Quran</SelectItem>
                        <SelectItem value="prayer">🙏 Prayer</SelectItem>
                        <SelectItem value="dhikr">🕌 Dhikr</SelectItem>
                        <SelectItem value="charity">💝 Charity</SelectItem>
                        <SelectItem value="fasting">🌅 Fasting</SelectItem>
                        <SelectItem value="general">🌟 General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={addCustomHabit} className="flex-1">
                      <Save className="w-4 h-4 me-2" />
                      Add Habit
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddHabit(false)}>
                      <X className="w-4 h-4 me-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Overview */}
        {showStats && (
          <Card className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              30-Day Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {getOverallStats().completedToday}/{getOverallStats().totalHabits}
                </div>
                <div className="text-xs text-muted-foreground">Today's Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {getOverallStats().activeStreaks}
                </div>
                <div className="text-xs text-muted-foreground">Active Streaks</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(getOverallStats().completionRate)}%
                </div>
                <div className="text-xs text-muted-foreground">Completion Rate</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {getOverallStats().mostConsistentHabit?.habit.icon || '🌟'}
                </div>
                <div className="text-xs text-muted-foreground">Most Consistent</div>
              </div>
            </div>
          </Card>
        )}

        {/* Date Selector */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Tracking Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-40"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </Card>

        {/* Habits List */}
        <div className="space-y-3">
          {habits.map((habit) => {
            const entry = getHabitEntry(habit.id);
            const stats = getHabitStats(habit.id);
            const isCompleted = !!entry;
            
            return (
              <Card key={habit.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleHabit(habit.id)}
                      className="mt-1"
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground" />
                      )}
                    </Button>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{habit.icon}</span>
                        <h3 className={`font-medium ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {habit.name}
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{habit.description}</p>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Flame className="w-3 h-3 text-orange-500" />
                          <span>{stats.streak.current} day streak</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="w-3 h-3 text-blue-500" />
                          <span>{Math.round(stats.completionRate)}% this month</span>
                        </div>
                      </div>
                      
                      {entry?.notes && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingHabit(habit)}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                      title={t("editHabit") || "Edit habit"}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCustomHabit(habit.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                      title={t("deleteHabit") || "Delete habit"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Edit Habit Dialog */}
        <Dialog open={!!editingHabit} onOpenChange={(open) => !open && setEditingHabit(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Habit: {editingHabit?.name}
              </DialogTitle>
            </DialogHeader>
            {editingHabit && (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-habit-name">Habit Name</Label>
                  <Input
                    id="edit-habit-name"
                    value={editingHabit.name}
                    onChange={(e) => setEditingHabit({ ...editingHabit, name: e.target.value })}
                    placeholder="e.g., Read Islamic Books"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-habit-description">Description</Label>
                  <Textarea
                    id="edit-habit-description"
                    value={editingHabit.description}
                    onChange={(e) => setEditingHabit({ ...editingHabit, description: e.target.value })}
                    placeholder="Describe your habit..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="edit-habit-category">Category</Label>
                  <Select value={editingHabit.category} onValueChange={(value: any) => setEditingHabit({ ...editingHabit, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quran">📖 Quran</SelectItem>
                      <SelectItem value="prayer">🙏 Prayer</SelectItem>
                      <SelectItem value="dhikr">🕌 Dhikr</SelectItem>
                      <SelectItem value="charity">💝 Charity</SelectItem>
                      <SelectItem value="fasting">🌅 Fasting</SelectItem>
                      <SelectItem value="general">🌟 General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={updateCustomHabit} className="flex-1">
                    <Save className="w-4 h-4 me-2" />
                    Update Habit
                  </Button>
                  <Button variant="outline" onClick={() => setEditingHabit(null)}>
                    <X className="w-4 h-4 me-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Export Data */}
        <Card className="p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm">Data Management</h3>
              <p className="text-xs text-muted-foreground">Export your habit tracking data</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportData}>
              Export Data
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HabitTracker;
