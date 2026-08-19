import { useState, useEffect } from 'react';

interface Breakpoint {
  isMobile: boolean;   // < 640px
  isTablet: boolean;   // 640px – 1024px
  isDesktop: boolean;  // > 1024px
  width: number;
}

export const useBreakpoint = (): Breakpoint => {
  const getBreakpoint = (): Breakpoint => {
    const w = window.innerWidth;
    return {
      width: w,
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isDesktop: w >= 1024,
    };
  };

  const [bp, setBp] = useState<Breakpoint>(getBreakpoint);

  useEffect(() => {
    const handler = () => setBp(getBreakpoint());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return bp;
};
