import { useEffect, useState } from 'react';
import { useGlobalRadio } from '@/lib/global-radio';

interface LayoutManagerProps {
  children: React.ReactNode;
}

export function LayoutManager({ children }: LayoutManagerProps) {
  const globalRadio = useGlobalRadio();
  // Fixed padding for bottom nav to prevent CLS
  // The radio player will float over content
  // Increased padding to pb-32 to account for BottomNav AND mini players
  const fixedPadding = 'pb-32';

  return (
    <main
      className="flex-1 min-h-0 overflow-y-auto interactive-layer"
      style={{ paddingBottom: 'calc(120px + var(--tilawah-dock-space, 0px))' }}
      id="main-content"
      role="main"
    >
      {children}
    </main>
  );
}