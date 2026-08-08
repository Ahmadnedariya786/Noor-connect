/**
 * Islamic Habit Tracker
 * Tracks daily Islamic practices with local storage
 */

export interface Habit {
  id: string;
  name: string;
  description: string;
  category: 'quran' | 'prayer' | 'dhikr' | 'charity' | 'fasting' | 'general';
  icon: string;
  color: string;
  targetCount?: number; // For habits with daily targets (e.g., pages, rakat)
  unit?: string; // Unit of measurement (e.g., "pages", "rakat", "minutes")
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  count?: number; // Actual count completed
  timestamp: number;
  notes?: string;
}

export interface HabitStreak {
  current: number;
  longest: number;
  lastCompletedDate?: string;
}

export interface HabitStats {
  totalCompleted: number;
  completionRate: number;
  streak: HabitStreak;
  thisWeek: number;
  thisMonth: number;
}

// Default Islamic habits
export const DEFAULT_HABITS: Habit[] = [
  {
    id: 'quran-reading',
    name: 'Quran Reading',
    description: 'Read from the Holy Quran',
    category: 'quran',
    icon: '📖',
    color: 'bg-green-500',
    targetCount: 1,
    unit: 'page'
  },
  {
    id: 'fajr-prayer',
    name: 'Fajr Prayer',
    description: 'Perform Fajr prayer on time',
    category: 'prayer',
    icon: '🙏',
    color: 'bg-blue-500'
  },
  {
    id: 'dhikr-morning',
    name: 'Morning Dhikr',
    description: 'Recite morning adhkar',
    category: 'dhikr',
    icon: '🕌',
    color: 'bg-purple-500'
  },
  {
    id: 'dhikr-evening',
    name: 'Evening Dhikr',
    description: 'Recite evening adhkar',
    category: 'dhikr',
    icon: '🌙',
    color: 'bg-indigo-500'
  },
  {
    id: 'charity',
    name: 'Give Charity',
    description: 'Give sadaqah or help someone',
    category: 'charity',
    icon: '💝',
    color: 'bg-pink-500'
  },
  {
    id: 'fasting-monday',
    name: 'Monday Fast',
    description: 'Fast on Mondays (Sunnah)',
    category: 'fasting',
    icon: '🌅',
    color: 'bg-orange-500'
  },
  {
    id: 'fasting-thursday',
    name: 'Thursday Fast',
    description: 'Fast on Thursdays (Sunnah)',
    category: 'fasting',
    icon: '🌄',
    color: 'bg-amber-500'
  }
];

export class HabitTracker {
  private readonly HABITS_KEY = 'islamic-habits';
  private readonly ENTRIES_KEY = 'habit-entries';
  private readonly CUSTOM_HABITS_KEY = 'custom-habits';
  /**
   * Debounce handle for ENTRIES_KEY writes.  Habit entries can grow to
   * 500+ items which makes JSON.stringify take 30+ ms on ARM A53 cores
   * (that's a full frame dropped at 30 FPS right after the user taps the
   * habit checkmark, when they expect animated feedback).  We coalesce
   * writes within the same macrotask so a batch of calls (e.g. habit
   * toggle → hide → streak update) writes only once.
   */
  private _entriesWriteTimer: ReturnType<typeof setTimeout> | null = null;
  private _entriesPendingPayload: string | null = null;

  // Get all habits (default + custom, excluding hidden)
  getHabits(): Habit[] {
    try {
      const defaultHabits = DEFAULT_HABITS;
      const customHabitsJson = localStorage.getItem(this.CUSTOM_HABITS_KEY);
      const customHabits: Habit[] = customHabitsJson ? JSON.parse(customHabitsJson) : [];
      
      // Get hidden default habits
      const hiddenHabits = this.getHiddenHabits();
      
      // Filter out hidden default habits
      const visibleDefaultHabits = defaultHabits.filter(habit => !hiddenHabits.includes(habit.id));
      
      return [...visibleDefaultHabits, ...customHabits];
    } catch (error) {
      console.error('Failed to load habits:', error);
      return DEFAULT_HABITS;
    }
  }

