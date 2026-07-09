import { isIslamicSleepReminderEnabled } from './storage';

const SCHEDULE_KEY = 'islamic-sleep-reminder-id';

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
const OFFSET_MINUTES = 30;

export function getNextIslamicSleepReminderTime(): Date | null {
  if (!isIslamicSleepReminderEnabled()) return null;

  const now = new Date();
  const ishaTime = getIshaTimeFromCache();

  let target: Date;

  if (ishaTime) {
    const [hours, minutes] = ishaTime.split(':').map(Number);
    target = new Date(now);
    target.setHours(hours, minutes + OFFSET_MINUTES, 0, 0);
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
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const target = getNextIslamicSleepReminderTime();
  if (!target) return;

  const now = new Date();
  const existingId = localStorage.getItem(SCHEDULE_KEY);
  if (existingId) {
    clearTimeout(parseInt(existingId, 10));
  }

  const timeoutId = window.setTimeout(() => {
    if (!isIslamicSleepReminderEnabled()) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const content = pickContent();
    const n = new Notification(content.title, {
      body: content.body,
      icon: '/icon-192x192.png',
      tag: 'islamic-sleep',
      requireInteraction: false,
    });
    n.onclick = () => window.focus();

    scheduleIslamicSleepReminder();
  }, target.getTime() - now.getTime());

  localStorage.setItem(SCHEDULE_KEY, timeoutId.toString());
}

export function cancelIslamicSleepReminder() {
  const existingId = localStorage.getItem(SCHEDULE_KEY);
  if (existingId) {
    clearTimeout(parseInt(existingId, 10));
    localStorage.removeItem(SCHEDULE_KEY);
  }
}
