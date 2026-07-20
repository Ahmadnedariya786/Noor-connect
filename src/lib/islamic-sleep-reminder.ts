import { isIslamicSleepReminderEnabled, getIslamicSleepOffset } from './storage';

const SLEEP_CONTENT = [
  { title: 'Islamic Sleep Reminder', body: 'Recite Ayatul Kursi before sleeping — it will protect you until morning.' },
  { title: 'Islamic Sleep Reminder', body: 'Recite Surah Al-Ikhlas, Al-Falaq, An-Nas (3x each) before sleeping.' },
  { title: 'Islamic Sleep Reminder', body: 'Dua: "Bismika Allahumma amutu wa ahya" — In Your name, O Allah, I die and live.' },
  { title: 'Islamic Sleep Reminder', body: 'Say SubhanAllah (33x), Alhamdulillah (33x), Allahu Akbar (34x) before sleeping.' },
  { title: 'Islamic Sleep Reminder', body: 'Sleep on your right side facing the Qibla — the Sunnah of the Prophet SAW.' },
  { title: 'Islamic Sleep Reminder', body: 'Make wudu before sleeping. The Prophet SAW advised sleeping in a state of purity.' },
  { title: 'Islamic Sleep Reminder', body: 'Recite the last 2 ayahs of Surah Al-Baqarah before sleeping — they will suffice you.' },
];

function pickContent() {
  const day = new Date().getDate();
  return SLEEP_CONTENT[day % SLEEP_CONTENT.length];
}

function getIshaTimeFromCache(): string | null {
  try {
    const raw = localStorage.getItem('cached-prayer-times');
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached.times || !Array.isArray(cached.times)) return null;
    const isha = cached.times.find((t: { name: string; time: string }) => t.name === 'Isha');
    return isha?.time || null;
  } catch {
    return null;
  }
}

const FALLBACK_HOUR = 21;
const FALLBACK_MINUTE = 0;

export function getNextIslamicSleepReminderTime(): Date | null {
  if (!isIslamicSleepReminderEnabled()) return null;

  const now = new Date();
  const ishaTime = getIshaTimeFromCache();

  let target: Date;

  if (ishaTime) {
    const [hours, minutes] = ishaTime.split(':').map(Number);
    const offset = getIslamicSleepOffset();
    target = new Date(now);
    target.setHours(hours, minutes + offset, 0, 0);
  } else {
    target = new Date(now);
    target.setHours(FALLBACK_HOUR, FALLBACK_MINUTE, 0, 0);
  }

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  return target;
}

export function scheduleIslamicSleepReminder() {
  if (!isIslamicSleepReminderEnabled()) return;

  const target = getNextIslamicSleepReminderTime();
  if (!target) return;

  const now = new Date();
  const delay = target.getTime() - now.getTime();
  if (delay <= 0) return;

  const content = pickContent();

  // Use Capacitor LocalNotifications if available, fall back to Web API
  const isCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
  if (isCapacitor) {
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      LocalNotifications.schedule({
        notifications: [{
          id: 7777,
          title: content.title,
          body: content.body,
          schedule: { at: target, allowWhileIdle: true, repeats: false },
          sound: 'default',
          smallIcon: 'ic_notification',
          iconColor: '#1a4a4a',
          extra: { type: 'islamic_sleep' }
        }]
      }).catch((e: Error) => console.warn('Failed to schedule sleep reminder:', e));
    });
  } else {
    // Web fallback using setTimeout
    const existingId = localStorage.getItem('islamic-sleep-reminder-timeout');
    if (existingId) clearTimeout(parseInt(existingId, 10));

    const timeoutId = window.setTimeout(() => {
      if (!isIslamicSleepReminderEnabled()) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const n = new Notification(content.title, {
        body: content.body,
        icon: '/icon-192x192.png',
        tag: 'islamic-sleep',
        requireInteraction: false,
      });
      n.onclick = () => window.focus();
    }, delay);

    localStorage.setItem('islamic-sleep-reminder-timeout', timeoutId.toString());
  }
}

export function cancelIslamicSleepReminder() {
  const isCapacitor = !!(window as unknown as { Capacitor?: unknown }).Capacitor;
  if (isCapacitor) {
    import('@capacitor/local-notifications').then(({ LocalNotifications }) => {
      LocalNotifications.cancel({ notifications: [{ id: 7777 }] }).catch(() => {});
    }).catch(() => {});
  } else {
    const existingId = localStorage.getItem('islamic-sleep-reminder-timeout');
    if (existingId) {
      clearTimeout(parseInt(existingId, 10));
      localStorage.removeItem('islamic-sleep-reminder-timeout');
    }
  }
}
