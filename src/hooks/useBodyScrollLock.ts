import { useEffect } from 'react';

let activeLockCount = 0;
let savedScrollY = 0;

/**
 * Locks document body and html scrolling to prevent background scroll-bleed
 * when modals, dialogs, or sheets are open on mobile & desktop WebViews.
 * Restores exact scroll offset when all active locks are dismissed.
 */
export function lockBodyScroll(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  if (activeLockCount === 0) {
    savedScrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.classList.add('modal-scroll-locked');
  }
  activeLockCount++;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLockCount = Math.max(0, activeLockCount - 1);
    if (activeLockCount === 0) {
      const top = document.body.style.top;
      document.documentElement.style.overflow = '';
      document.documentElement.style.overscrollBehavior = '';

      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.overscrollBehavior = '';
      document.body.style.paddingRight = '';
      document.body.classList.remove('modal-scroll-locked');

      const restoreY = top ? Math.abs(parseInt(top, 10)) : savedScrollY;
      window.scrollTo(0, restoreY);
    }
  };
}

/**
 * Hook to lock body scroll while `isLocked` is true.
 */
export function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    const unlock = lockBodyScroll();
    return () => {
      unlock();
    };
  }, [isLocked]);
}

export default useBodyScrollLock;