  // Add custom habit
  addCustomHabit(habit: Omit<Habit, 'id'>): void {
    try {
      const customHabits = this.getCustomHabits();
      const newHabit: Habit = {
        ...habit,
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      customHabits.push(newHabit);
      localStorage.setItem(this.CUSTOM_HABITS_KEY, JSON.stringify(customHabits));
    } catch (error) {
      console.error('Failed to add custom habit:', error);
    }
  }

  // Get custom habits only
  getCustomHabits(): Habit[] {
    try {
      const customHabitsJson = localStorage.getItem(this.CUSTOM_HABITS_KEY);
      return customHabitsJson ? JSON.parse(customHabitsJson) : [];
    } catch (error) {
      console.error('Failed to load custom habits:', error);
      return [];
    }
  }

  // Delete any habit (default or custom)
  deleteHabit(habitId: string): void {
    try {
      // Check if it's a custom habit
      const customHabits = this.getCustomHabits();
      const customIndex = customHabits.findIndex(h => h.id === habitId);
      
      if (customIndex !== -1) {
        // Remove from custom habits
        customHabits.splice(customIndex, 1);
        localStorage.setItem(this.CUSTOM_HABITS_KEY, JSON.stringify(customHabits));
      } else {
        // For default habits, we need to hide them by storing in a "hidden habits" list
        const hiddenHabitsJson = localStorage.getItem('hidden-habits');
        const hiddenHabits: string[] = hiddenHabitsJson ? JSON.parse(hiddenHabitsJson) : [];
        
        if (!hiddenHabits.includes(habitId)) {
          hiddenHabits.push(habitId);
          localStorage.setItem('hidden-habits', JSON.stringify(hiddenHabits));
        }
      }
      
      // Also delete all entries for this habit
      this.deleteHabitEntries(habitId);
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  }

  // Get hidden default habits
  getHiddenHabits(): string[] {
    try {
      const hiddenHabitsJson = localStorage.getItem('hidden-habits');
      return hiddenHabitsJson ? JSON.parse(hiddenHabitsJson) : [];
    } catch (error) {
      console.error('Failed to load hidden habits:', error);
      return [];
    }
  }

  // Restore a hidden default habit
  restoreHabit(habitId: string): void {
    try {
      const hiddenHabits = this.getHiddenHabits();
      const filtered = hiddenHabits.filter(id => id !== habitId);
      localStorage.setItem('hidden-habits', JSON.stringify(filtered));
    } catch (error) {
      console.error('Failed to restore habit:', error);
    }
  }

  // Update a custom habit in place (keeps id + entry history)
  updateHabit(habit: Habit): void {
    try {
      const customHabits = this.getCustomHabits();
      const index = customHabits.findIndex(h => h.id === habit.id);
      if (index === -1) return;
      customHabits[index] = { ...habit };
      localStorage.setItem(this.CUSTOM_HABITS_KEY, JSON.stringify(customHabits));
    } catch (error) {
      console.error('Failed to update habit:', error);
    }
  }

  /**
   * Pure streak computation over a list of unique YYYY-MM-DD dates.
   * Shared by the stats API and the UI so the page can compute streaks
   * for every habit from a single entries read (no per-habit storage I/O).
   */
  static computeStreakFromDates(dates: string[], today?: string): HabitStreak {
    const sortedDates = [...new Set(dates)].sort().reverse();

    if (sortedDates.length === 0) {
      return { current: 0, longest: 0 };
    }

    const ref = today ?? new Date().toISOString().split('T')[0];
    const checkDate = new Date(`${ref}T00:00:00`);
    let currentStreak = 0;

    for (const date of sortedDates) {
      const entryDate = new Date(`${date}T00:00:00`);
      const diffDays = Math.floor((checkDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0 || diffDays === 1) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    let lastDate = new Date(`${sortedDates[0]}T00:00:00`);
    let tempStreak = 1;
    let longestStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = new Date(`${sortedDates[i]}T00:00:00`);
      const diffDays = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
      lastDate = currentDate;
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    return {
      current: currentStreak,
      longest: longestStreak,
      lastCompletedDate: sortedDates[0]
    };
  }

  // Get habit entries for a date range
  getEntries(startDate?: string, endDate?: string): HabitEntry[] {
    try {
      const entriesJson = localStorage.getItem(this.ENTRIES_KEY);
      let entries: HabitEntry[] = entriesJson ? JSON.parse(entriesJson) : [];
      
      if (startDate) {
        entries = entries.filter(entry => entry.date >= startDate);
      }
      
      if (endDate) {
        entries = entries.filter(entry => entry.date <= endDate);
      }
      
      return entries.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to load habit entries:', error);
      return [];
    }
  }

  // Get entries for a specific date
  getEntriesForDate(date: string): HabitEntry[] {
    return this.getEntries(date, date);
  }

  // Get entries for a habit
  getEntriesForHabit(habitId: string): HabitEntry[] {
    try {
      const entriesJson = localStorage.getItem(this.ENTRIES_KEY);
      const entries: HabitEntry[] = entriesJson ? JSON.parse(entriesJson) : [];
      
      return entries.filter(entry => entry.habitId === habitId)
                   .sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to load habit entries:', error);
      return [];
    }
  }

  // Toggle habit completion
  toggleHabit(habitId: string, date: string, count?: number, notes?: string): void {
    try {
      const entries = this.getEntriesForDate(date);
      const existingEntry = entries.find(entry => entry.habitId === habitId);
      
      if (existingEntry) {
        // Remove entry if already completed
        this.deleteEntry(existingEntry.id);
      } else {
        // Add new entry
        const entry: HabitEntry = {
          id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          habitId,
          date,
          completed: true,
          count,
          timestamp: Date.now(),
          notes
        };
        
        this.saveEntry(entry);
      }
    } catch (error) {
      console.error('Failed to toggle habit:', error);
    }
  }

  /**
   * Deferred, coalesced writer for habit-entries.  JSON.stringify +
   * localStorage.setItem happen in a setTimeout(0) so the current render
   * (checkmark animation, toast, etc.) isn't blocked.  Multiple writes
   * within the same macrotask collapse to a single flush.
   */
  private scheduleEntriesWrite(entries: HabitEntry[]): void {
    try {
      this._entriesPendingPayload = JSON.stringify(entries);
    } catch (error) {
      console.error('Failed to serialize habit entries:', error);
      return;
    }
    if (this._entriesWriteTimer !== null) return;
    this._entriesWriteTimer = setTimeout(() => {
      const payload = this._entriesPendingPayload;
      this._entriesWriteTimer = null;
      this._entriesPendingPayload = null;
      try {
        if (payload !== null) {
          localStorage.setItem(this.ENTRIES_KEY, payload);
        }
      } catch (error) {
        console.error('Failed to persist habit entries:', error);
      }
    }, 0);
  }

  // Save habit entry
  private saveEntry(entry: HabitEntry): void {
    try {
      const entriesJson = localStorage.getItem(this.ENTRIES_KEY);
      const entries: HabitEntry[] = entriesJson ? JSON.parse(entriesJson) : [];
      
      entries.push(entry);
      this.scheduleEntriesWrite(entries);
    } catch (error) {
      console.error('Failed to save habit entry:', error);
    }
  }

  // Delete specific entry
  private deleteEntry(entryId: string): void {
    try {
      const entriesJson = localStorage.getItem(this.ENTRIES_KEY);
      const entries: HabitEntry[] = entriesJson ? JSON.parse(entriesJson) : [];
      
      const filtered = entries.filter(entry => entry.id !== entryId);
      this.scheduleEntriesWrite(filtered);
    } catch (error) {
      console.error('Failed to delete habit entry:', error);
    }
  }

  // Delete all entries for a habit
  private deleteHabitEntries(habitId: string): void {
    try {
      const entriesJson = localStorage.getItem(this.ENTRIES_KEY);
      const entries: HabitEntry[] = entriesJson ? JSON.parse(entriesJson) : [];
      
      const filtered = entries.filter(entry => entry.habitId !== habitId);
      this.scheduleEntriesWrite(filtered);
    } catch (error) {
      console.error('Failed to delete habit entries:', error);
    }
  }

  // Get habit statistics
  getHabitStats(habitId: string, days: number = 30): HabitStats {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const entries = this.getEntriesForHabit(habitId);
      const dateRangeEntries = entries.filter(entry => 
        new Date(entry.date) >= startDate && new Date(entry.date) <= endDate
      );

      const totalCompleted = dateRangeEntries.length;
      const completionRate = (totalCompleted / days) * 100;
      
      // Calculate streak
      const streak = this.calculateStreak(habitId);
      
      // Calculate this week and month
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const thisWeekEntries = dateRangeEntries.filter(entry => 
        new Date(entry.date) >= weekStart
      ).length;
      
      const thisMonthEntries = dateRangeEntries.filter(entry => 
        new Date(entry.date) >= monthStart
      ).length;

      return {
        totalCompleted,
        completionRate,
        streak,
        thisWeek: thisWeekEntries,
        thisMonth: thisMonthEntries
      };
    } catch (error) {
      console.error('Failed to get habit stats:', error);
      return {
        totalCompleted: 0,
        completionRate: 0,
        streak: { current: 0, longest: 0 },
        thisWeek: 0,
        thisMonth: 0
      };
    }
  }

  // Calculate streak for a habit
  private calculateStreak(habitId: string): HabitStreak {
    try {
      return HabitTracker.computeStreakFromDates(this.getEntriesForHabit(habitId).map(e => e.date));
    } catch (error) {
      console.error('Failed to calculate streak:', error);
      return { current: 0, longest: 0 };
    }
  }

  // Get overall statistics
  getOverallStats(days: number = 30): {
    totalHabits: number;
    completedToday: number;
    completionRate: number;
    activeStreaks: number;
    mostConsistentHabit?: { habit: Habit; rate: number };
  } {
    try {
      const habits = this.getHabits();
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = this.getEntriesForDate(today);
      
      const completedToday = todayEntries.length;
      const totalHabits = habits.length;
      const completionRate = (completedToday / totalHabits) * 100;
      
      // Calculate active streaks
      let activeStreaks = 0;
      let mostConsistentHabit: { habit: Habit; rate: number } | undefined;
      let highestRate = 0;
      
      for (const habit of habits) {
        const stats = this.getHabitStats(habit.id, days);
        if (stats.streak.current > 0) {
          activeStreaks++;
        }
        
        if (stats.completionRate > highestRate) {
          highestRate = stats.completionRate;
          mostConsistentHabit = { habit, rate: stats.completionRate };
        }
      }
      
      return {
        totalHabits,
        completedToday,
        completionRate,
        activeStreaks,
        mostConsistentHabit
      };
    } catch (error) {
      console.error('Failed to get overall stats:', error);
      return {
        totalHabits: 0,
        completedToday: 0,
        completionRate: 0,
        activeStreaks: 0
      };
    }
  }

  // Export data
  exportData(): string {
    try {
      const data = {
        habits: this.getHabits(),
        entries: this.getEntries(),
        customHabits: this.getCustomHabits(),
        exportDate: new Date().toISOString()
      };
      
      return JSON.stringify(data, null, 2);
    } catch (error) {
      console.error('Failed to export data:', error);
      return '';
    }
  }

  // Import data
  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.customHabits) {
        localStorage.setItem(this.CUSTOM_HABITS_KEY, JSON.stringify(data.customHabits));
      }
      
      if (data.entries) {
        localStorage.setItem(this.ENTRIES_KEY, JSON.stringify(data.entries));
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }

  // Clear all data
  clearAllData(): void {
    try {
      localStorage.removeItem(this.CUSTOM_HABITS_KEY);
      localStorage.removeItem(this.ENTRIES_KEY);
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }
}

export const habitTracker = new HabitTracker();
