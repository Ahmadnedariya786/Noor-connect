import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import IslamicStreamPlayer from '@/components/IslamicStreamPlayer';
import { Wifi, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useGlobalQuran } from '@/lib/global-quran';
import { useGlobalNasheed } from '@/lib/global-nasheed';
import { useGlobalRadio } from '@/lib/global-radio';
import { useContentLanguage } from '@/lib/content-translator';
import { ContentLanguageBar } from '@/components/ContentLanguageBar';

const LIVE_STRINGS = {
  en: {
    title: 'Live Transmission',
    subtitle: 'Makkah · Madinah',
    sourcesTitle: 'Live Sources',
    sourcesDesc: 'Live from the Two Holy Mosques — Makkah (Al-Quran Al-Kareem) & Madinah (As-Sunnah). Source: SBA via Globecast/Akamai CDN (HTTPS, global, CORS-enabled).',
    fallbackTitle: 'Auto Fallback',
    fallbackDesc: 'If the primary stream fails, it switches to a secondary source once (Makkah only), then shows a friendly error with Retry.',
    footerTip: 'If a stream fails, tap Retry. Switch locations using the Makkah / Madinah tabs.',
  },
  ur: {
    title: 'براہ راست نشریات',
    subtitle: 'مکہ مکرمہ · مدینہ منورہ',
    sourcesTitle: 'براہ راست ذرائع',
    sourcesDesc: 'حرمین شریفین سے 24/7 براہ راست — مکہ مکرمہ (القرآن الکریم) اور مدینہ منورہ (السنۃ النبویہ)۔ سرکاری ایس بی اے اکامائی براڈکاسٹ۔',
    fallbackTitle: 'خودکار متبادل رابطہ',
    fallbackDesc: 'اگر بنیادی رابطہ منقطع ہو تو فوری طور پر ثانوی لائیو سرور فعال ہوتا ہے، اور باسہولت دوبارہ کوشش کا آپشن ملتا ہے۔',
    footerTip: 'اگر نشریات میں تعطل آئے تو "دوبارہ کوشش کریں" دبائیں۔ مکہ اور مدینہ کے درمیان اوپر دیے گئے بٹن سے سوئچ کریں۔',
  },
  gu: {
    title: 'લાઈવ પ્રસારણ',
    subtitle: 'મક્કા · મદીના',
    sourcesTitle: 'લાઈવ સ્ત્રોત',
    sourcesDesc: 'હરમૈન શરીફૈનથી 24/7 લાઈવ — મક્કા મુકર્રમા (અલ-કુરાન અલ-કરીમ) અને મદીના મુનવ્વરા (અસ-સુન્નહ).',
    fallbackTitle: 'ઓટો ફોલબેક',
    fallbackDesc: 'જો મુખ્ય સ્ટ્રીમમાં સમસ્યા આવે, તો આપમેળે ગૌણ સ્ત્રોત પર સ્વિચ થાય છે અને ફરી પ્રયાસનો વિકલ્પ મળે છે.',
    footerTip: 'જો સ્ટ્રીમમાં અડચણ આવે, તો રીટ્રાય દબાવો. મક્કા / મદીના ટેબથી સ્થાન બદલો.',
  },
  hi: {
    title: 'सीधा प्रसारण',
    subtitle: 'मक्का · मदीना',
    sourcesTitle: 'लाइव स्रोत',
    sourcesDesc: 'हरमैन शरीफ़ैन से 24/7 सीधा प्रसारण — मक्का मुकर्रमा (अल-क़ुरआन) और मदीना मुनव्वरा (अस-सुन्नाह)।',
    fallbackTitle: 'ऑटो फ़ॉलबैक',
    fallbackDesc: 'यदि मुख्य स्ट्रीम बाधित होती है, तो यह तुरंत बैकअप सर्वर से जुड़ती है और पुनः प्रयास का विकल्प देती है।',
    footerTip: 'यदि स्ट्रीम बाधित हो तो पुनः प्रयास करें। मक्का / मदीना टैब से स्थान बदलें।',
  },
};

export default function LiveStreams() {
  const navigate = useNavigate();
  const { isPlaying: isQuranPlaying, pause: pauseQuran } = useGlobalQuran();
  const { isPlaying: isNasheedPlaying, pause: pauseNasheed } = useGlobalNasheed();
  const { isPlaying: isRadioPlaying, stopRadio } = useGlobalRadio();
  const { contentLang, isRtl } = useContentLanguage();

  const strings = LIVE_STRINGS[contentLang] || LIVE_STRINGS.en;

  useEffect(() => {
    if (isQuranPlaying) pauseQuran();
    if (isNasheedPlaying) pauseNasheed();
    if (isRadioPlaying) stopRadio();
  }, []);

  return (
    <div className="min-h-screen bg-background safe-top" style={{ paddingTop: 'calc(var(--safe-top) + 12px)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">

        {/* Page Header */}
        <div className={`flex items-center gap-3 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="rounded-full">
            <ArrowLeft className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
          </Button>
          <div className="flex-1">
            <h1 className={`text-2xl font-black text-foreground tracking-tight ${contentLang === 'ur' ? 'font-urdu' : ''}`}>
              {strings.title}
            </h1>
            <p className={`text-xs font-bold text-muted-foreground uppercase tracking-widest ${contentLang === 'ur' ? 'font-urdu text-[13px]' : ''}`}>
              {strings.subtitle}
            </p>
          </div>
        </div>

        {/* 4-Language Selector Bar */}
        <ContentLanguageBar fullWidth />

        {/* Player */}
        <IslamicStreamPlayer />

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className={`w-8 h-8 rounded-xl bg-[var(--accent-soft)] flex items-center justify-center ${isRtl ? 'ml-auto' : ''}`}>
              <Wifi className="w-4 h-4 text-[var(--accent)]" />
            </div>
            <p className={`text-xs font-bold text-foreground ${contentLang === 'ur' ? 'font-urdu text-sm' : ''}`}>
              {strings.sourcesTitle}
            </p>
            <p className={`text-xs text-muted-foreground leading-relaxed ${contentLang === 'ur' ? 'font-urdu text-[13px] leading-[2.1]' : ''}`}>
              {strings.sourcesDesc}
            </p>
          </div>

          <div className={`rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-2 ${isRtl ? 'text-right' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className={`w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center ${isRtl ? 'ml-auto' : ''}`}>
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <p className={`text-xs font-bold text-foreground ${contentLang === 'ur' ? 'font-urdu text-sm' : ''}`}>
              {strings.fallbackTitle}
            </p>
            <p className={`text-xs text-muted-foreground leading-relaxed ${contentLang === 'ur' ? 'font-urdu text-[13px] leading-[2.1]' : ''}`}>
              {strings.fallbackDesc}
            </p>
          </div>
        </div>

        <p className={`text-center text-xs text-muted-foreground/60 leading-relaxed ${contentLang === 'ur' ? 'font-urdu text-sm' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>
          {strings.footerTip}
        </p>

      </div>
    </div>
  );
}
