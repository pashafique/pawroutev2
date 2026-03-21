/**
 * @file theme.ts
 * @description Derives Tailwind CSS tokens and Ant Design theme.token
 * directly from appConfig.brand. Change colors once in app.config.ts;
 * all three apps (web, admin, mobile) update automatically.
 */

import { appConfig } from './app.config.js';

const { colors, typography, borderRadius, spacing, shadows } = appConfig.brand;

// ─── Tailwind CSS Custom Properties ──────────────────────────────────────────
// Used in tailwind.config.ts across apps/web and apps/admin
export const tailwindTheme = {
  extend: {
    colors: {
      primary: {
        DEFAULT: colors.primary,     // #46467A
        light: colors.primaryLight,  // #5A5A96
        dark: colors.primaryDark,    // #32325C
      },
      secondary: {
        DEFAULT: colors.secondary,      // #7766C6
        light: colors.secondaryLight,   // #9180D8
        dark: colors.secondaryDark,     // #5C4EB0
      },
      accent: {
        DEFAULT: colors.accent,     // #FFC212
        light: colors.accentLight,  // #FFD04D
        dark: colors.accentDark,    // #CC9A00
      },
      lavender: {
        DEFAULT: colors.lavender,   // #E0DFFD
        dark: colors.lavenderDark,  // #C8C6F7
      },
      pink: {
        DEFAULT: colors.pink,       // #F98DC3
        light: colors.pinkLight,    // #FBB0D6
        dark: colors.pinkDark,      // #F56AAD
      },
      success: {
        DEFAULT: colors.success,
        light: colors.successLight,
      },
      warning: {
        DEFAULT: colors.warning,
        light: colors.warningLight,
      },
      error: {
        DEFAULT: colors.error,
        light: colors.errorLight,
      },
      surface: colors.surface,
      'surface-alt': colors.surfaceAlt,
      border: colors.border,
      divider: colors.divider,
      'text-primary': colors.textPrimary,
      'text-secondary': colors.textSecondary,
      'text-disabled': colors.textDisabled,
      'text-inverse': colors.textInverse,
    },
    fontFamily: {
      sans: [typography.fontFamily, ...typography.fontFamilyFallback.split(', ')],
    },
    fontSize: Object.fromEntries(
      Object.entries(typography.scale).map(([k, v]) => [k, `${v}px`])
    ),
    borderRadius: {
      none: `${borderRadius.none}px`,
      sm: `${borderRadius.sm}px`,
      DEFAULT: `${borderRadius.base}px`,
      md: `${borderRadius.md}px`,
      lg: `${borderRadius.lg}px`,
      xl: `${borderRadius.xl}px`,
      full: `${borderRadius.full}px`,
    },
    spacing: {
      px: '1px',
      0: '0',
      0.5: `${spacing.base * 0.5}px`,
      1: `${spacing.base}px`,
      1.5: `${spacing.base * 1.5}px`,
      2: `${spacing.base * 2}px`,
      3: `${spacing.base * 3}px`,
      4: `${spacing.base * 4}px`,
      5: `${spacing.base * 5}px`,
      6: `${spacing.base * 6}px`,
      8: `${spacing.base * 8}px`,
      10: `${spacing.base * 10}px`,
      12: `${spacing.base * 12}px`,
      16: `${spacing.base * 16}px`,
    },
    boxShadow: {
      sm: shadows.sm,
      DEFAULT: shadows.md,
      lg: shadows.lg,
      card: shadows.card,
    },
  },
};

