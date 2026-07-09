/**
 * Enhanced Menstrual Mode - Storage Abstraction Layer
 * Unified API for menstrual data operations using IndexedDB
 * Falls back to localStorage if IndexedDB is unavailable
 */

import Dexie from 'dexie';
import { db, generateId, getOrCreateDefaultProfile, isIndexedDBAvailable, type DBProfile, type DBCycleRecord, type DBDailySymptom, type DBMoodEntry, type DBMedication, type DBMedicationLog } from './menstrual-db';
import type {
  Profile,
  ProfileSettings,
  CycleRecord,
  DailySymptoms,
  MoodEntry,
  MedicationDefinition,
  MedicationEntry,
  CyclePhase,
  FlowIntensity,
} from '@/types/menstrual';

// ============================================
// Event System (backward compat with existing CustomEvent pattern)
// ============================================

const emitEvent = (eventName: string, detail?: any) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
};

export const MENSTRUAL_DATA_UPDATED = 'menstrual-data-updated';
export const MENSTRUAL_CYCLE_STARTED = 'menstrual-cycle-started';
export const MENSTRUAL_CYCLE_ENDED = 'menstrual-cycle-ended';

// ============================================
// Profile Operations
// ============================================

export const profileOps = {
  async getAll(): Promise<Profile[]> {
    const profiles = await db.profiles.toArray();
    return profiles.map(dbProfileToProfile);
  },

  async getById(id: string): Promise<Profile | null> {
    const profile = await db.profiles.get(id);
    return profile ? dbProfileToProfile(profile) : null;
  },

  async getDefault(): Promise<Profile> {
    const dbProfile = await getOrCreateDefaultProfile();
    return dbProfileToProfile(dbProfile);
  },

  async create(name: string, color: string, settings?: Partial<ProfileSettings>): Promise<Profile> {
    const profile: DBProfile = {
      id: generateId(),
      name,
      color,
      createdAt: new Date(),
      isDefault: false,
      settingsJson: JSON.stringify({
        defaultCycleLength: 28,
        defaultPeriodLength: 5,
        notificationsEnabled: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        maxNotificationsPerDay: 3,
        prayerTimeIntegration: true,
        ...settings,
      }),
    };
    await db.profiles.add(profile);
    return dbProfileToProfile(profile);
  },

  async update(id: string, updates: Partial<Profile>): Promise<void> {
    const dbUpdates: Partial<DBProfile> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.color !== undefined) dbUpdates.color = updates.color;
    if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
    if (updates.settings !== undefined) {
      dbUpdates.settingsJson = JSON.stringify(updates.settings);
    }
    await db.profiles.update(id, dbUpdates);
  },

  async delete(id: string): Promise<void> {
    const { clearProfileData } = await import('./menstrual-db');
    await clearProfileData(id);
    await db.profiles.delete(id);
  },

  async setDefault(id: string): Promise<void> {
    await db.transaction('rw', db.profiles, async () => {
      await db.profiles.where('isDefault').equals(true).modify({ isDefault: false });
      await db.profiles.update(id, { isDefault: true });
    });
  },
};

// ============================================
// Cycle Operations
// ============================================

