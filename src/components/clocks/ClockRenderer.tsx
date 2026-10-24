import React from 'react';
import { type ClockStyleId, type ClockProps } from '@/types/clock';
import { DigitalBoldClock } from './DigitalBoldClock';
import { MosqueLedClock } from './MosqueLedClock';
import { CrescentMoonClock } from './CrescentMoonClock';
import { OttomanHeritageClock } from './OttomanHeritageClock';
import { HourWedgeClock } from './HourWedgeClock';
import { PrayerArcClock } from './PrayerArcClock';

export interface ClockRendererProps extends ClockProps {
  styleId: ClockStyleId;
}

export const ClockRenderer: React.FC<ClockRendererProps> = ({ styleId, ...clockProps }) => {
  const sanitizedHijriDate = (clockProps.hijriDate || '')
    .replace(/[\u014d\u014c\u00f4\u00d4]/g, 'ū')
    .replace(/al-ola/gi, 'al-ūlā')
    .replace(/al-ōlā/gi, 'al-ūlā')
    .replace(/ō/g, 'ū');

  const props = { ...clockProps, hijriDate: sanitizedHijriDate };

  switch (styleId) {
    case 'mosque-led':
      return <MosqueLedClock {...props} />;
    case 'crescent-moon':
      return <CrescentMoonClock {...props} />;
    case 'ottoman-heritage':
      return <OttomanHeritageClock {...props} />;
    case 'hour-wedge':
      return <HourWedgeClock {...props} />;
    case 'prayer-arc':
      return <PrayerArcClock {...props} />;
    case 'digital-bold':
    default:
      return <DigitalBoldClock {...props} />;
  }
};

export default ClockRenderer;
