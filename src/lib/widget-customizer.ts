// Noor Connect — Android Home Screen Widgets Customizer
// Config, Swatches, Local Storage & Native Bridge Dispatcher
// 100% offline-first with zero personal data loss guarantee

export type WidgetSurfaceStyle = 'theme' | 'oled' | 'frosted';
export type WidgetAccentPreset = 'ivory' | 'white' | 'parchment' | 'mint' | 'sapphire' | 'rose';

export interface WidgetStyleConfig {
  surfaceStyle: WidgetSurfaceStyle;
  opacity: number; // 0 to 100 (in 5% steps)
  accentPreset: WidgetAccentPreset;
  showCity: boolean;
  showCountdown: boolean;
  showFullStrip: boolean;
  fontScale: number; // 85 to 120 (in 5% steps)
}

export const WIDGET_STORAGE_KEY = 'noor_widget_style_v1';

export const DEFAULT_WIDGET_STYLE: WidgetStyleConfig = {
  surfaceStyle: 'theme',
  opacity: 85,
  accentPreset: 'ivory',
  showCity: true,
  showCountdown: true,
  showFullStrip: true,
  fontScale: 100,
};

export interface AccentPresetDef {
  id: WidgetAccentPreset;
  name: string;
  accentHex: string;
  textHex: string;
  subHex: string;
  borderHex: string;
}

export const ACCENT_PRESETS: Record<WidgetAccentPreset, AccentPresetDef> = {
  ivory: {
    id: 'ivory',
    name: 'Ivory & Gold',
    accentHex: '#D4AF37',
    textHex: '#FDFBF7',
    subHex: '#C5A059',
    borderHex: 'rgba(212, 175, 55, 0.35)',
  },
  white: {
    id: 'white',
    name: 'Pure White',
    accentHex: '#FFFFFF',
    textHex: '#FFFFFF',
    subHex: '#CBD5E1',
    borderHex: 'rgba(255, 255, 255, 0.35)',
  },
  parchment: {
    id: 'parchment',
    name: 'Warm Parchment',
    accentHex: '#E6C280',
    textHex: '#FDF6E2',
    subHex: '#C2A268',
    borderHex: 'rgba(230, 194, 128, 0.35)',
  },
  mint: {
    id: 'mint',
    name: 'Madinah Mint',
    accentHex: '#10B981',
    textHex: '#ECFDF5',
    subHex: '#34D399',
    borderHex: 'rgba(16, 185, 129, 0.35)',
  },
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire Ice',
    accentHex: '#38BDF8',
    textHex: '#F0F9FF',
    subHex: '#7DD3FC',
    borderHex: 'rgba(56, 189, 248, 0.35)',
  },
  rose: {
    id: 'rose',
    name: 'Velvet Rose',
    accentHex: '#F43F5E',
    textHex: '#FFF1F2',
    subHex: '#FB7185',
    borderHex: 'rgba(244, 63, 94, 0.35)',
  },
};

/**
 * Load saved widget style configuration from localStorage with defensive fallbacks.
 */
export function loadWidgetStyleConfig(): WidgetStyleConfig {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_WIDGET_STYLE };
    const parsed = JSON.parse(raw);
    return {
      surfaceStyle: ['theme', 'oled', 'frosted'].includes(parsed.surfaceStyle)
        ? parsed.surfaceStyle
        : DEFAULT_WIDGET_STYLE.surfaceStyle,
      opacity: typeof parsed.opacity === 'number'
        ? Math.min(100, Math.max(0, parsed.opacity))
        : DEFAULT_WIDGET_STYLE.opacity,
      accentPreset: parsed.accentPreset in ACCENT_PRESETS
        ? parsed.accentPreset
        : DEFAULT_WIDGET_STYLE.accentPreset,
      showCity: typeof parsed.showCity === 'boolean' ? parsed.showCity : true,
      showCountdown: typeof parsed.showCountdown === 'boolean' ? parsed.showCountdown : true,
      showFullStrip: typeof parsed.showFullStrip === 'boolean' ? parsed.showFullStrip : true,
      fontScale: typeof parsed.fontScale === 'number'
        ? Math.min(120, Math.max(85, parsed.fontScale))
        : DEFAULT_WIDGET_STYLE.fontScale,
    };
  } catch {
    return { ...DEFAULT_WIDGET_STYLE };
  }
}

