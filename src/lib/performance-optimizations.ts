/**
 * Performance Optimizations for Old Devices (2016+)
 * Focus on maintaining 30+ FPS without changing logic or features
 */

// Detect low-end devices
export const isLowEndDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 2) return true;
  
  // Check device memory (if available)
  // @ts-expect-error - deviceMemory is not in standard TypeScript types
  const memory = navigator.deviceMemory || 4;
  if (memory <= 2) return true;
  
  // Check connection speed
  const connection = (navigator as any).connection;
  if (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')) {
    return true;
  }
  
  return false;
};

// Reduce animations on low-end devices
export const shouldReduceAnimations = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check user preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return true;
  
  // Check device performance
  return isLowEndDevice();
};

// Optimized animation duration based on device performance
export const getAnimationDuration = (defaultDuration: number): number => {
  return shouldReduceAnimations() ? defaultDuration * 0.5 : defaultDuration;
};

// Debounce function for performance
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for performance
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Request animation frame wrapper for smooth animations
export const rafThrottle = <T extends (...args: any[]) => any>(
  func: T
): ((...args: Parameters<T>) => void) => {
  let ticking = false;
  
  return (...args: Parameters<T>) => {
    if (!ticking) {
      requestAnimationFrame(() => {
        func(...args);
        ticking = false;
      });
      ticking = true;
    }
  };
};

// Lazy load images with intersection observer
export const lazyLoadImage = (img: HTMLImageElement, src: string): void => {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  } else {
    // Fallback for older browsers
    img.src = src;
  }
};

// Preload critical resources (images consumed on-page, not manifest-only assets)
export const preloadCriticalResources = (): void => {
    if (typeof window === 'undefined') return;

    // Preload favicon
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'preload';
    faviconLink.href = '/favicon.png';
    faviconLink.as = 'image';
    document.head.appendChild(faviconLink);

    // Preload Qibla image (used in OG tags and potentially in app)
    const qiblaLink = document.createElement('link');
    qiblaLink.rel = 'preload';
    qiblaLink.href = '/qibla.png';
    qiblaLink.as = 'image';
    document.head.appendChild(qiblaLink);

    // Preload key app icons for PWA (likely to be used immediately)
    const iconSizes = [192, 512]; // Medium and large sizes
    for (const size of iconSizes) {
        const iconLink = document.createElement('link');
        iconLink.rel = 'preload';
        iconLink.href = `/icon-${size}x${size}.png`;
        iconLink.as = 'image';
        // Add crossorigin for images if needed (though same-origin)
        document.head.appendChild(iconLink);
    }
};

// Optimize scroll performance
export const optimizeScrollPerformance = (): void => {
  // no-op — previously added a scroll listener that did nothing useful
};

// Reduce memory usage by cleaning up unused objects
export const cleanupMemory = (): void => {
  if (typeof window === 'undefined' || !window.gc) return;
  
  // Trigger garbage collection if available (Chrome dev tools)
  try {
    // @ts-expect-error - window.gc is Chrome DevTools only
    window.gc();
  } catch {
    // Ignore if gc is not available
  }
};

// Monitor FPS performance
export const monitorFPS = (callback: (fps: number) => void): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  
  let frameCount = 0;
  let lastTime = performance.now();
  let animationFrameId: number;
  
  const tick = () => {
    frameCount++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      callback(fps);
      
      frameCount = 0;
      lastTime = currentTime;
    }
    
    animationFrameId = requestAnimationFrame(tick);
  };
  
  animationFrameId = requestAnimationFrame(tick);
  
  return () => cancelAnimationFrame(animationFrameId);
};

// Optimize render performance by batching DOM updates
export const batchDOMUpdates = (updates: Array<() => void>): void => {
  requestAnimationFrame(() => {
    updates.forEach(update => update());
  });
};

// Reduce re-renders by memoizing expensive computations
export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  keyGenerator?: (...args: Parameters<T>) => string
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

// Clear cache when memory is low
export const clearCacheOnMemoryPressure = (): void => {
  if (typeof window === 'undefined') return;
  
  if ('memory' in performance) {
    // @ts-expect-error - performance.memory is non-standard
    const memoryLimit = performance.memory.jsHeapSizeLimit;
    // @ts-expect-error - performance.memory is non-standard
    const usedMemory = performance.memory.usedJSHeapSize;
    
    // Clear cache if using more than 80% of available memory
    if (usedMemory > memoryLimit * 0.8) {
      // Trigger cleanup
      cleanupMemory();
    }
  }
};

// Set performance mode based on device
export const setPerformanceMode = (): 'high' | 'medium' | 'low' => {
  if (isLowEndDevice()) {
    return 'low';
  }
  
  const cores = navigator.hardwareConcurrency || 4;
  if (cores <= 4) {
    return 'medium';
  }
  
  return 'high';
};

// Get performance hints for components
export const getPerformanceHints = () => {
  const mode = setPerformanceMode();
  
  return {
    mode,
    shouldLazyLoad: mode !== 'high',
    shouldReduceAnimations: shouldReduceAnimations(),
    shouldThrottleScroll: mode === 'low',
    shouldDebounceInputs: mode !== 'high',
    maxConcurrentRequests: mode === 'low' ? 2 : mode === 'medium' ? 4 : 6,
  };
};