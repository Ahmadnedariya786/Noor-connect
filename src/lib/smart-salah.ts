// Noor Connect — Smart Salah Auto-DND, Alarm Stream & Advance Alerts Engine
// Seamless Native Android Sync with 8-Language Localization
// 100% offline-first with zero personal data loss guarantee

export type AdvanceReminderMinutes = 0 | 5 | 10 | 15 | 30;
export type AutoDndDurationMinutes = 15 | 20 | 30 | 45;

export interface SmartSalahConfig {
  advanceReminderMinutes: AdvanceReminderMinutes;
  playAdhanAsAlarm: boolean;
  fullScreenAlerts: boolean;
  autoDndEnabled: boolean;
  autoDndDuration: AutoDndDurationMinutes;
  autoDndFridayExtended: boolean;
  liveCountdownEnabled: boolean;
}

export const SMART_SALAH_STORAGE_KEYS = {
  advanceReminder: 'prayer_advance_reminder_mins',
  alarmStream: 'prayer_alarm_stream_enabled',
  fullScreen: 'prayer_fullscreen_alert_enabled',
  autoDnd: 'prayer_dnd_enabled',
  dndDuration: 'prayer_dnd_duration_mins',
  dndFridayExtended: 'prayer_dnd_friday_extended',
  liveCountdown: 'prayer_live_countdown_enabled',
} as const;

export const DEFAULT_SMART_SALAH_CONFIG: SmartSalahConfig = {
  advanceReminderMinutes: 10,
  playAdhanAsAlarm: true,
  fullScreenAlerts: true,
  autoDndEnabled: false,
  autoDndDuration: 20,
  autoDndFridayExtended: true,
  liveCountdownEnabled: true,
};

export function loadSmartSalahConfig(): SmartSalahConfig {
  try {
    const rawAdvance = localStorage.getItem(SMART_SALAH_STORAGE_KEYS.advanceReminder);
    const rawAlarm = localStorage.getItem(SMART_SALAH_STORAGE_KEYS.alarmStream);
    const rawFullScreen = localStorage.getItem(SMART_SALAH_STORAGE_KEYS.fullScreen);
    const rawDnd = localStorage.getItem(SMART_SALAH_STORAGE_KEYS.autoDnd);
    const rawDuration = localStorage.getItem(SMART_SALAH_STORAGE_KEYS.dndDuration);
    const rawFriday = localStorage.getItem(SMART_SALAH_STORAGE_KEYS.dndFridayExtended);
    const rawCountdown = localStorage.getItem(SMART_SALAH_STORAGE_KEYS.liveCountdown);

    return {
      advanceReminderMinutes: rawAdvance !== null
        ? (Number(rawAdvance) as AdvanceReminderMinutes)
        : DEFAULT_SMART_SALAH_CONFIG.advanceReminderMinutes,
      playAdhanAsAlarm: rawAlarm !== null ? rawAlarm === 'true' : DEFAULT_SMART_SALAH_CONFIG.playAdhanAsAlarm,
      fullScreenAlerts: rawFullScreen !== null ? rawFullScreen === 'true' : DEFAULT_SMART_SALAH_CONFIG.fullScreenAlerts,
      autoDndEnabled: rawDnd !== null ? rawDnd === 'true' : DEFAULT_SMART_SALAH_CONFIG.autoDndEnabled,
      autoDndDuration: rawDuration !== null ? (Number(rawDuration) as AutoDndDurationMinutes) : DEFAULT_SMART_SALAH_CONFIG.autoDndDuration,
      autoDndFridayExtended: rawFriday !== null ? rawFriday === 'true' : DEFAULT_SMART_SALAH_CONFIG.autoDndFridayExtended,
      liveCountdownEnabled: rawCountdown !== null ? rawCountdown === 'true' : DEFAULT_SMART_SALAH_CONFIG.liveCountdownEnabled,
    };
  } catch {
    return { ...DEFAULT_SMART_SALAH_CONFIG };
  }
}

