import { isBeforeSleepEnabled, getBedtimeHour, getBedtimeMinute } from './storage';

const SCHEDULE_KEY = 'bedtime-notification-id';

const BEDTIME_CONTENT = [
  { title: 'Time for rest', body: 'Reflect on your day and prepare for a peaceful sleep.' },
  { title: 'Wind down', body: 'Put away your phone and remember Allah before sleep.' },
  { title: 'Evening adhkar', body: 'Recite the morning and evening adhkar before sleeping.' },
  { title: 'Ayat-ul-Kursi', body: 'Recite Ayat-ul-Kursi before sleeping — a protection until morning.' },
  { title: 'Sleep with wudu', body: 'Make wudu before sleeping as the Prophet ﷺ advised.' },
  { title: 'Forgiveness', body: 'Seek forgiveness before sleep — Allah is Al-Ghafur, the Oft-Forgiving.' },
  { title: 'Bedtime dua', body: 'Say: "Bismika Allahumma ahya wa bismika amut" — in Your name, O Allah, I live and die.' },
];

function pickContent() {
  const day = new Date().getDate();
  return BEDTIME_CONTENT[day % BEDTIME_CONTENT.length];
}

export function scheduleBedtimeNotification() {
  if (!isBeforeSleepEnabled()) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const hour = getBedtimeHour();
  const minute = getBedtimeMinute();

  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }

  const existingId = localStorage.getItem(SCHEDULE_KEY);
  if (existingId) {
    const existing = parseInt(existingId, 10);
    clearTimeout(existing);
  }

  const timeoutId = window.setTimeout(() => {
    if (!isBeforeSleepEnabled()) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const content = pickContent();
    const n = new Notification(content.title, {
      body: content.body,
      icon: '/icon-192x192.png',
      tag: 'bedtime',
      requireInteraction: false,
    });
    n.onclick = () => window.focus();

    scheduleBedtimeNotification();
  }, target.getTime() - now.getTime());

  localStorage.setItem(SCHEDULE_KEY, timeoutId.toString());
}

export function cancelBedtimeNotification() {
  const existingId = localStorage.getItem(SCHEDULE_KEY);
  if (existingId) {
    clearTimeout(parseInt(existingId, 10));
    localStorage.removeItem(SCHEDULE_KEY);
  }
}