export const cycleOps = {
  async getAll(profileId: string): Promise<CycleRecord[]> {
    const cycles = await db.cycles
      .where('profileId')
      .equals(profileId)
      .reverse()
      .sortBy('startDate');

    return Promise.all(cycles.map(c => dbCycleToCycleRecord(c, profileId)));
  },

  async getActive(profileId: string): Promise<CycleRecord | null> {
    const cycle = await db.cycles
      .where('[profileId+endDate]')
      .between([profileId, Dexie.minKey], [profileId, Dexie.maxKey])
      .filter(c => c.endDate === undefined)
      .first();

    if (!cycle) return null;
    return dbCycleToCycleRecord(cycle, profileId);
  },

  async getById(id: string, profileId: string): Promise<CycleRecord | null> {
    const cycle = await db.cycles.get(id);
    if (!cycle) return null;
    return dbCycleToCycleRecord(cycle, profileId);
  },

  async start(profileId: string, startDate: Date = new Date()): Promise<CycleRecord> {
    const cycleId = generateId();
    const cycle: DBCycleRecord = {
      id: cycleId,
      profileId,
      startDate: startDate,
    };
    await db.cycles.add(cycle);
    emitEvent(MENSTRUAL_CYCLE_STARTED, { cycleId, profileId });
    emitEvent(MENSTRUAL_DATA_UPDATED);
    return dbCycleToCycleRecord(cycle, profileId);
  },

  async end(cycleId: string, profileId: string, endDate: Date = new Date()): Promise<CycleRecord | null> {
    const cycle = await db.cycles.get(cycleId);
    if (!cycle) return null;

    const periodLength = Math.max(1, Math.floor((endDate.getTime() - cycle.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Calculate cycle length from previous cycle
    const previousCycle = await db.cycles
      .where('profileId')
      .equals(profileId)
      .filter(c => c.startDate < cycle.startDate && c.endDate !== undefined)
      .reverse()
      .sortBy('startDate')
      .then(cycles => cycles[0]);

    let cycleLength: number | undefined;
    if (previousCycle) {
      cycleLength = Math.floor((cycle.startDate.getTime() - previousCycle.startDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    await db.cycles.update(cycleId, {
      endDate,
      periodLength,
      cycleLength,
    });

    emitEvent(MENSTRUAL_CYCLE_ENDED, { cycleId, profileId });
    emitEvent(MENSTRUAL_DATA_UPDATED);
    return dbCycleToCycleRecord({ ...cycle, endDate, periodLength, cycleLength }, profileId);
  },

  async delete(cycleId: string): Promise<void> {
    await db.transaction('rw', [db.cycles, db.dailySymptoms, db.moodEntries, db.medicationLogs, db.dailyNotes], async () => {
      await db.dailySymptoms.where('cycleId').equals(cycleId).delete();
      await db.moodEntries.where('cycleId').equals(cycleId).delete();
      await db.medicationLogs.where('cycleId').equals(cycleId).delete();
      await db.dailyNotes.where('cycleId').equals(cycleId).delete();
      await db.cycles.delete(cycleId);
    });
    emitEvent(MENSTRUAL_DATA_UPDATED);
  },
};

// ============================================
// Symptom Operations
// ============================================

export const symptomOps = {
  async getForDate(profileId: string, date: Date): Promise<DailySymptoms | null> {
    const dateOnly = toDateOnly(date);
    const symptom = await db.dailySymptoms
      .where('[profileId+date]')
      .equals([profileId, dateOnly])
      .first();

    return symptom ? dbSymptomToDaily(symptom) : null;
  },

  async getForRange(profileId: string, startDate: Date, endDate: Date): Promise<DailySymptoms[]> {
    const symptoms = await db.dailySymptoms
      .where('profileId')
      .equals(profileId)
      .filter(s => s.date >= startDate && s.date <= endDate)
      .toArray();

    return symptoms.map(dbSymptomToDaily);
  },

  async save(profileId: string, cycleId: string, symptoms: DailySymptoms): Promise<void> {
    const date = new Date(symptoms.date);
    const existing = await db.dailySymptoms
      .where('[profileId+date]')
      .equals([profileId, toDateOnly(date)])
      .first();

    const record: Omit<DBDailySymptom, 'id'> = {
      profileId,
      cycleId,
      date: toDateOnly(date),
      cramps: symptoms.cramps,
      headaches: symptoms.headaches,
      fatigue: symptoms.fatigue,
      mood: symptoms.mood,
      bloating: symptoms.bloating,
      breastTenderness: symptoms.breastTenderness,
      backache: symptoms.backache,
      acne: symptoms.acne,
      flow: symptoms.flow,
      notes: symptoms.notes,
    };

    if (existing && existing.id) {
      await db.dailySymptoms.update(existing.id, record);
    } else {
      await db.dailySymptoms.add(record);
    }
    emitEvent(MENSTRUAL_DATA_UPDATED);
  },
};

// ============================================
// Mood Operations
// ============================================

export const moodOps = {
  async getForRange(profileId: string, startDate: Date, endDate: Date): Promise<MoodEntry[]> {
    const entries = await db.moodEntries
      .where('profileId')
      .equals(profileId)
      .filter(e => e.date >= startDate && e.date <= endDate)
      .reverse()
      .sortBy('timestamp');

    return entries.map(dbMoodToMood);
  },

  async add(profileId: string, mood: number, note: string, cycleId?: string): Promise<MoodEntry> {
    const entry: DBMoodEntry = {
      id: generateId(),
      profileId,
      cycleId,
      date: toDateOnly(new Date()),
      mood,
      note,
      timestamp: new Date(),
    };
    await db.moodEntries.add(entry);
    emitEvent(MENSTRUAL_DATA_UPDATED);
    return dbMoodToMood(entry);
  },

  async delete(id: string): Promise<void> {
    await db.moodEntries.delete(id);
    emitEvent(MENSTRUAL_DATA_UPDATED);
  },
};

// ============================================
// Medication Operations
// ============================================

export const medicationOps = {
  async getAll(profileId: string): Promise<MedicationDefinition[]> {
    const meds = await db.medications
      .where('profileId')
      .equals(profileId)
      .toArray();

    return Promise.all(meds.map(async (med) => {
      const logs = await db.medicationLogs
        .where('medicationId')
        .equals(med.id)
        .reverse()
        .sortBy('takenAt');

      return {
        id: med.id,
        name: med.name,
        type: med.type as MedicationEntry['type'],
        defaultDosage: med.defaultDosage,
        quantity: med.quantity,
        refillThreshold: med.refillThreshold,
        logs: logs.map(dbLogToMedicationEntry),
      };
    }));
  },

  async add(profileId: string, med: Omit<MedicationDefinition, 'id' | 'logs'>): Promise<MedicationDefinition> {
    const id = generateId();
    const record: DBMedication = {
      id,
      profileId,
      name: med.name,
      type: med.type,
      defaultDosage: med.defaultDosage,
      quantity: med.quantity,
      refillThreshold: med.refillThreshold,
    };
    await db.medications.add(record);
    emitEvent(MENSTRUAL_DATA_UPDATED);
    return { ...med, id, logs: [] };
  },

  async logDose(profileId: string, medicationId: string, dosage: string, effectiveness?: number, notes?: string, cycleId?: string): Promise<MedicationEntry> {
    const med = await db.medications.get(medicationId);
    if (!med) throw new Error('Medication not found');

    const log: DBMedicationLog = {
      id: generateId(),
      profileId,
      medicationId,
      cycleId,
      name: med.name,
      type: med.type,
      dosage,
      takenAt: new Date(),
      effectiveness,
      notes,
    };
    await db.medicationLogs.add(log);

    // Decrement quantity
    if (med.quantity > 0) {
      await db.medications.update(medicationId, { quantity: med.quantity - 1 });
    }

    emitEvent(MENSTRUAL_DATA_UPDATED);
    return dbLogToMedicationEntry(log);
  },

  async getLogsForRange(profileId: string, startDate: Date, endDate: Date): Promise<MedicationEntry[]> {
    const logs = await db.medicationLogs
      .where('profileId')
      .equals(profileId)
      .filter(l => l.takenAt >= startDate && l.takenAt <= endDate)
      .reverse()
      .sortBy('takenAt');

    return logs.map(dbLogToMedicationEntry);
  },

  async delete(id: string): Promise<void> {
    await db.medicationLogs.where('medicationId').equals(id).delete();
    await db.medications.delete(id);
    emitEvent(MENSTRUAL_DATA_UPDATED);
  },

  async getLowSupply(profileId: string): Promise<MedicationDefinition[]> {
    const meds = await this.getAll(profileId);
    return meds.filter(m => m.quantity <= m.refillThreshold);
  },
};

// ============================================
// Phase Calculation Utilities
// ============================================

export const getCycleDay = (cycleStartDate: Date, targetDate: Date = new Date()): number => {
  const start = new Date(cycleStartDate);
  start.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.max(1, Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
};

export const determinePhase = (cycleDay: number, cycleLength: number = 28): { phase: CyclePhase; dayOfPhase: number; phaseLength: number } => {
  const menstrualEnd = Math.min(5, Math.floor(cycleLength * 0.18));
  const ovulationStart = Math.floor(cycleLength * 0.43);
  const ovulationEnd = Math.floor(cycleLength * 0.54);
  const lutealStart = ovulationEnd + 1;
  const premenstrualStart = cycleLength - 5;

  if (cycleDay <= menstrualEnd) {
    return { phase: 'menstrual', dayOfPhase: cycleDay, phaseLength: menstrualEnd };
  } else if (cycleDay <= ovulationStart) {
    return { phase: 'follicular', dayOfPhase: cycleDay - menstrualEnd, phaseLength: ovulationStart - menstrualEnd };
  } else if (cycleDay <= ovulationEnd) {
    return { phase: 'ovulatory', dayOfPhase: cycleDay - ovulationStart, phaseLength: ovulationEnd - ovulationStart + 1 };
  } else if (cycleDay <= premenstrualStart) {
    return { phase: 'luteal', dayOfPhase: cycleDay - ovulationEnd, phaseLength: premenstrualStart - ovulationEnd };
  } else {
    return { phase: 'premenstrual', dayOfPhase: cycleDay - premenstrualStart, phaseLength: cycleLength - premenstrualStart + 1 };
  }
};

export const getPhaseColor = (phase: CyclePhase): string => {
  const colors: Record<CyclePhase, string> = {
    menstrual: '#e11d48',     // rose-600
    follicular: '#10b981',    // emerald-500
    ovulatory: '#3b82f6',     // blue-500
    luteal: '#8b5cf6',        // violet-500
    premenstrual: '#f97316',  // orange-500
  };
  return colors[phase];
};

// ============================================
// Conversion Helpers
// ============================================

function toDateOnly(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dbProfileToProfile(p: DBProfile): Profile {
  let settings: ProfileSettings;
  try {
    settings = JSON.parse(p.settingsJson);
  } catch {
    settings = {
      defaultCycleLength: 28,
      defaultPeriodLength: 5,
      notificationsEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      maxNotificationsPerDay: 3,
      prayerTimeIntegration: true,
    };
  }
  return {
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    createdAt: p.createdAt.toISOString(),
    isDefault: p.isDefault,
    settings,
  };
}

async function dbCycleToCycleRecord(c: DBCycleRecord, profileId: string): Promise<CycleRecord> {
  const symptoms = await db.dailySymptoms
    .where('cycleId')
    .equals(c.id)
    .toArray();

  const moods = await db.moodEntries
    .where('cycleId')
    .equals(c.id)
    .toArray();

  const medLogs = await db.medicationLogs
    .where('cycleId')
    .equals(c.id)
    .toArray();

  const notes = await db.dailyNotes
    .where('cycleId')
    .equals(c.id)
    .toArray();

  return {
    id: c.id,
    profileId: c.profileId,
    startDate: c.startDate.toISOString(),
    endDate: c.endDate?.toISOString(),
    cycleLength: c.cycleLength,
    periodLength: c.periodLength,
    symptoms: symptoms.map(dbSymptomToDaily),
    moodEntries: moods.map(dbMoodToMood),
    medications: medLogs.map(dbLogToMedicationEntry),
    notes: notes.map(n => ({
      date: n.date.toISOString().split('T')[0],
      text: n.text,
      createdAt: n.createdAt.toISOString(),
    })),
  };
}

function dbSymptomToDaily(s: DBDailySymptom): DailySymptoms {
  return {
    date: s.date.toISOString().split('T')[0],
    cramps: s.cramps,
    headaches: s.headaches,
    fatigue: s.fatigue,
    mood: s.mood,
    bloating: s.bloating,
    breastTenderness: s.breastTenderness,
    backache: s.backache,
    acne: s.acne,
    flow: s.flow as FlowIntensity | undefined,
    notes: s.notes,
  };
}

function dbMoodToMood(m: DBMoodEntry): MoodEntry {
  return {
    id: m.id,
    date: m.date.toISOString().split('T')[0],
    mood: m.mood,
    note: m.note,
    timestamp: m.timestamp.toISOString(),
  };
}

function dbLogToMedicationEntry(l: DBMedicationLog): MedicationEntry {
  return {
    id: l.id,
    name: l.name,
    type: l.type as MedicationEntry['type'],
    dosage: l.dosage,
    takenAt: l.takenAt.toISOString(),
    effectiveness: l.effectiveness as 1 | 2 | 3 | 4 | 5 | undefined,
    notes: l.notes,
  };
}