export function saveSmartSalahConfig(config: SmartSalahConfig): void {
  try {
    localStorage.setItem(SMART_SALAH_STORAGE_KEYS.advanceReminder, String(config.advanceReminderMinutes));
    localStorage.setItem(SMART_SALAH_STORAGE_KEYS.alarmStream, String(config.playAdhanAsAlarm));
    localStorage.setItem(SMART_SALAH_STORAGE_KEYS.fullScreen, String(config.fullScreenAlerts));
    localStorage.setItem(SMART_SALAH_STORAGE_KEYS.autoDnd, String(config.autoDndEnabled));
    localStorage.setItem(SMART_SALAH_STORAGE_KEYS.dndDuration, String(config.autoDndDuration));
    localStorage.setItem(SMART_SALAH_STORAGE_KEYS.dndFridayExtended, String(config.autoDndFridayExtended));
    localStorage.setItem(SMART_SALAH_STORAGE_KEYS.liveCountdown, String(config.liveCountdownEnabled));
  } catch {
    // Handled localStorage save error
  }
}

export function hasNativeDndAccess(): boolean {
  try {
    const bridge = (window as any).AndroidBridge;
    if (bridge && typeof bridge.hasDndPolicyAccess === 'function') {
      return Boolean(bridge.hasDndPolicyAccess());
    }
  } catch (err) {
    console.warn('[SmartSalah] hasNativeDndAccess error:', err);
  }
  return true;
}

export function openNativeDndSettings(): void {
  try {
    const bridge = (window as any).AndroidBridge;
    if (bridge && typeof bridge.openDndPolicySettings === 'function') {
      bridge.openDndPolicySettings();
    }
  } catch (err) {
    console.warn('[SmartSalah] openNativeDndSettings error:', err);
  }
}

export function syncSmartSalahToNative(config: SmartSalahConfig, prayerData?: any): void {
  try {
    const bridge = (window as any).AndroidBridge;
    if (!bridge) return;

    if (typeof bridge.setAlarmStreamEnabled === 'function') {
      bridge.setAlarmStreamEnabled(config.playAdhanAsAlarm);
    }

    if (typeof bridge.setFullScreenAlertsEnabled === 'function') {
      bridge.setFullScreenAlertsEnabled(config.fullScreenAlerts);
    }

    if (typeof bridge.setLiveCountdownEnabled === 'function') {
      bridge.setLiveCountdownEnabled(config.liveCountdownEnabled);
    }

    // Configure Auto-DND triggers if prayer schedule is provided
    if (typeof bridge.configurePrayerAutoDnd === 'function' && prayerData && prayerData.prayers) {
      const isFriday = new Date().getDay() === 5;
      const dndPayload = {
        enabled: config.autoDndEnabled,
        durationMinutes: config.autoDndDuration,
        fridayDurationMinutes: config.autoDndFridayExtended ? 45 : config.autoDndDuration,
        prayers: (prayerData.prayers || []).map((p: any) => ({
          name: p.name || '',
          timeMs: p.time || 0,
          isFriday,
        })),
      };
      bridge.configurePrayerAutoDnd(JSON.stringify(dndPayload));
    }

    // Update Live Countdown Notification if enabled
    if (typeof bridge.updateLivePrayerCountdown === 'function' && prayerData) {
      const nextIdx = prayerData.nextPrayerIndex || 0;
      const nextPrayer = prayerData.prayers?.[nextIdx];
      const summary = (prayerData.prayers || [])
        .map((p: any) => `${p.name} ${p.formattedTime || ''}`)
        .join(' • ');

      const countdownPayload = {
        enabled: config.liveCountdownEnabled,
        nextPrayerName: nextPrayer?.name || 'Prayer',
        nextPrayerTimeFormatted: nextPrayer?.formattedTime || '',
        nextPrayerEpochMillis: nextPrayer?.time || 0,
        allPrayersSummary: summary,
      };
      bridge.updateLivePrayerCountdown(JSON.stringify(countdownPayload));
    }
  } catch (err) {
    console.warn('[SmartSalah] syncSmartSalahToNative error:', err);
  }
}

