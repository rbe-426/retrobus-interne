// hooks/useResponsive.js
import { useMediaQuery } from '@chakra-ui/react';

/**
 * Hook personnalisé pour détecter le type d'appareil
 * @returns {Object} { isMobile, isTablet, isDesktop }
 * - isMobile: <= 768px
 * - isTablet: 769px - 1440px
 * - isDesktop: > 1440px
 */
export function useResponsive() {
  const [isMobile] = useMediaQuery('(max-width: 768px)');
  const [isTablet] = useMediaQuery('(min-width: 769px) and (max-width: 1440px)');
  const [isDesktop] = useMediaQuery('(min-width: 1441px)');

  return {
    isMobile,
    isTablet,
    isDesktop,
    // Helper: tout sauf desktop
    isMobileOrTablet: isMobile || isTablet,
    // Helper: tout sauf mobile
    isTabletOrDesktop: isTablet || isDesktop
  };
}
