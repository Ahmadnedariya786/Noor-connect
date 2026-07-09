/**
 * Enhanced Menstrual Mode - IndexedDB Database
 * Uses Dexie.js for structured, queryable local storage
 */

import Dexie, { type Table } from 'dexie';

// ============================================
// Database Interfaces
// ============================================

export interface DBProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: Date;
  isDefault: boolean;
  // Settings as JSON
  settingsJson: string;
}

export interface DBCycleRecord {
  id: string;
  profileId: string;
  startDate: Date;
  endDate?: Date;
  cycleLength?: number;
  periodLength?: number;
}

export interface DBDailySymptom {
  id?: number; // auto-increment
  profileId: string;
  cycleId: string;
  date: Date; // date only (time zeroed)
  cramps: number;
  headaches: number;
  fatigue: number;
  mood: number;
  bloating: number;
  breastTenderness: number;
  backache: number;
  acne: number;
  flow?: string;
  notes?: string;
}

export interface DBMoodEntry {
  id: string;
  profileId: string;
  cycleId?: string;
  date: Date;
  mood: number;
  note: string;
  timestamp: Date;
}

export interface DBMedication {
  id: string;
  profileId: string;
  name: string;
  type: string;
  defaultDosage: string;
  quantity: number;
  refillThreshold: number;
}

export interface DBMedicationLog {
  id: string;
  profileId: string;
  medicationId: string;
  cycleId?: string;
  name: string;
  type: string;
  dosage: string;
  takenAt: Date;
  effectiveness?: number;
  notes?: string;
}

export interface DBDailyNote {
  id?: number;
  profileId: string;
  cycleId: string;
  date: Date;
  text: string;
  createdAt: Date;
}

export interface DBScheduledNotification {
  id: string;
  profileId: string;
  type: string;
  title: string;
  body: string;
  scheduledAt: Date;
  sent: boolean;
  sentAt?: Date;
  createdAt: Date;
}

// ============================================
// Database Class
// ============================================

class MenstrualTrackerDB extends Dexie {
  profiles!: Table<DBProfile, string>;
  cycles!: Table<DBCycleRecord, string>;
  dailySymptoms!: Table<DBDailySymptom, number>;
  moodEntries!: Table<DBMoodEntry, string>;
  medications!: Table<DBMedication, string>;
  medicationLogs!: Table<DBMedicationLog, string>;
  dailyNotes!: Table<DBDailyNote, number>;
  notifications!: Table<DBScheduledNotification, string>;

  constructor() {
    super('MenstrualTrackerDB');

    this.version(1).stores({
      profiles: 'id, name, isDefault, createdAt',
      cycles: 'id, profileId, startDate, endDate',
      dailySymptoms: '++id, profileId, cycleId, date, [profileId+date]',
      moodEntries: 'id, profileId, cycleId, date, timestamp',
      medications: 'id, profileId, name, type',
      medicationLogs: 'id, profileId, medicationId, cycleId, takenAt, type',
      dailyNotes: '++id, profileId, cycleId, date',
      notifications: 'id, profileId, type, scheduledAt, sent',
    });
  }
}

// ============================================
// Singleton Instance
// ============================================

export const db = new MenstrualTrackerDB();

// ============================================
// Utility Functions
// ============================================

/** Generate a unique ID for new records */
export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

/** Get the default profile, or create one if none exists */
export const getOrCreateDefaultProfile = async (): Promise<DBProfile> => {
  const defaultProfile = await db.profiles
    .where('isDefault')
    .equals(true)
    .first();

  if (defaultProfile) return defaultProfile;

  // Create default profile
  const newProfile: DBProfile = {
    id: generateId(),
    name: 'Default',
    color: '#e11d48', // rose-600
    createdAt: new Date(),
    isDefault: true,
    settingsJson: JSON.stringify({
      defaultCycleLength: 28,
      defaultPeriodLength: 5,
      notificationsEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      maxNotificationsPerDay: 3,
      prayerTimeIntegration: true,
    }),
  };

  await db.profiles.add(newProfile);
  return newProfile;
};

/** Check if IndexedDB is available and functional */
export const isIndexedDBAvailable = async (): Promise<boolean> => {
  try {
    await db.open();
    return true;
  } catch {
    return false;
  }
};

/** Clear all data for a specific profile */
export const clearProfileData = async (profileId: string): Promise<void> => {
  await db.transaction(
    'rw',
    [db.cycles, db.dailySymptoms, db.moodEntries, db.medications, db.medicationLogs, db.dailyNotes, db.notifications],
    async () => {
      await db.cycles.where('profileId').equals(profileId).delete();
      await db.dailySymptoms.where('profileId').equals(profileId).delete();
      await db.moodEntries.where('profileId').equals(profileId).delete();
      await db.medications.where('profileId').equals(profileId).delete();
      await db.medicationLogs.where('profileId').equals(profileId).delete();
      await db.dailyNotes.where('profileId').equals(profileId).delete();
      await db.notifications.where('profileId').equals(profileId).delete();
    }
  );
};

export default db;
