/**
 * @file app.config.ts
 * @description PawRoute V2.0 — Master Application Configuration
 *
 * This is the SINGLE SOURCE OF TRUTH for all configurable values:
 * product identity, branding, feature flags, business rules, and defaults.
 *
 * To white-label or rebrand PawRoute:
 *   1. Update `product.*` — name, tagline, support email, website
 *   2. Update `brand.colors.*` — all color tokens propagate to web, admin, and mobile
 *   3. Update `brand.logo.*` — swap asset paths
 *   4. Update `splash.*` — mobile + web loading screen
 *   5. Update `appStore.*` — bundle IDs, app name
 *   6. Update `locale.*` — currency, timezone, language
 *
 * Feature flags in `features.*` can be toggled to enable/disable functionality
 * without changing any component code.
 */

export const appConfig = {
  // ─── Product Identity ────────────────────────────────────────────────────
  product: {
    name: 'PawRoute',
    tagline: 'Book. Groom. Love.',
    shortDescription: 'The easiest way to book pet grooming appointments.',
    longDescription:
      'PawRoute connects pet owners with professional groomers through a seamless digital booking experience. Schedule appointments, manage your pets, and pay securely — all in one place.',
    version: '2.0.0',
    supportEmail: 'support@pawroute.com',
    supportPhone: '',
    website: 'https://pawroute.com',
    privacyPolicyUrl: 'https://pawroute.com/privacy',
    termsOfServiceUrl: 'https://pawroute.com/terms',
    instagramHandle: 'pawroute',
    facebookHandle: 'pawroute',
  },

  // ─── Brand & Design System ───────────────────────────────────────────────
  brand: {
    colors: {
      // ── Core palette (5 brand colors) ──────────────────────────────────
      // #46467A  Dark Purple   — primary brand, nav, headers
      // #7766C6  Medium Purple — secondary actions, links, badges
      // #E0DFFD  Soft Lavender — surface tints, chip backgrounds, input fills
      // #FFC212  Golden Yellow — CTAs, highlights, accent
      // #F98DC3  Soft Pink     — tertiary, promotions, pet-themed highlights

      primary: '#46467A', // Dark Purple
      primaryLight: '#5A5A96', // hover / lighter variant
      primaryDark: '#32325C', // pressed / darker variant

      secondary: '#7766C6', // Medium Purple
      secondaryLight: '#9180D8', // hover
      secondaryDark: '#5C4EB0', // pressed

      accent: '#FFC212', // Golden Yellow — main CTA color
      accentLight: '#FFD04D', // hover
      accentDark: '#CC9A00', // pressed

      lavender: '#E0DFFD', // Soft Lavender — surfaces, chips, tags, fills
      lavenderDark: '#C8C6F7', // slightly darker lavender for borders

      pink: '#F98DC3', // Soft Pink — promotions, highlights, loyalty, pet themes
      pinkLight: '#FBB0D6',
      pinkDark: '#F56AAD',

      // Semantic colors (derived from palette)
      success: '#27AE60',
      successLight: '#D4EDDA',
      warning: '#FFC212', // reuse accent yellow for warnings
      warningLight: '#FFF3CC',
      error: '#E74C3C',
      errorLight: '#F8D7DA',
      info: '#7766C6', // reuse secondary purple for info
      infoLight: '#E0DFFD', // reuse lavender for info background

      // Neutral palette
      background: '#FFFFFF',
      surface: '#FAFAFA',
      surfaceAlt: '#F4F3FC', // lavender-tinted surface — unique to palette
      border: '#E2E1F0', // lavender-tinted border
      borderLight: '#EEECFB',
      divider: '#ECEAF8',

      // Text
      textPrimary: '#2D2B55', // deep purple-tinted dark for brand cohesion
      textSecondary: '#6B6899', // muted purple-grey
      textDisabled: '#B0AECF',
      textInverse: '#FFFFFF',

      // Dark mode overrides
      dark: {
        background: '#16152B',
        surface: '#1E1D36',
        surfaceAlt: '#252345',
        border: '#35325C',
        textPrimary: '#EAE9F8',
        textSecondary: '#9E9CC4',
      },
    },
    typography: {
      fontFamily: 'Inter', // web / admin — loaded via Google Fonts
      fontFamilyMobile: 'Inter_400Regular', // Expo Google Fonts package name
      fontFamilyBold: 'Inter_700Bold',
      fontFamilyMedium: 'Inter_500Medium',
      fontFamilyFallback: 'system-ui, -apple-system, sans-serif',
      baseFontSize: 16, // px
      scale: {
        xs: 12,
        sm: 14,
        base: 16,
        lg: 18,
        xl: 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
        '5xl': 48,
      },
      lineHeight: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    borderRadius: {
      none: 0,
      sm: 4,
      base: 8, // input fields
      md: 12, // buttons
      lg: 16, // cards
      xl: 20, // chips / badges
      full: 9999, // pill / avatar
    },
    spacing: {
      // 4px base grid: xs=4, sm=8, md=12, lg=16, xl=24, 2xl=32, 3xl=48, 4xl=64
      base: 4,
    },
    shadows: {
      sm: '0 1px 3px rgba(0,0,0,0.08)',
      md: '0 4px 12px rgba(0,0,0,0.10)',
      lg: '0 8px 24px rgba(0,0,0,0.12)',
      card: '0 2px 8px rgba(30,58,95,0.08)',
    },
    logo: {
      lightUrl: '/assets/logo-light.png', // on dark backgrounds
      darkUrl: '/assets/logo-dark.png', // on light backgrounds
      iconUrl: '/assets/logo-icon.png', // square icon only
      wordmarkUrl: '/assets/logo-wordmark.png', // text only
      width: 160,
      height: 40,
      iconSize: 40,
    },
  },

  // ─── Splash Screen ───────────────────────────────────────────────────────
  // Used by: Expo (app.json), Next.js loading screen, PWA splash
  splash: {
    backgroundColor: '#46467A', // matches brand.colors.primary
    logoUrl: '/assets/logo-light.png',
    tagline: 'Book. Groom. Love.',
    taglineColor: '#FFFFFF',
    taglineSubtext: 'Professional pet grooming, at your fingertips.',
    taglineSubtextColor: 'rgba(255,255,255,0.75)',
    animationDuration: 2000, // ms — how long to show splash
    // Expo-specific
    imageUrl: '/assets/splash.png', // 1242x2436 recommended
    resizeMode: 'contain' as const,
    // Next.js web loading screen
    showProgressBar: true,
    progressBarColor: '#FFC212', // accent golden yellow
  },

  // ─── App Store / Play Store Metadata ────────────────────────────────────
  appStore: {
    appName: 'PawRoute — Pet Grooming',
    bundleId: 'com.pawroute.app',
    androidPackage: 'com.pawroute.app',
    appStoreId: '', // fill after iOS submission
    playStoreId: 'com.pawroute.app',
    appStoreUrl: '',
    playStoreUrl: '',
    minimumIosVersion: '14.0',
    minimumAndroidSdk: 26, // Android 8.0
    targetAndroidSdk: 34,
    expoSdkVersion: '52',
  },

  // ─── PWA Manifest ────────────────────────────────────────────────────────
  pwa: {
    name: 'PawRoute',
    shortName: 'PawRoute',
    description: 'Book professional pet grooming appointments easily.',
    themeColor: '#46467A',
    backgroundColor: '#46467A',
    display: 'standalone' as const,
    startUrl: '/',
    orientation: 'portrait' as const,
    categories: ['lifestyle', 'shopping'],
    iconSizes: [72, 96, 128, 144, 152, 192, 384, 512],
  },

  // ─── SEO / Open Graph / Meta Tags ────────────────────────────────────────
  seo: {
    defaultTitle: 'PawRoute — Pet Grooming Platform',
    titleTemplate: '%s | PawRoute',
    defaultDescription:
      'Book professional pet grooming appointments online. Easy scheduling, secure payment, real-time updates.',
    keywords: ['pet grooming', 'dog grooming', 'cat grooming', 'pet care', 'grooming appointment'],
    ogImage: '/assets/og-image.png', // 1200x630
    ogImageAlt: 'PawRoute — Book Pet Grooming Appointments',
    twitterHandle: '@pawroute',
    twitterCardType: 'summary_large_image' as const,
    canonicalUrl: 'https://pawroute.com',
    locale: 'en_US',
    siteName: 'PawRoute',
  },

  // ─── Feature Flags ───────────────────────────────────────────────────────
  // Toggle features without changing component code.
  // Phase 2 features are false by default — set to true when ready.
  features: {
    // Auth
    googleSso: true,
    facebookSso: true,
    whatsappOtp: true,
    emailOtp: true,
    biometricAuth: false, // Phase 2 — Expo LocalAuthentication

    // Payments
    cardPayment: true,
    upiPayment: true,
    cashOnArrival: true,
    walletPayment: false, // Phase 2

    // Customer
    darkMode: true,
    aiChatbot: true, // Gemini-powered support chat
    aiBreedDetection: true, // Hugging Face breed detect on pet photo
    galleryModule: true,
    contactSupport: true,

    // Phase 2 features
    loyaltyPoints: false,
    reviews: false,
    referralProgram: false,
    multiLocation: false,
    arabicRtl: false, // RTL layout support

    // Admin
    adminAiInsights: true, // Gemini weekly business summary
    advancedAnalytics: false, // Phase 2

    // Technical
    pwa: true,
    offlineMode: true, // Cache appointment list when offline
    pushNotifications: true,
  },

  // ─── Booking Business Rules ──────────────────────────────────────────────
  // These are CODE defaults. Business owners can override via BusinessSettings in DB.
  booking: {
    cancellationWindowHours: 2, // Cannot cancel within N hours of appointment
    reschedulingWindowHours: 2, // Same as cancellation
    slotHoldMinutes: 10, // Redis TTL: slot locked during payment processing
    maxAdvanceBookingDays: 30, // Cannot book more than N days ahead
    minAdvanceBookingHours: 1, // Must book at least N hours ahead
    bookingRefPrefix: 'PAW', // Generates: PAW-YYYYMMDD-XXXX
    bookingRefLength: 4, // Characters after date in booking ref
    maxPetsPerUser: 10, // Soft cap on pet profiles per customer
    maxAddonsPerBooking: 5, // Max add-ons per appointment
    defaultSlotCapacity: 1, // Default groomer capacity per slot
    allowSameDayBooking: true,
    requirePetForBooking: true,
  },

  // ─── Pet Size Classification ─────────────────────────────────────────────
  // Drives price tier selection and auto-population in booking flow.
  petSizes: [
    { label: 'Small', labelShort: 'S', min: 0, max: 5, key: 'SMALL' as const },
    { label: 'Medium', labelShort: 'M', min: 5.1, max: 15, key: 'MEDIUM' as const },
    { label: 'Large', labelShort: 'L', min: 15.1, max: 30, key: 'LARGE' as const },
    { label: 'Extra Large', labelShort: 'XL', min: 30.1, max: 9999, key: 'XL' as const },
  ],

  // ─── Pet Types ───────────────────────────────────────────────────────────
  petTypes: [
    { label: 'Dog', key: 'DOG' as const, icon: '🐶' },
    { label: 'Cat', key: 'CAT' as const, icon: '🐱' },
  ],

  // ─── Notification Configuration ──────────────────────────────────────────
  notifications: {
    reminderHoursBefore: [24, 2], // Schedule reminders at these intervals
    reviewPromptMinutesAfter: 30, // Push review prompt N min after 'Completed' status
    notificationRetentionDays: 90, // Keep notifications for N days
    maxUnreadBadgeCount: 99, // Cap badge at 99+
    broadcastBatchSize: 500, // FCM tokens per batch
  },

  // ─── Pagination ──────────────────────────────────────────────────────────
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100,
    adminDefaultPageSize: 25,
  },

  // ─── File Upload ─────────────────────────────────────────────────────────
  uploads: {
    maxPhotoSizeMb: 5,
    maxGallerySizeMb: 10,
    allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'] as string[],
    outputFormat: 'webp' as const,
    outputQuality: 80, // 0-100
    thumbnailWidth: 400, // px — used for listing/card views
    fullWidth: 1200, // px — max width for full-size storage
    storageBucketPath: 'pawroute-media',
  },

  // ─── Auth & Security ─────────────────────────────────────────────────────
  auth: {
    accessTokenExpiryMinutes: 15,
    refreshTokenExpiryDays: 30,
    passwordResetExpiryMinutes: 30,
    otpExpiryMinutesEmail: 10,
    otpExpiryMinutesWhatsapp: 5,
    otpResendCooldownSeconds: 60,
    otpLength: 6,
    maxLoginAttempts: 5,
    lockoutMinutes: 15,
    bcryptSaltRounds: 12,
    passwordMinLength: 8,
    passwordHistory: 3, // Cannot reuse last N passwords
    sessionMaxAgeDays: 30,
  },

  // ─── Rate Limiting ────────────────────────────────────────────────────────
  rateLimit: {
    authRequestsPerMinute: 5,
    otpRequestsPerHour: 5, // Per phone number
    userRequestsPerMinute: 100,
    adminRequestsPerMinute: 1000,
    paymentRequestsPerMinute: 20,
    uploadRequestsPerMinute: 10,
  },

  // ─── Currency & Locale ───────────────────────────────────────────────────
  locale: {
    defaultCurrency: 'AED',
    currencySymbol: 'AED',
    currencyPosition: 'before' as const, // 'before' | 'after'
    decimalPlaces: 2,
    defaultLanguage: 'en',
    supportedLanguages: ['en'] as string[], // Add 'ar' in Phase 2 for RTL
    defaultTimezone: 'Asia/Dubai',
    dateFormat: 'DD MMM YYYY', // e.g. "19 Mar 2026"
    timeFormat: 'hh:mm A', // e.g. "10:30 AM"
    datetimeFormat: 'DD MMM YYYY, hh:mm A',
    weekStartsOn: 0 as const, // 0=Sunday, 1=Monday
  },

  // ─── Payment ─────────────────────────────────────────────────────────────
  payment: {
    gateway: 'stripe' as const, // 'stripe' | 'razorpay'
    currency: 'AED', // must match locale.defaultCurrency
    statementDescriptor: 'PAWROUTE', // shown on bank statements (max 22 chars)
    captureMethod: 'automatic' as const, // 'automatic' | 'manual'
    refundWindowDays: 7, // Customer can request refund within N days
    invoicePrefix: 'INV', // INV-2026-001
    vatEnabled: false, // Toggle VAT on invoices
    vatRate: 5, // % — only used if vatEnabled = true
    vatNumber: '', // Business VAT registration number
  },

  // ─── Admin Panel ─────────────────────────────────────────────────────────
  admin: {
    sessionTimeoutMinutes: 60,
    dashboardRefreshSeconds: 30, // Auto-refresh dashboard data
    exportMaxRows: 50000, // Max rows in CSV export
    recentActivityDays: 30, // "Active customers in last N days" KPI
    chartDateRangeDays: 30, // Default date range for charts
  },

  // ─── API ─────────────────────────────────────────────────────────────────
  api: {
    version: 'v1',
    baseUrl: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000',
    timeout: 10000, // ms
    docsEnabled: process.env['NODE_ENV'] !== 'production',
    docsPath: '/docs',
    healthPath: '/health',
    readyPath: '/ready',
  },

  // ─── AI Configuration ────────────────────────────────────────────────────
  ai: {
    chatbot: {
      model: 'gemini-1.5-flash', // Free tier: 15 req/min, 1M tokens/day
      maxTokens: 1024,
      temperature: 0.7,
      systemPrompt:
        'You are a helpful assistant for PawRoute, a pet grooming platform. ' +
        'Answer questions about pet grooming, our services, booking process, and policies. ' +
        'Be friendly, concise, and professional. ' +
        'If you cannot help, direct the user to contact support.',
      maxConversationTurns: 10,
    },
    breedDetection: {
      model: 'google/vit-base-patch16-224',
      confidenceThreshold: 0.5, // Only show suggestion if confidence > threshold
      maxSuggestions: 3,
    },
    weeklyInsights: {
      model: 'gemini-1.5-flash',
      cronSchedule: '0 8 * * 1', // Every Monday at 8 AM (timezone from locale)
      enabled: true,
    },
  },
} as const;

export type AppConfig = typeof appConfig;
export type PetSizeKey = (typeof appConfig.petSizes)[number]['key'];
export type PetTypeKey = (typeof appConfig.petTypes)[number]['key'];
export type PaymentGateway = (typeof appConfig.payment.gateway);
