import React from 'react';
import { NoorDynamicLogo, type NoorLogoSize } from './NoorDynamicLogo';

export interface NoorLogoCrestProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
  onClick?: () => void;
}

/**
 * Backward-compatible NoorLogoCrest delegating to the 5-Edition Living Islamic Emblem
 */
export const NoorLogoCrest: React.FC<NoorLogoCrestProps> = ({
  size = 'lg',
  animated = true,
  className = '',
  onClick,
}) => {
  return (
    <NoorDynamicLogo
      size={size as NoorLogoSize}
      animated={animated}
      className={className}
      onClick={onClick}
    />
  );
};

export const MosqueEmblemSVG: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = '',
}) => {
  return <NoorDynamicLogo customSize={size} className={className} animated={false} />;
};

export default NoorLogoCrest;
