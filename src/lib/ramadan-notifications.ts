import { unifiedNotifications } from './unified-notifications';

export class RamadanNotifications {
  private static instance: RamadanNotifications;

  static getInstance(): RamadanNotifications {
    if (!RamadanNotifications.instance) {
      RamadanNotifications.instance = new RamadanNotifications();
    }
    return RamadanNotifications.instance;
  }

  private buildTimeToday(time: string): Date | null {
    const [hoursRaw, minutesRaw] = time.split(':');
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
      return null;
    }

    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Schedule Suhoor reminder (30 minutes before Fajr)
  async scheduleSuhoorReminder(fajrTime: string, location: string) {
    const fajrDate = this.buildTimeToday(fajrTime);
    if (!fajrDate) return;

    const suhoorTime = new Date(fajrDate);
    suhoorTime.setMinutes(suhoorTime.getMinutes() - 30); // 30 minutes before Fajr

    if (suhoorTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Suhoor', suhoorTime, {
        title: 'Suhoor Time',
        body: `Eat your Suhoor in ${location}. Fajr is at ${fajrTime}`,
        icon: 'moon'
      });

      // Schedule water reminder before Suhoor ends
      const waterBeforeSuhoorTime = new Date(suhoorTime);
      waterBeforeSuhoorTime.setMinutes(waterBeforeSuhoorTime.getMinutes() + 20); // 20 minutes after Suhoor starts

      if (waterBeforeSuhoorTime > new Date()) {
        await unifiedNotifications.schedulePrayerNotification('Water-Before-Suhoor', waterBeforeSuhoorTime, {
          title: 'Hydration Before Fasting',
          body: 'Drink water now before Suhoor ends! Stay hydrated for your fast.',
          icon: 'droplet'
        });
      }
    }
  }

  // Schedule Iftar reminder (at Maghrib time)
  async scheduleIftarReminder(maghribTime: string, location: string, waterRemindersEnabled: boolean = true) {
    const iftarTime = this.buildTimeToday(maghribTime);
    if (!iftarTime) return;

    if (iftarTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Iftar', iftarTime, {
        title: 'Iftar Time',
        body: `Break your fast in ${location}. Maghrib is at ${maghribTime}`,
        icon: 'sunset'
      });

      // Schedule water reminders after Iftar
      await this.scheduleWaterRemindersAfterIftar(iftarTime, location, waterRemindersEnabled);
    }
  }

  // Schedule water reminders at intervals after Iftar
  async scheduleWaterRemindersAfterIftar(iftarTime: Date, location: string, enabled: boolean = true) {
    if (!enabled) return; // Skip if water reminders are disabled

    const waterReminders = [
      { minutes: 15, message: 'First glass of water! Rehydrate gently.' },
      { minutes: 30, message: 'Time for more water! Stay hydrated.' },
      { minutes: 45, message: 'Keep drinking water! Your body needs it.' },
      { minutes: 60, message: 'One hour after Iftar - great time for water!' },
      { minutes: 90, message: "Hydration break! Don't forget to drink water." },
      { minutes: 120, message: '2 hours post-Iftar - important hydration time!' },
      { minutes: 150, message: 'Water reminder! Keep your energy up.' },
      { minutes: 180, message: '3 hours after Iftar - final water reminder before Suhoor prep.' }
    ];

    for (const reminder of waterReminders) {
      const reminderTime = new Date(iftarTime);
      reminderTime.setMinutes(reminderTime.getMinutes() + reminder.minutes);

      if (reminderTime > new Date()) {
        await unifiedNotifications.schedulePrayerNotification(`Water-${reminder.minutes}`, reminderTime, {
          title: `Water Reminder (${reminder.minutes}min after Iftar)`,
          body: reminder.message,
          icon: 'droplet'
        });
      }
    }
  }

  // Schedule Tarawih reminder (30 minutes after Isha)
  async scheduleTarawihReminder(ishaTime: string, location: string) {
    const ishaDate = this.buildTimeToday(ishaTime);
    if (!ishaDate) return;

    const tarawihTime = new Date(ishaDate);
    tarawihTime.setMinutes(tarawihTime.getMinutes() + 30); // 30 minutes after Isha

    if (tarawihTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Tarawih', tarawihTime, {
        title: 'Tarawih Prayer',
        body: `Time for Tarawih prayers in ${location}`,
        icon: 'star'
      });
    }
  }

  // Schedule daily Quran reading reminder
  async scheduleQuranReminder(time: string = '08:00') {
    const reminderTime = this.buildTimeToday(time);
    if (!reminderTime) return;

    if (reminderTime > new Date()) {
      await unifiedNotifications.schedulePrayerNotification('Quran', reminderTime, {
        title: 'Quran Reading',
        body: "Don't forget to read your portion of Quran today",
        icon: 'book'
      });
    }
  }

  // Schedule charity reminder (every Friday)
  async scheduleCharityReminder() {
    const nextFriday = new Date();
    const dayOfWeek = nextFriday.getDay();
    const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
    nextFriday.setDate(nextFriday.getDate() + daysUntilFriday);
    nextFriday.setHours(10, 0, 0, 0); // 10 AM on Friday

    await unifiedNotifications.schedulePrayerNotification('Charity', nextFriday, {
      title: 'Friday Charity',
      body: 'Remember to give charity on this blessed day',
      icon: 'heart'
    });
  }

  // Send motivational messages throughout Ramadan
  async sendRamadanMotivation(ramadanDay: number) {
    const motivations = [
      'Stay strong! Your fast is accepted insha Allah!',
      'Every moment in Ramadan is a blessing!',
      'The doors of paradise are open in Ramadan!',
      'Your patience and fasting will be rewarded!',
      'Make dua in this blessed month!',
      'The Quran was revealed in this month - read it!',
      'Laylatul Qadr is better than 1000 months!',
      'Ramadan is the month of mercy and forgiveness!'
    ];

    const motivation = motivations[Math.min(ramadanDay - 1, motivations.length - 1)];

    await unifiedNotifications.showNotification({
      title: 'Ramadan Motivation',
      body: motivation,
      icon: 'sparkles'
    });
  }

  // Clear all Ramadan notifications
  async clearRamadanNotifications() {
    console.log('Clearing old Ramadan notifications');
    await unifiedNotifications.clearRamadanNotifications();
  }

  // Schedule all Ramadan notifications for the day
  async scheduleDailyRamadanNotifications(
    fajrTime: string,
    maghribTime: string,
    ishaTime: string,
    location: string,
    ramadanDay: number,
    waterRemindersEnabled: boolean = true
  ) {
    // Clear previous notifications
    await this.clearRamadanNotifications();

    // Schedule new notifications
    await this.scheduleSuhoorReminder(fajrTime, location);
    await this.scheduleIftarReminder(maghribTime, location, waterRemindersEnabled);
    await this.scheduleTarawihReminder(ishaTime, location);
    await this.scheduleQuranReminder();

    // Send motivation every 3 days
    if (ramadanDay % 3 === 0) {
      await this.sendRamadanMotivation(ramadanDay);
    }

    // Schedule charity reminder on Fridays
    const today = new Date();
    if (today.getDay() === 5) { // Friday
      await this.scheduleCharityReminder();
    }
  }
}
