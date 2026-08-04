import { memo } from 'react';
import { useCountdown } from '@/hooks/use-countdown';

interface TimeDisplayProps {
  targetTime: Date;
  className?: string;
}

function TimeDisplayComponent({ targetTime, className }: TimeDisplayProps) {
  const countdown = useCountdown(targetTime, 'time-display-countdown');
  
  return (
    <span className={className}>
      {countdown.formattedTime}
    </span>
  );
}

export const TimeDisplay = memo(TimeDisplayComponent);