/**
 * Save widget style configuration to localStorage.
 */
export function saveWidgetStyleConfig(config: WidgetStyleConfig): void {
  try {
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Handled localStorage error safely
  }
}

/**
 * Dispatch widget style configuration to Native Android Bridge.
 */
export function syncWidgetStyleToNative(config: WidgetStyleConfig): boolean {
  try {
    const bridge = (window as any).AndroidBridge;
    if (bridge && typeof bridge.syncWidgetCustomization === 'function') {
      bridge.syncWidgetCustomization(JSON.stringify(config));
      return true;
    }
  } catch (err) {
    console.warn('[WidgetCustomizer] syncWidgetStyleToNative error:', err);
  }
  return false;
}

// ─────────────────────────────────────────────────────────
// Full 8-Language Localization for Widget Customizer
// ─────────────────────────────────────────────────────────

export interface WidgetCustomizerI18n {
  title: string;
  subtitle: string;
  livePreview: string;
  surfaceStyleTitle: string;
  surfaceStyleSub: string;
  surfaceTheme: string;
  surfaceOled: string;
  surfaceFrosted: string;
  opacityTitle: string;
  opacitySub: string;
  accentTitle: string;
  accentSub: string;
  layoutTitle: string;
  layoutSub: string;
  showCity: string;
  showCitySub: string;
  showCountdown: string;
  showCountdownSub: string;
  showFullStrip: string;
  showFullStripSub: string;
  fontScaleTitle: string;
  fontScaleSub: string;
  applyButton: string;
  syncedToastTitle: string;
  syncedToastDesc: string;
  howToAddTitle: string;
  howToAddStep1: string;
  howToAddStep2: string;
  howToAddStep3: string;
  howToAddStep4: string;
  sampleCity: string;
  nextPrayerLabel: string;
}