// ─── Ant Design Theme Token ───────────────────────────────────────────────────
// Used in apps/admin ConfigProvider
export const antdTheme = {
  token: {
    colorPrimary: colors.primary,       // #46467A
    colorSuccess: colors.success,
    colorWarning: colors.warning,       // #FFC212
    colorError: colors.error,
    colorInfo: colors.secondary,        // #7766C6
    colorTextBase: colors.textPrimary,  // #2D2B55
    colorBgBase: colors.background,
    colorBgContainer: colors.surface,
    colorBorder: colors.border,         // lavender-tinted border
    colorBorderSecondary: colors.borderLight,
    colorFillAlter: colors.surfaceAlt,  // #F4F3FC lavender-tinted alt surface
    borderRadius: borderRadius.base,
    borderRadiusLG: borderRadius.lg,
    borderRadiusSM: borderRadius.sm,
    fontFamily: `${typography.fontFamily}, ${typography.fontFamilyFallback}`,
    fontSize: typography.baseFontSize,
    motionUnit: 0.05,
    wireframe: false,
  },
  components: {
    Button: {
      colorPrimary: colors.primary,           // #46467A
      colorPrimaryHover: colors.primaryLight, // #5A5A96
      borderRadius: borderRadius.md,
      controlHeight: 44,
      paddingContentHorizontal: 20,
      primaryShadow: shadows.md,
    },
    Card: {
      borderRadius: borderRadius.lg,
      boxShadow: shadows.card,
      colorBorderSecondary: colors.borderLight,
    },
    Input: {
      borderRadius: borderRadius.base,
      controlHeight: 44,
      colorBgContainer: colors.surface,
      activeBorderColor: colors.secondary,   // purple focus ring
      hoverBorderColor: colors.secondaryLight,
    },
    Select: {
      borderRadius: borderRadius.base,
      controlHeight: 44,
      optionSelectedBg: colors.lavender,     // lavender highlight
    },
    Table: {
      headerBg: colors.surfaceAlt,           // #F4F3FC
      headerColor: colors.textPrimary,
      rowHoverBg: colors.lavender + '55',    // very subtle lavender hover
      borderColor: colors.borderLight,
    },
    Menu: {
      itemBorderRadius: borderRadius.base,
      itemSelectedBg: colors.lavender,        // #E0DFFD
      itemSelectedColor: colors.primary,      // #46467A
      itemHoverBg: colors.lavender + '80',
      itemHoverColor: colors.primary,
      darkItemBg: colors.primary,
      darkItemSelectedBg: colors.primaryLight,
      darkItemColor: 'rgba(255,255,255,0.85)',
      darkItemSelectedColor: '#FFFFFF',
    },
    Tag: {
      borderRadius: borderRadius.xl,
      defaultColor: colors.secondary,        // #7766C6
      defaultBg: colors.lavender,            // #E0DFFD
    },
    Badge: {
      colorPrimary: colors.accent,           // #FFC212
      colorError: colors.pink,              // #F98DC3 for promo badges
    },
    Layout: {
      siderBg: colors.primary,             // #46467A
      triggerBg: colors.primaryDark,       // #32325C
      headerBg: colors.background,
      headerHeight: 64,
    },
    Statistic: {
      titleFontSize: 13,
      contentFontSize: 28,
      colorTextDescription: colors.textSecondary,
    },
    Progress: {
      defaultColor: colors.secondary,       // #7766C6
      remainingColor: colors.lavender,      // #E0DFFD
    },
    Steps: {
      colorPrimary: colors.secondary,       // #7766C6 for step indicators
      finishIconBorderColor: colors.secondary,
    },
  },
};

// ─── React Native StyleSheet Tokens ──────────────────────────────────────────
// Used in apps/mobile components
export const mobileTheme = {
  colors: {
    ...colors,
  },
  typography: {
    ...typography,
  },
  borderRadius: {
    ...borderRadius,
  },
  spacing: {
    xs: spacing.base, // 4
    sm: spacing.base * 2, // 8
    md: spacing.base * 3, // 12
    lg: spacing.base * 4, // 16
    xl: spacing.base * 6, // 24
    '2xl': spacing.base * 8, // 32
    '3xl': spacing.base * 12, // 48
  },
  shadows: {
    card: {
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    modal: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};

// ─── React Native mobile theme additions ─────────────────────────────────────
// Additional tokens specific to the new palette for mobile
export const mobileThemeExtended = {
  ...mobileTheme,
  // Brand-specific additions
  lavender: colors.lavender,
  lavenderDark: colors.lavenderDark,
  pink: colors.pink,
  pinkLight: colors.pinkLight,
  // Gradient stops for hero/banner elements
  gradients: {
    primary: [colors.primary, colors.secondary],          // purple to medium purple
    accent: [colors.accent, colors.accentLight],           // yellow gradient
    pink: [colors.pink, colors.pinkLight],                 // pink gradient
    surface: [colors.lavender, colors.background],         // soft lavender to white
  },
};

// ─── Status Badge Colors ──────────────────────────────────────────────────────
// Consistent status colors across web, admin, and mobile — tinted with palette
export const statusColors = {
  PENDING: { bg: '#FFF8E0', text: '#8B6200', border: '#FFE099' },    // warm yellow tint
  CONFIRMED: { bg: colors.lavender, text: colors.primary, border: colors.lavenderDark },  // lavender
  IN_PROGRESS: { bg: '#E8E4F8', text: colors.secondaryDark, border: '#C8C2EC' },          // purple tint
  COMPLETED: { bg: '#D4EDDA', text: '#155724', border: '#C3E6CB' },   // green
  CANCELLED: { bg: '#F8D7DA', text: '#721C24', border: '#F5C6CB' },   // red
  NO_SHOW: { bg: colors.surfaceAlt, text: colors.textSecondary, border: colors.border },
  // Bonus: promotional / loyalty badge using pink
  PROMO: { bg: '#FEE8F2', text: '#8B1A4A', border: colors.pinkLight },
} as const;

export type StatusColor = keyof typeof statusColors;
