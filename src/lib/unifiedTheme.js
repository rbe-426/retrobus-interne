// Configurations de style uniformes pour le site (ThemeShowcase style)
export const UNIFIED_THEME = {
  // Spacing
  spacing: {
    headerHeight: { base: "80px", md: "120px" },
    containerPy: { base: 4, md: 6 },
    sectionSpacing: { base: 4, md: 6 },
    cardSpacing: { base: 3, md: 4 }
  },

  // Couleurs
  colors: {
    header: "gray.900",
    headerText: "white",
    headerBorder: "gray.700",
    headerHover: "rbe.500",
    body: "white",
    bodyText: "gray.900",
    headingColor: "black",
    subtitleColor: "gray.600",
    iconColor: "gray.600",
    borderColor: "gray.200",
    darkBorderColor: "gray.700"
  },

  // Typography
  typography: {
    navFontSize: "lg",
    headingSize: "lg",
    subtitleSize: "base",
    bodySize: "sm"
  },

  // Styles réutilisables
  styles: {
    // Header nav items
    navText: {
      fontSize: "lg",
      cursor: "pointer",
      _hover: { color: "rbe.500" },
      transition: "color 0.2s"
    },

    // Section heading
    sectionHeading: {
      color: "black",
      fontWeight: "700",
      mb: 4
    },

    // Card icon
    cardIcon: {
      color: "gray.600",
      boxSize: 6
    },

    // Subtitle text
    subtitleText: {
      color: "gray.600",
      fontSize: "sm"
    }
  }
};

// Export constants pour utilisation facile
export const HEADER_HEIGHT = { base: "80px", md: "120px" };
export const CONTAINER_PY = { base: 4, md: 6 };
export const ICON_COLOR = "gray.600";
export const HEADING_COLOR = "black";
export const BORDER_COLOR = "gray.200";