const WIDGET_I18N: Record<string, WidgetCustomizerI18n> = {
  en: {
    title: 'Home Screen Widgets',
    subtitle: 'Customize opacity, colors & layout',
    livePreview: 'Live Widget Preview',
    surfaceStyleTitle: 'Widget Surface Style',
    surfaceStyleSub: 'Select the visual background base for your widgets',
    surfaceTheme: 'Match Theme',
    surfaceOled: 'Pure OLED',
    surfaceFrosted: 'Frosted Glass',
    opacityTitle: 'Background Strength (Opacity)',
    opacitySub: 'Adjust transparency from sheer glass to solid backdrop',
    accentTitle: 'Color & Accent Swatches',
    accentSub: 'High-contrast jewel tones for time, countdown & highlights',
    layoutTitle: 'Prayer Times Widget Layout',
    layoutSub: 'Choose which details appear on your home screen',
    showCity: 'Show City Name',
    showCitySub: 'Display current detected or selected city pill',
    showCountdown: 'Show Live Countdown',
    showCountdownSub: 'Display remaining time until next prayer',
    showFullStrip: 'Show Full 5-Prayer Strip',
    showFullStripSub: 'Display complete Fajr–Isha row across the widget',
    fontScaleTitle: 'Font Size Scale',
    fontScaleSub: 'Adjust text size for better readability on small screens',
    applyButton: 'Apply & Refresh Home Widgets',
    syncedToastTitle: 'Widgets Updated',
    syncedToastDesc: 'Your home screen widgets have been synced successfully.',
    howToAddTitle: 'How to Add Widgets to Android Home Screen',
    howToAddStep1: 'Long-press any empty area on your Android Home screen.',
    howToAddStep2: 'Tap "Widgets" from the menu that appears.',
    howToAddStep3: 'Scroll or search for "Noor Connect".',
    howToAddStep4: 'Touch and drag your desired widget to your home screen.',
    sampleCity: 'Makkah al-Mukarramah',
    nextPrayerLabel: 'NEXT PRAYER',
  },
  ar: {
    title: 'عناصر الشاشة الرئيسية',
    subtitle: 'تخصيص الشفافية والألوان والتنسيق',
    livePreview: 'معاينة مباشرة للعنصر',
    surfaceStyleTitle: 'نمط خلفية العنصر',
    surfaceStyleSub: 'اختر المظهر المرئي لخلفية عناصر واجهة المستخدم',
    surfaceTheme: 'مطابقة السمة',
    surfaceOled: 'أسود خالص (OLED)',
    surfaceFrosted: 'زجاج غير لامع',
    opacityTitle: 'قوة الخلفية (الشفافية)',
    opacitySub: 'ضبط الشفافية من الزجاج الشفاف إلى الخلفية المصمتة',
    accentTitle: 'لوحات الألوان والتمييز',
    accentSub: 'درجات جوهرية عالية التباين للوقت والعد التنازلي',
    layoutTitle: 'تنسيق مواقيت الصلاة',
    layoutSub: 'اختر التفاصيل التي تظهر على شاشتك الرئيسية',
    showCity: 'إظهار اسم المدينة',
    showCitySub: 'عرض شارة المدينة المحددة أو الحالية',
    showCountdown: 'إظهار العد التنازلي الحي',
    showCountdownSub: 'عرض الوقت المتبقي حتى الأذان القادم',
    showFullStrip: 'شريط الصلوات الخمس الكامل',
    showFullStripSub: 'عرض أوقات الصلوات من الفجر إلى العشاء',
    fontScaleTitle: 'مقياس حجم الخط',
    fontScaleSub: 'ضبط حجم الخط لقراءة أوضح على الشاشات المختلفة',
    applyButton: 'تطبيق وتحديث العناصر',
    syncedToastTitle: 'تم تحديث العناصر',
    syncedToastDesc: 'تمت مزامنة عناصر الشاشة الرئيسية بنجاح.',
    howToAddTitle: 'طريقة إضافة عناصر نور كونكت إلى الشاشة الرئيسية',
    howToAddStep1: 'اضغط مطولاً على أي مساحة فارغة في شاشتك الرئيسية.',
    howToAddStep2: 'اضغط على "عناصر واجهة المستخدم" (Widgets).',
    howToAddStep3: 'ابحث عن تطبيق "Noor Connect".',
    howToAddStep4: 'المس مع الاستمرار العنصر واسحبه إلى شاشتك.',
    sampleCity: 'مكة المكرمة',
    nextPrayerLabel: 'الصلاة القادمة',
  },
  ur: {
    title: 'ہوم اسکرین وجٹس',
    subtitle: 'شفافیت، رنگ اور لے آؤٹ کو اپنی پسند کے مطابق بنائیں',
    livePreview: 'وجٹ کا لائیو پیش نظارہ',
    surfaceStyleTitle: 'وجٹ کا پس منظر کا انداز',
    surfaceStyleSub: 'اپنے وجٹس کے لیے بصری پس منظر منتخب کریں',
    surfaceTheme: 'موجودہ تھیم',
    surfaceOled: 'خالص بلیک (OLED)',
    surfaceFrosted: 'فراسٹڈ گلاس',
    opacityTitle: 'پس منظر کی شفافیت (اوپیسٹی)',
    opacitySub: 'شفاف شیشے سے لے کر مکمل پس منظر تک ایڈجسٹ کریں',
    accentTitle: 'رنگ اور ہائی لائٹ کے نمونے',
    accentSub: 'اوقات اور کاؤنٹ ڈاؤن کے لیے پرکشش اعلیٰ کنٹراسٹ رنگ',
    layoutTitle: 'اوقاتِ نماز کے وجٹ کا لے آؤٹ',
    layoutSub: 'منتخب کریں کہ ہوم اسکرین پر کون سی تفصیلات ظاہر ہوں',
    showCity: 'شہر کا نام دکھائیں',
    showCitySub: 'موجودہ یا منتخب شدہ شہر کا نام ظاہر کریں',
    showCountdown: 'لائیو کاؤنٹ ڈاؤن دکھائیں',
    showCountdownSub: 'اگلی نماز تک باقی وقت دکھائیں',
    showFullStrip: 'پانچوں نمازوں کی مکمل پٹی',
    showFullStripSub: 'وجٹ میں فجر تا عشاء مکمل اوقات دکھائیں',
    fontScaleTitle: 'فونٹ سائز اسکیل',
    fontScaleSub: 'چھوٹی اسکرینوں پر واضح پڑھنے کے لیے فونٹ سائز بڑھائیں',
    applyButton: 'وجٹس لاگو اور ریفریش کریں',
    syncedToastTitle: 'وجٹس اپ ڈیٹ ہو گئے',
    syncedToastDesc: 'ہوم اسکرین وجٹس کامیابی کے ساتھ سنک ہو چکے ہیں۔',
    howToAddTitle: 'اینڈرائیڈ ہوم اسکرین پر وجٹ شامل کرنے کا طریقہ',
    howToAddStep1: 'اپنی اینڈرائیڈ ہوم اسکرین کی خالی جگہ پر دیر تک دبائے رکھیں۔',
    howToAddStep2: 'سامنے آنے والے مینو سے "Widgets" پر ٹیپ کریں۔',
    howToAddStep3: '"Noor Connect" تلاش کریں۔',
    howToAddStep4: 'اپنے پسندیدہ وجٹ کو دبائے رکھ کر ہوم اسکرین پر لے آئیں۔',
    sampleCity: 'مکہ مکرمہ',
    nextPrayerLabel: 'اگلی نماز',
  },
  gu: {
    title: 'હોમ સ્ક્રીન વિજેટ્સ',
    subtitle: 'પારદર્શિતા, રંગો અને લેઆઉટ પસંદ કરો',
    livePreview: 'લાઇવ વિજેટ પ્રીવ્યૂ',
    surfaceStyleTitle: 'વિજેટ સપાટી શૈલી',
    surfaceStyleSub: 'વિજેટ માટે દ્રશ્ય પૃષ્ઠભૂમિ પસંદ કરો',
    surfaceTheme: 'થીમ સાથે મેળવો',
    surfaceOled: 'શુદ્ધ બ્લેક (OLED)',
    surfaceFrosted: 'ફ્રોસ્ટેડ ગ્લાસ',
    opacityTitle: 'પૃષ્ઠભૂમિ પારદર્શિતા (ઓપેસિટી)',
    opacitySub: 'પારદર્શક કાચથી નક્કર પૃષ્ઠભૂમિ સુધી સેટ કરો',
    accentTitle: 'રંગ અને હાઇલાઇટ સ્વોચિસ',
    accentSub: 'સમય અને કાઉન્ટડાઉન માટે ઉચ્ચ કોન્ટ્રાસ્ટ રંગો',
    layoutTitle: 'નમાઝ સમય વિજેટ લેઆઉટ',
    layoutSub: 'હોમ સ્ક્રીન પર કઈ વિગતો દેખાય તે પસંદ કરો',
    showCity: 'શહેરનું નામ બતાવો',
    showCitySub: 'હાલનું અથવા પસંદ કરેલું શહેર દર્શાવો',
    showCountdown: 'લાઇવ કાઉન્ટડાઉન બતાવો',
    showCountdownSub: 'આગામી નમાઝ સુધીનો બાકી સમય દર્શાવો',
    showFullStrip: 'સંપૂર્ણ 5 નમાઝ પટ્ટી',
    showFullStripSub: 'ફજરથી ઇશા સુધીની સંપૂર્ણ પટ્ટી દર્શાવો',
    fontScaleTitle: 'ફોન્ટ કદ સ્કેલ',
    fontScaleSub: 'વાંચન સરળતા માટે ફોન્ટનું કદ સેટ કરો',
    applyButton: 'લાગુ કરો અને વિજેટ્સ રિફ્રેશ કરો',
    syncedToastTitle: 'વિજેટ્સ અપડેટ થયા',
    syncedToastDesc: 'તમારા હોમ સ્ક્રીન વિજેટ્સ સફળતાપૂર્વક સિંક થઈ ગયા છે.',
    howToAddTitle: 'હોમ સ્ક્રીન પર વિજેટ કેવી રીતે ઉમેરવું',
    howToAddStep1: 'હોમ સ્ક્રીનની ખાલી જગ્યા પર લાંબો સમય દબાવી રાખો.',
    howToAddStep2: 'દેખાતા મેનૂમાંથી "Widgets" પર ટેપ કરો.',
    howToAddStep3: '"Noor Connect" શોધો.',
    howToAddStep4: 'વિજેટને પકડીને તમારી હોમ સ્ક્રીન પર મૂકો.',
    sampleCity: 'મક્કા મુકર્રમા',
    nextPrayerLabel: 'આગામી નમાઝ',
  },
  hi: {
    title: 'होम स्क्रीन विजेट्स',
    subtitle: 'पारदर्शिता, रंग और लेआउट कस्टमाइज़ करें',
    livePreview: 'लाइव विजेट पूर्वावलोकन',
    surfaceStyleTitle: 'विजेट बैकग्राउंड स्टाइल',
    surfaceStyleSub: 'विजेट के लिए दृश्य पृष्ठभूमि चुनें',
    surfaceTheme: 'थीम से मिलाएं',
    surfaceOled: 'शुद्ध ब्लैक (OLED)',
    surfaceFrosted: 'फ्रॉस्टेड ग्लास',
    opacityTitle: 'पृष्ठभूमि पारदर्शिता (ओपेसिटी)',
    opacitySub: 'पारदर्शी ग्लास से ठोस पृष्ठभूमि तक सेट करें',
    accentTitle: 'रंग और हाइलाइट विकल्प',
    accentSub: 'समय और उलटी गिनती के लिए उच्च कंट्रास्ट रंग',
    layoutTitle: 'नमाज़ समय विजेट लेआउट',
    layoutSub: 'चुनें कि होम स्क्रीन पर कौन सा विवरण दिखाई दे',
    showCity: 'शहर का नाम दिखाएं',
    showCitySub: 'वर्तमान या चयनित शहर का नाम दिखाएं',
    showCountdown: 'लाइव उलटी गिनती दिखाएं',
    showCountdownSub: 'अगली नमाज़ तक शेष समय दिखाएं',
    showFullStrip: 'संपूर्ण 5-नमाज़ पट्टी',
    showFullStripSub: 'फ़ज्र से ईशा तक की पूरी पंक्ति दिखाएं',
    fontScaleTitle: 'फ़ॉन्ट आकार स्केल',
    fontScaleSub: 'स्पष्ट पढ़ने के लिए फ़ॉन्ट आकार समायोजित करें',
    applyButton: 'लागू करें और विजेट्स रीफ़्रेश करें',
    syncedToastTitle: 'विजेट्स अपडेट हो गए',
    syncedToastDesc: 'आपके होम स्क्रीन विजेट्स सफलतापूर्वक सिंक हो गए हैं।',
    howToAddTitle: 'होम स्क्रीन पर विजेट कैसे जोड़ें',
    howToAddStep1: 'होम स्क्रीन की खाली जगह पर देर तक दबाए रखें।',
    howToAddStep2: 'दिखने वाले मेनू से "Widgets" पर टैप करें।',
    howToAddStep3: '"Noor Connect" खोजें।',
    howToAddStep4: 'विजेट को दबाकर अपनी होम स्क्रीन पर खींचें।',
    sampleCity: 'मक्का मुकर्रमा',
    nextPrayerLabel: 'अगली नमाज़',
  },
  bn: {
    title: 'হোম স্ক্রিন উইজেটস',
    subtitle: 'স্বচ্ছতা, রঙ এবং লেআউট পরিবর্তন করুন',
    livePreview: 'লাইভ উইজেট প্রিভিউ',
    surfaceStyleTitle: 'উইজেটের ব্যাকগ্রাউন্ড স্টাইল',
    surfaceStyleSub: 'উইজেটের জন্য ব্যাকগ্রাউন্ড বেছে নিন',
    surfaceTheme: 'থিমের সাথে মেলান',
    surfaceOled: 'বিশুদ্ধ কালো (OLED)',
    surfaceFrosted: 'ফ্রস্টেড গ্লাস',
    opacityTitle: 'ব্যাকগ্রাউন্ড অস্বচ্ছতা (Opacity)',
    opacitySub: 'স্বচ্ছ কাচ থেকে সম্পূর্ণ পটভূমি নির্ধারণ করুন',
    accentTitle: 'রঙ ও হাইলাইট প্যালেট',
    accentSub: 'সময় ও কাউন্টডাউনের জন্য স্পষ্ট হাইলাইট রঙ',
    layoutTitle: 'নামাজের সময় উইজেট লেআউট',
    layoutSub: 'হোম স্ক্রিনে কোন তথ্য প্রদর্শিত হবে তা নির্বাচন করুন',
    showCity: 'শহরের নাম দেখান',
    showCitySub: 'বর্তমান বা নির্ধারিত শহরের নাম দেখান',
    showCountdown: 'লাইভ কাউন্টডাউন দেখান',
    showCountdownSub: 'পরবর্তী নামাজ পর্যন্ত বাকি সময় দেখান',
    showFullStrip: 'সম্পূর্ণ ৫ ওয়াক্তের নামাজের সারি',
    showFullStripSub: 'ফজর থেকে এশা পর্যন্ত সম্পূর্ণ নামাজের সময় দেখান',
    fontScaleTitle: 'ফন্ট সাইজ স্কেল',
    fontScaleSub: 'সহজে পড়ার জন্য লেখার আকার পরিবর্তন করুন',
    applyButton: 'প্রয়োগ ও উইজেট রিফ্রেশ করুন',
    syncedToastTitle: 'উইজেট আপডেট হয়েছে',
    syncedToastDesc: 'আপনার হোম স্ক্রিন উইজেট সফলভাবে সিঙ্ক হয়েছে।',
    howToAddTitle: 'হোম স্ক্রিনে উইজেট যুক্ত করার নিয়ম',
    howToAddStep1: 'হোম স্ক্রিনের ফাঁকা জায়গায় চেপে ধরে রাখুন।',
    howToAddStep2: 'মেনু থেকে "Widgets" নির্বাচন করুন।',
    howToAddStep3: '"Noor Connect" খুঁজুন।',
    howToAddStep4: 'পছন্দের উইজেটটি চেপে ধরে হোম স্ক্রিনে টেনে আনুন।',
    sampleCity: 'মক্কা আল-মুকাররমা',
    nextPrayerLabel: 'পরবর্তী নামাজ',
  },
  ru: {
    title: 'Виджеты на главном экране',
    subtitle: 'Настройте прозрачность, цвета и макет',
    livePreview: 'Живой предпросмотр виджета',
    surfaceStyleTitle: 'Стиль фона виджета',
    surfaceStyleSub: 'Выберите визуальный фон для ваших виджетов',
    surfaceTheme: 'В тон теме',
    surfaceOled: 'Чистый OLED (черный)',
    surfaceFrosted: 'Матовое стекло',
    opacityTitle: 'Интенсивность фона (непрозрачность)',
    opacitySub: 'Настройте прозрачность от легкого стекла до сплошного фона',
    accentTitle: 'Цветовые акценты',
    accentSub: 'Контрастные оттенки для времени, отсчета и акцентов',
    layoutTitle: 'Макет виджета времени намаза',
    layoutSub: 'Выберите детали для отображения на экране',
    showCity: 'Показывать город',
    showCitySub: 'Отображать метку текущего города',
    showCountdown: 'Живой обратный отсчет',
    showCountdownSub: 'Показывать время до следующего намаза',
    showFullStrip: 'Полоса всех 5 намазов',
    showFullStripSub: 'Отображать строку от Фаджра до Иша',
    fontScaleTitle: 'Масштаб шрифта',
    fontScaleSub: 'Настройте размер текста для удобного чтения',
    applyButton: 'Применить и обновить виджеты',
    syncedToastTitle: 'Виджеты обновлены',
    syncedToastDesc: 'Виджеты главного экрана успешно синхронизированы.',
    howToAddTitle: 'Как добавить виджет на экран Android',
    howToAddStep1: 'Удерживайте палец на свободном месте экрана.',
    howToAddStep2: 'Нажмите «Виджеты» в появившемся меню.',
    howToAddStep3: 'Найдите в списке «Noor Connect».',
    howToAddStep4: 'Перетащите нужный виджет на свой экран.',
    sampleCity: 'Мекка аль-Мукаррама',
    nextPrayerLabel: 'СЛЕДУЮЩИЙ НАМАЗ',
  },
  fr: {
    title: "Widgets de l'écran d'accueil",
    subtitle: "Personnalisez l'opacité, les couleurs et la disposition",
    livePreview: 'Aperçu en direct du widget',
    surfaceStyleTitle: 'Style de surface du widget',
    surfaceStyleSub: 'Sélectionnez le fond visuel pour vos widgets',
    surfaceTheme: 'Assorti au thème',
    surfaceOled: 'Noir OLED pur',
    surfaceFrosted: 'Verre dépoli',
    opacityTitle: "Intensité de l'arrière-plan (Opacité)",
    opacitySub: 'Ajustez de verre translucide à arrière-plan uni',
    accentTitle: 'Couleurs et accents',
    accentSub: 'Teintes contrastées pour l’heure et le compte à rebours',
    layoutTitle: 'Disposition des heures de prière',
    layoutSub: "Choisissez les détails affichés sur l'écran d'accueil",
    showCity: 'Afficher le nom de la ville',
    showCitySub: 'Afficher la pastille de la ville actuelle',
    showCountdown: 'Compte à rebours en direct',
    showCountdownSub: "Afficher le temps restant jusqu'à la prochaine prière",
    showFullStrip: 'Bande complète des 5 prières',
    showFullStripSub: 'Afficher la rangée complète de Fajr à Isha',
    fontScaleTitle: 'Échelle de police',
    fontScaleSub: 'Ajustez la taille du texte pour une meilleure lisibilité',
    applyButton: 'Appliquer et actualiser les widgets',
    syncedToastTitle: 'Widgets mis à jour',
    syncedToastDesc: "Les widgets de l'écran d'accueil ont été synchronisés.",
    howToAddTitle: "Comment ajouter des widgets sur l'écran d'accueil",
    howToAddStep1: "Appuyez longuement sur un espace vide de l'écran d'accueil.",
    howToAddStep2: 'Appuyez sur "Widgets" dans le menu.',
    howToAddStep3: 'Recherchez "Noor Connect".',
    howToAddStep4: 'Faites glisser le widget souhaité vers votre écran.',
    sampleCity: 'La Mecque al-Mukarramah',
    nextPrayerLabel: 'PROCHAINE PRIÈRE',
  },
};

export function getWidgetCustomizerI18n(lang: string): WidgetCustomizerI18n {
  const code = (lang || 'en').toLowerCase().split('-')[0];
  return WIDGET_I18N[code] || WIDGET_I18N.en;
}
