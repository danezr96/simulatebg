// src/config/ui.ts

/**
 * UI config for the "Japandi + blue accents" design system.
 * Keep this file as the single source of truth for:
 * - theme tokens (radii, spacing, shadows)
 * - motion timings
 * - page transitions
 * - chart defaults
 *
 * Tailwind usage:
 * - Use these tokens via inline styles / class composition where needed.
 * - If you later want these as Tailwind theme vars, mirror them in tailwind.config.
 */

export type UiThemeMode = "light" | "dark" | "system";

export type AccentName = "blue";

export const UI = {
  app: {
    name: "SimulateBG",
    defaultMode: "system" as UiThemeMode,
    defaultAccent: "blue" as AccentName,
  },

  // Japandi = calm neutrals + natural contrast + lots of whitespace
  // with a restrained blue accent for interactivity and highlights.
  colors: {
    // Neutral surfaces (prefer using Tailwind neutrals and these as references)
    surface: {
      base: "#0B0F14", // deep ink (dark)
      card: "#0F1520",
      glass: "rgba(255, 255, 255, 0.06)",
      border: "rgba(255, 255, 255, 0.10)",
    },
    text: {
      primary: "rgba(255,255,255,0.92)",
      secondary: "rgba(255,255,255,0.68)",
      muted: "rgba(255,255,255,0.52)",
      inverse: "#0B0F14",
    },
    accent: {
      blue: {
        50: "#EAF2FF",
        100: "#D6E6FF",
        200: "#ADCDFF",
        300: "#84B4FF",
        400: "#5B9BFF",
        500: "#2D79FF", // primary accent
        600: "#1F5FE0",
        700: "#1648B0",
        800: "#103482",
        900: "#0A2258",
        glow: "rgba(45, 121, 255, 0.35)",
      },
    },
    status: {
      success: "rgba(34,197,94,1)",
      warning: "rgba(245,158,11,1)",
      danger: "rgba(239,68,68,1)",
      info: "rgba(59,130,246,1)",
    },
  },

  layout: {
    // max content width for dashboards
    maxWidth: 1240,
    // corner style: Japandi = soft, not overly bubbly
    radius: {
      sm: 12,
      md: 18,
      lg: 24,
      xl: 32,
    },
    // spacing scale for consistent padding/margins
    space: {
      xs: 8,
      sm: 12,
      md: 16,
      lg: 24,
      xl: 32,
      "2xl": 48,
    },
  },

  typography: {
    // If you later add fonts via CSS, you can reference them here.
    // For now, keep it neutral and modern.
    font: {
      ui: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    },
    size: {
      xs: 12,
      sm: 13,
      base: 14,
      md: 16,
      lg: 18,
      xl: 22,
      "2xl": 28,
      "3xl": 36,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.45,
      relaxed: 1.7,
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },

  // Motion: subtle, “premium UI” transitions
  motion: {
    durations: {
      fast: 0.16,
      normal: 0.24,
      slow: 0.38,
    },
    easing: {
      // Framer Motion compatible cubic-bezier arrays
      smooth: [0.22, 1, 0.36, 1] as const, // easeOutCubic-ish
      snappy: [0.2, 0.9, 0.2, 1] as const,
    },
    transitions: {
      page: {
        initial: { opacity: 0, y: 8, filter: "blur(6px)" },
        animate: { opacity: 1, y: 0, filter: "blur(0px)" },
        exit: { opacity: 0, y: -6, filter: "blur(6px)" },
      },
      panel: {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.98 },
      },
    },
  },

  // Shadows: restrained, layered (no harsh drops)
  shadow: {
    sm: "0 1px 0 rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.35)",
    md: "0 1px 0 rgba(255,255,255,0.06), 0 18px 50px rgba(0,0,0,0.45)",
    lg: "0 1px 0 rgba(255,255,255,0.07), 0 28px 70px rgba(0,0,0,0.55)",
    glowBlue: "0 0 0 1px rgba(45,121,255,0.25), 0 18px 60px rgba(45,121,255,0.18)",
  },

  // Backgrounds / gradients for “advanced opmaak met overgangen”
  backgrounds: {
    appGradient:
      "radial-gradient(1200px 700px at 20% 10%, rgba(45,121,255,0.16), rgba(0,0,0,0)), radial-gradient(900px 600px at 80% 30%, rgba(255,255,255,0.06), rgba(0,0,0,0)), linear-gradient(180deg, #070A0F 0%, #0B0F14 100%)",
    cardGradient:
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
    divider:
      "linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(45,121,255,0.18) 50%, rgba(255,255,255,0.06) 100%)",
  },

  // Recharts defaults (keep neutral; series colors can be derived elsewhere)
  charts: {
    gridOpacity: 0.12,
    axisOpacity: 0.5,
    tooltip: {
      glass: true,
      radius: 14,
    },
  },

  // UI behavior defaults
  behavior: {
    currency: "EUR",
    numberFormatLocale: "nl-NL",
    defaultToastDurationMs: 2800,
    optimisticUi: true,
  },
} as const;

export type UiConfig = {
  brand?: { appName: string };
};

export const UI_CONFIG: UiConfig = {
  brand: { appName: "SimulateBG" },
};