// ─────────────────────────────────────────────────────────
// Full 8-Language Localization for Smart Salah Settings
// ─────────────────────────────────────────────────────────

export interface SmartSalahI18n {
  engineTitle: string;
  engineSub: string;
  advanceTitle: string;
  advanceSub: string;
  advanceOff: string;
  advance5m: string;
  advance10m: string;
  advance15m: string;
  advance30m: string;
  alarmStreamTitle: string;
  alarmStreamSub: string;
  fullScreenTitle: string;
  fullScreenSub: string;
  dndTitle: string;
  dndSub: string;
  dndDurationLabel: string;
  dndFridayExtendedLabel: string;
  dndFridayExtendedSub: string;
  dndPermissionTitle: string;
  dndPermissionDesc: string;
  dndGrantButton: string;
  countdownTitle: string;
  countdownSub: string;
  min15: string;
  min20: string;
  min30: string;
  min45: string;
}

const SMART_SALAH_I18N: Record<string, SmartSalahI18n> = {
  en: {
    engineTitle: 'Smart Salah & Alert Engine',
    engineSub: 'Advance reminders, alarm volume, Auto-DND & live countdown',
    advanceTitle: 'Advance Pre-Prayer Reminder',
    advanceSub: 'Gentle notification before prayer for Wudu & preparation',
    advanceOff: 'Off',
    advance5m: '5m before',
    advance10m: '10m before',
    advance15m: '15m before',
    advance30m: '30m before',
    alarmStreamTitle: 'Play Adhan as Alarm Volume',
    alarmStreamSub: 'Plays Adhan through alarm volume so it rings even on Silent/Vibrate',
    fullScreenTitle: 'Full-Screen Lockscreen Prayer Alert',
    fullScreenSub: 'Wakes screen on lockscreen with Dismiss & Snooze 5m options',
    dndTitle: 'Silence Phone at Prayer Time (Auto-DND)',
    dndSub: 'Automatically mutes phone during Fard prayer & restores your ringer after',
    dndDurationLabel: 'Silence Duration',
    dndFridayExtendedLabel: 'Extend Jumu‘ah on Friday (45 min)',
    dndFridayExtendedSub: 'Automatically extends silence window for Friday Khutbah & Salah',
    dndPermissionTitle: 'Do Not Disturb Permission Required',
    dndPermissionDesc: 'To automatically silence your phone at prayer time, Noor Connect needs system Do Not Disturb access.',
    dndGrantButton: 'Grant Do Not Disturb Permission →',
    countdownTitle: 'Live Prayer Countdown Notification',
    countdownSub: 'Pinned status bar notification with real-time countdown to next prayer',
    min15: '15 min',
    min20: '20 min',
    min30: '30 min',
    min45: '45 min',
  },
  ar: {
    engineTitle: 'محرك تنبيهات الصلاة الذكي',
    engineSub: 'تذكير مسبق، ومستوى صوت المنبه، والوضع الصامت التلقائي',
    advanceTitle: 'تذكير مبكر قبل الصلاة',
    advanceSub: 'إشعار لطيف قبل دخول الوقت للوضوء والاستعداد',
    advanceOff: 'معطل',
    advance5m: 'قبل ٥ دقائق',
    advance10m: 'قبل ١٠ دقائق',
    advance15m: 'قبل ١٥ دقيقة',
    advance30m: 'قبل ٣٠ دقيقة',
    alarmStreamTitle: 'تشغيل الأذان بمستوى صوت المنبه',
    alarmStreamSub: 'يرن الأذان عبر مسار المنبه حتى وإن كان الهاتف في وضع الصامت أو الاهتزاز',
    fullScreenTitle: 'تنبيه ملء الشاشة عند القفل',
    fullScreenSub: 'إيقاظ الشاشة المقفلة مع خياري الإغلاق وتأجيل ٥ دقائق',
    dndTitle: 'كتم الهاتف وقت الصلاة (عدم الإزعاج التلقائي)',
    dndSub: 'تفعيل وضع عدم الإزعاج أثناء الفريضة وإعادته تلقائياً بعد الانتهاء',
    dndDurationLabel: 'مدة كتم الهاتف',
    dndFridayExtendedLabel: 'تمديد الجمعة إلى ٤٥ دقيقة',
    dndFridayExtendedSub: 'تمديد فترة الكتم تلقائياً لخطبة الجمعة والصلاة',
    dndPermissionTitle: 'إذن عدم الإزعاج مطلوب',
    dndPermissionDesc: 'لكتم الهاتف تلقائياً أثناء الصلاة، يحتاج التطبيق إلى إذن الوصول لسياسة عدم الإزعاج.',
    dndGrantButton: 'منح إذن عدم الإزعاج ←',
    countdownTitle: 'إشعار العد التنازلي المباشر',
    countdownSub: 'إشعار مثبت بشريط الإشعارات بعداد حي حتى موعد الأذان القادم',
    min15: '١٥ دقيقة',
    min20: '٢٠ دقيقة',
    min30: '٣٠ دقيقة',
    min45: '٤٥ دقيقة',
  },
  ur: {
    engineTitle: 'سمارٹ نماز الرٹ انجن',
    engineSub: 'قبل از وقت یاددہانی، الارم والیوم، خودکار خاموشی اور لائیو کاؤنٹ ڈاؤن',
    advanceTitle: 'نماز سے پہلے یاد دہانی',
    advanceSub: 'وضو اور تیاری کے لیے نماز سے چند منٹ قبل ہلکا الرٹ',
    advanceOff: 'بند',
    advance5m: '5 منٹ پہلے',
    advance10m: '10 منٹ پہلے',
    advance15m: '15 منٹ پہلے',
    advance30m: '30 منٹ پہلے',
    alarmStreamTitle: 'اذان کو الارم والیوم پر چلائیں',
    alarmStreamSub: 'فون کے سائلنٹ یا وائبریٹ پر ہونے کے باوجود اذان الارم پر بجتی ہے',
    fullScreenTitle: 'فل اسکرین لاک اسکرین الرٹ',
    fullScreenSub: 'نماز کے وقت اسکرین روشن ہو کر ڈسمس اور 5 منٹ اسنوز کے بٹن دکھائے گی',
    dndTitle: 'نماز کے وقت فون سائلنٹ کریں (آٹو DND)',
    dndSub: 'نماز باجماعت کے دوران فون خودکار خاموش اور نماز کے بعد سابقہ حالت پر بحال',
    dndDurationLabel: 'خاموشی کا دورانیہ',
    dndFridayExtendedLabel: 'جمعہ کے دن 45 منٹ تک بڑھائیں',
    dndFridayExtendedSub: 'خطبہ جمعہ اور نماز کے لیے خودکار طویل دورانیہ منتخب کریں',
    dndPermissionTitle: 'ڈو ناٹ ڈسٹرب (DND) کی اجازت درکار ہے',
    dndPermissionDesc: 'نماز کے وقت فون خودکار خاموش کرنے کے لیے نور کنیکٹ کو DND ایکسس کی ضرورت ہے۔',
    dndGrantButton: 'ڈو ناٹ ڈسٹرب کی اجازت دیں ←',
    countdownTitle: 'لائیو نماز کاؤنٹ ڈاؤن نوٹیفکیشن',
    countdownSub: 'اسٹیٹس بار میں اگلی نماز تک لائیو چلنے والی ٹائمر نوٹیفکیشن',
    min15: '15 منٹ',
    min20: '20 منٹ',
    min30: '30 منٹ',
    min45: '45 منٹ',
  },
  gu: {
    engineTitle: 'સ્માર્ટ નમાઝ એલર્ટ એન્જિન',
    engineSub: 'અગાઉથી રિમાઇન્ડર, એલાર્મ અવાજ, ઓટો સાઇલેન્ટ અને લાઇવ કાઉન્ટડાઉન',
    advanceTitle: 'નમાઝ પહેલાં અગાઉથી યાદ અપાવો',
    advanceSub: 'વુઝૂ અને તૈયારી માટે નમાઝથી થોડી મિનિટો પહેલાં સૂચના',
    advanceOff: 'બંધ',
    advance5m: '૫ મિનિટ પહેલાં',
    advance10m: '૧૦ મિનિટ પહેલાં',
    advance15m: '૧૫ મિનિટ પહેલાં',
    advance30m: '૩૦ મિનિટ પહેલાં',
    alarmStreamTitle: 'અઝાન અલાર્મ વોલ્યુમ પર વગાડો',
    alarmStreamSub: 'ફોન સાયલન્ટ હોય તો પણ અઝાન અલાર્મ વોલ્યુમ પર વાગશે',
    fullScreenTitle: 'ફૂલ-સ્ક્રીન લૉકસ્ક્રીન એલર્ટ',
    fullScreenSub: 'સ્ક્રીન જાગૃત કરીને ડિસમિસ અને ૫ મિનિટ સ્નૂઝ વિકલ્પ આપો',
    dndTitle: 'નમાઝ વખતે ફોન સાયલન્ટ કરો (ઑટો DND)',
    dndSub: 'નમાઝ દરમિયાન આપમેળે સાયલન્ટ અને પછી પૂર્વવત રિંગર પુનઃસ્થાપિત કરો',
    dndDurationLabel: 'સાયલન્ટ સમયગાળો',
    dndFridayExtendedLabel: 'શુક્રવારે જુમ્માહ માટે ૪૫ મિનિટ લંબાવો',
    dndFridayExtendedSub: 'શુક્રવારના ખુત્બા અને નમાઝ માટે સમયગાળો લંબાવો',
    dndPermissionTitle: 'ડૂ નૉટ ડિસ્ટર્બ મંજૂરી જરૂરી છે',
    dndPermissionDesc: 'નમાઝ વખતે ફોનને શાંત કરવા માટે સિસ્ટમ DND ની મંજૂરી આપો.',
    dndGrantButton: 'ડૂ નૉટ ડિસ્ટર્બ મંજૂરી આપો →',
    countdownTitle: 'લાઇવ કાઉન્ટડાઉન નોટિફિકેશન',
    countdownSub: 'આગામી નમાઝ સુધી સ્ટેટસ બારમાં લાઇવ ટાઈમર',
    min15: '૧૫ મિનિટ',
    min20: '૨૦ મિનિટ',
    min30: '૩૦ મિનિટ',
    min45: '૪૫ મિનિટ',
  },
  hi: {
    engineTitle: 'स्मार्ट नमाज़ अलर्ट इंजन',
    engineSub: 'समय पूर्व सूचना, अलार्म आवाज़, ऑटो साइलेंट व लाइव काउंटडाउन',
    advanceTitle: 'नमाज़ से पहले अग्रिम अनुस्मारक',
    advanceSub: 'वुज़ू और तैयारी के लिए नमाज़ से कुछ मिनट पहले सौम्य सूचना',
    advanceOff: 'बंद',
    advance5m: '5 मिनट पहले',
    advance10m: '10 मिनट पहले',
    advance15m: '15 मिनट पहले',
    advance30m: '30 मिनट पहले',
    alarmStreamTitle: 'अज़ान को अलार्म वॉल्यूम पर बजाएं',
    alarmStreamSub: 'फ़ोन साइलेंट होने पर भी अज़ान अलार्म वॉल्यूम पर बजेगी',
    fullScreenTitle: 'फ़ुल-स्क्रीन लॉकस्क्रीन अलर्ट',
    fullScreenSub: 'स्क्रीन जगाकर डिसमिस और 5 मिनट स्नूज़ विकल्प दिखाएं',
    dndTitle: 'नमाज़ के समय फ़ोन साइलेंट करें (ऑटो DND)',
    dndSub: 'फ़र्ज़ नमाज़ के दौरान फ़ोन म्यूट और नमाज़ के बाद रिंगर स्वतः बहाल',
    dndDurationLabel: 'साइलेंस अवधि',
    dndFridayExtendedLabel: 'शुक्रवार को जुमा के लिए 45 मिनट बढ़ाएं',
    dndFridayExtendedSub: 'जुमा के ख़ुत्बे और नमाज़ के लिए स्वचालित विस्तारित अवधि',
    dndPermissionTitle: 'डू नॉट डिस्टर्ब (DND) अनुमति आवश्यक है',
    dndPermissionDesc: 'नमाज़ के समय फ़ोन को म्यूट करने के लिए नूर कनेक्ट को DND अनुमति दें।',
    dndGrantButton: 'डू नॉट डिस्टर्ब अनुमति दें →',
    countdownTitle: 'लाइव नमाज़ उलटी गिनती सूचना',
    countdownSub: 'स्टेटस बार में अगली नमाज़ के लिए लाइव टाइमर',
    min15: '15 मिनट',
    min20: '20 मिनट',
    min30: '30 मिनट',
    min45: '45 मिनट',
  },
  bn: {
    engineTitle: 'স্মার্ট সালাত ও অ্যালার্ট ইঞ্জিন',
    engineSub: 'অগ্রিম রিমাইন্ডার, অ্যালার্ম ভলিউম, অটো-সাইলেন্ট এবং লাইভ কাউন্টডাউন',
    advanceTitle: 'নামাজের পূর্বে অগ্রিম স্মরণ',
    advanceSub: 'ওযু এবং প্রস্তুতির জন্য নামাজের কয়েক মিনিট পূর্বে সতর্কবার্তা',
    advanceOff: 'বন্ধ',
    advance5m: '৫ মিনিট আগে',
    advance10m: '১০ মিনিট আগে',
    advance15m: '১৫ মিনিট আগে',
    advance30m: '৩০ মিনিট আগে',
    alarmStreamTitle: 'আজান অ্যালার্ম ভলিউমে বাজান',
    alarmStreamSub: 'ফোন সাইলেন্ট থাকলেও আজান অ্যালার্ম ভলিউমে বেজে উঠবে',
    fullScreenTitle: 'ফুল-স্ক্রিন লকস্ক্রিন অ্যালার্ট',
    fullScreenSub: 'লক স্ক্রিন অন করে বাতিল ও ৫ মিনিট স্নুজ করার সুবিধা',
    dndTitle: 'নামাজের সময় ফোন সাইলেন্ট রাখুন (অটো DND)',
    dndSub: 'নামাজের সময় ফোন নিঃশব্দ এবং নামাজ শেষে স্বাভাবিক রিংগারে প্রত্যাবর্তন',
    dndDurationLabel: 'নিঃশব্দ সময়সীমা',
    dndFridayExtendedLabel: 'জুমার জন্য ৪৫ মিনিট পর্যন্ত বাড়ান',
    dndFridayExtendedSub: 'জুমার খুতবা ও নামাজের জন্য বর্ধিত সময় নির্ধারণ করুন',
    dndPermissionTitle: 'ডু নট ডিস্টার্ব (DND) অনুমতি প্রয়োজন',
    dndPermissionDesc: 'নামাজের সময় ফোন সাইলেন্ট রাখতে DND নীতিতে অনুমতি প্রদান করুন।',
    dndGrantButton: 'ডু নট ডিস্টার্ব অনুমতি দিন →',
    countdownTitle: 'লাইভ নামাজ কাউন্টডাউন নোটিফিকেশন',
    countdownSub: 'পরবর্তী নামাজের জন্য স্ট্যাটাস বারে চলমান টাইমার',
    min15: '১৫ মিনিট',
    min20: '২০ মিনিট',
    min30: '৩০ মিনিট',
    min45: '৪৫ মিনিট',
  },
  ru: {
    engineTitle: 'Умные уведомления намаза',
    engineSub: 'Предварительное напоминание, громкость будильника и авто-беззвучный режим',
    advanceTitle: 'Предварительное напоминание',
    advanceSub: 'Мягкое оповещение до намаза для совершения омовения и подготовки',
    advanceOff: 'Откл',
    advance5m: 'За 5 мин',
    advance10m: 'За 10 мин',
    advance15m: 'За 15 мин',
    advance30m: 'За 30 мин',
    alarmStreamTitle: 'Азан на громкости будильника',
    alarmStreamSub: 'Азан звучит через поток будильника даже в режиме «Без звука/Вибро»',
    fullScreenTitle: 'Полноэкранное оповещение на экране блокировки',
    fullScreenSub: 'Включает экран с кнопками «Закрыть» и «Отложить на 5 мин»',
    dndTitle: 'Без звука во время намаза (Авто-DND)',
    dndSub: 'Автоматически приглушает телефон во время молитвы и восстанавливает звук после',
    dndDurationLabel: 'Длительность беззвучного режима',
    dndFridayExtendedLabel: 'Продлить пятничный намаз до 45 мин',
    dndFridayExtendedSub: 'Увеличивает беззвучный интервал для пятничной хутбы и молитвы',
    dndPermissionTitle: 'Требуется доступ к режиму «Не беспокоить»',
    dndPermissionDesc: 'Для автоматического выключения звука приложению необходим доступ к DND.',
    dndGrantButton: 'Предоставить доступ к DND →',
    countdownTitle: 'Живой обратный отсчет в шторке',
    countdownSub: 'Закрепленное уведомление со счетчиком до следующего намаза',
    min15: '15 мин',
    min20: '20 мин',
    min30: '30 мин',
    min45: '45 мин',
  },
  fr: {
    engineTitle: 'Moteur intelligent d’alertes de prière',
    engineSub: 'Rappels préalables, volume d’alarme, mode Ne pas déranger auto et compte à rebours',
    advanceTitle: 'Rappel avant la prière',
    advanceSub: 'Notification douce avant la prière pour le Wudu et la préparation',
    advanceOff: 'Désactivé',
    advance5m: '5 min avant',
    advance10m: '10 min avant',
    advance15m: '15 min avant',
    advance30m: '30 min avant',
    alarmStreamTitle: "Jouer l'Adhan au volume d'alarme",
    alarmStreamSub: "L'Adhan sonne via le flux alarme même en mode silencieux ou vibreur",
    fullScreenTitle: 'Alerte plein écran sur écran verrouillé',
    fullScreenSub: 'Réveille l’écran avec boutons Ignorer et Répéter 5 min',
    dndTitle: 'Silence pendant la prière (Auto-DND)',
    dndSub: 'Met le téléphone en silencieux pendant la prière et rétablit la sonnerie après',
    dndDurationLabel: 'Durée du mode silencieux',
    dndFridayExtendedLabel: 'Prolonger le vendredi Jumu‘ah (45 min)',
    dndFridayExtendedSub: 'Prolonge automatiquement la durée pour la Khutbah et la prière',
    dndPermissionTitle: 'Autorisation Ne pas déranger requise',
    dndPermissionDesc: 'Pour couper automatiquement le son, autorisez l’accès Ne pas déranger.',
    dndGrantButton: 'Autoriser Ne pas déranger →',
    countdownTitle: 'Compte à rebours en direct',
    countdownSub: 'Notification persistante avec compte à rebours jusqu’à la prochaine prière',
    min15: '15 min',
    min20: '20 min',
    min30: '30 min',
    min45: '45 min',
  },
};

export function getSmartSalahI18n(lang: string): SmartSalahI18n {
  const code = (lang || 'en').toLowerCase().split('-')[0];
  return SMART_SALAH_I18N[code] || SMART_SALAH_I18N.en;
}
