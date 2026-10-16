import React from 'react';
import { type ClockStyleId, type ClockProps } from '@/types/clock';
import { DigitalBoldClock } from './DigitalBoldClock';
import { MosqueLedClock } from './MosqueLedClock';
import { CrescentMoonClock } from './CrescentMoonClock';
import { OttomanHeritageClock } from './OttomanHeritageClock';
import { ReactorRingClock } from './ReactorRingClock';
import { PrayerArcClock } from './PrayerArcClock';

export interface ClockRendererProps extends ClockProps {
  styleId: ClockStyleId;
}

export const ClockRenderer: React.FC<ClockRendererProps> = ({ styleId, ...clockProps }) => {
  switch (styleId) {
    case 'mosque-led':
      return <MosqueLedClock {...clockProps} />;
    case 'crescent-moon':
      return <CrescentMoonClock {...clockProps} />;
    case 'ottoman-heritage':
      return <OttomanHeritageClock {...clockProps} />;
    case 'reactor-ring':
      return <ReactorRingClock {...clockProps} />;
    case 'prayer-arc':
      return <PrayerArcClock {...clockProps} />;
    case 'digital-bold':
    default:
      return <DigitalBoldClock {...clockProps} />;
  }
};

export default ClockRenderer;
