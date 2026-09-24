/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                        AURORA DESIGN SYSTEM                               ║
 * ║              Fluid • Immersive • Ambient Intelligence                     ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * Philosophy: "Flow State" — organic shapes, ambient depth, 
 * smooth gradients that breathe, immersive full-screen experiences
 * 
 * Visual Metaphor: Northern Lights / Cosmic Energy
 * - Deep space backgrounds with subtle aurora gradients
 * - Floating, breathing UI elements
 * - Soft glows instead of hard shadows
 * - Organic curves and fluid animations
 * - Layered depth with glassmorphism
 */

import { Platform, ViewStyle, TextStyle, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════════════════════
// AURORA DESIGN TOKENS
// ═══════════════════════════════════════════════════════════════════════════

export const Theme = {
  // ─────────────────────────────────────────────────────────────────────────
  // COLOR PALETTE — Deep Space + Aurora Accents
  // ─────────────────────────────────────────────────────────────────────────
  
  // Background hierarchy (Cosmic depth)
  background: {
    pure: '#030014',           // Deep void - true black with purple tint
    primary: '#0A0A1A',        // Space blue - main canvas
    secondary: '#0F0F24',      // Nebula layer - sections
    tertiary: '#141432',       // Stardust - cards base
    elevated: '#1A1A40',       // Floating elements
    card: '#12122B',           // Card surfaces
    muted: '#1E1E42',          // Muted backgrounds
    overlay: 'rgba(3, 0, 20, 0.92)', // Modal overlay
    
    // Glassmorphism (aurora reflection)
    glass: 'rgba(20, 20, 50, 0.7)',
    glassLight: 'rgba(30, 30, 66, 0.5)',
    glassSubtle: 'rgba(138, 120, 255, 0.03)',
    glassFrosted: 'rgba(10, 10, 26, 0.85)',
  },
  
  // Primary Accent — Aurora Violet (mystical, calming, intelligent)
  accent: {
    primary: '#8B5CF6',        // Violet-500 — main accent
    primaryLight: '#A78BFA',   // Violet-400 
    primaryDark: '#7C3AED',    // Violet-600
    primaryMuted: '#2E1065',   // Violet-950 — subtle backgrounds
    primaryGlow: 'rgba(139, 92, 246, 0.35)',
    primarySoft: 'rgba(139, 92, 246, 0.15)',
    
    // Secondary accent — Cyan (energy, flow)
    secondary: '#06B6D4',      // Cyan-500
    secondaryLight: '#22D3EE', // Cyan-400
    secondaryMuted: 'rgba(6, 182, 212, 0.2)',
    
    // Tertiary — Rose (warmth, human touch)
    tertiary: '#EC4899',       // Pink-500
    tertiaryLight: '#F472B6',  // Pink-400
    tertiaryMuted: 'rgba(236, 72, 153, 0.15)',
    
    // Gradient pairs (Aurora spectrum)
    gradient: ['#8B5CF6', '#6366F1'] as const,
    gradientVibrant: ['#A78BFA', '#8B5CF6'] as const,
    gradientCyan: ['#06B6D4', '#0EA5E9'] as const,
    gradientAurora: ['#8B5CF6', '#06B6D4', '#10B981'] as const,
    gradientWarm: ['#EC4899', '#8B5CF6'] as const,
    gradientSubtle: ['rgba(139, 92, 246, 0.25)', 'rgba(99, 102, 241, 0.1)'] as const,
  },
  
  // Typography colors
  text: {
    primary: '#F8FAFC',        // Slate-50 — crisp white
    secondary: '#94A3B8',      // Slate-400 — secondary text
    tertiary: '#64748B',       // Slate-500 — muted/hint text
    muted: '#475569',          // Slate-600 — very muted
    accent: '#A78BFA',         // Violet accent text
    accentSecondary: '#22D3EE',// Cyan accent
    inverse: '#0A0A1A',        // Text on light backgrounds
    disabled: '#334155',       // Disabled text
    glow: '#C4B5FD',           // Glowing text effect
  },
  
  // Border colors
  border: {
    default: 'rgba(139, 92, 246, 0.12)', // Subtle violet tint
    primary: 'rgba(148, 163, 184, 0.12)',
    subtle: 'rgba(255, 255, 255, 0.04)',
    medium: 'rgba(139, 92, 246, 0.25)',
    accent: 'rgba(139, 92, 246, 0.4)',
    accentStrong: 'rgba(139, 92, 246, 0.6)',
    focus: '#8B5CF6',          // Focus states
    glass: 'rgba(255, 255, 255, 0.06)',
    aurora: 'rgba(6, 182, 212, 0.3)',
  },
  
  // Status colors — Semantic with aurora tint
  status: {
    success: '#10B981',        // Emerald-500
    successBg: 'rgba(16, 185, 129, 0.12)',
    successBorder: 'rgba(16, 185, 129, 0.3)',
    
    warning: '#F59E0B',        // Amber-500
    warningBg: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.3)',
    
    error: '#F43F5E',          // Rose-500
    errorBg: 'rgba(244, 63, 94, 0.12)',
    errorBorder: 'rgba(244, 63, 94, 0.3)',
    
    info: '#3B82F6',           // Blue-500
    infoBg: 'rgba(59, 130, 246, 0.12)',
    infoBorder: 'rgba(59, 130, 246, 0.3)',
    
    ai: '#8B5CF6',             // AI/Assistant indicator
    aiBg: 'rgba(139, 92, 246, 0.12)',
    aiBorder: 'rgba(139, 92, 246, 0.3)',
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ELEVATION & GLOWS (No hard shadows - soft ambient light)
  // ─────────────────────────────────────────────────────────────────────────
  
  shadow: {
    // Soft ambient shadows
    xs: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    sm: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    md: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
    lg: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.25,
      shadowRadius: 24,
      elevation: 12,
    },
    xl: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.3,
      shadowRadius: 32,
      elevation: 16,
    },
    
    // Aurora glow effects
    glow: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    glowStrong: {
      shadowColor: '#8B5CF6',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 30,
      elevation: 15,
    },
    glowCyan: {
      shadowColor: '#06B6D4',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
    glowWarm: {
      shadowColor: '#EC4899',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // SPACING SYSTEM — Generous, breathing space
  // ─────────────────────────────────────────────────────────────────────────
  
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
    huge: 64,
    massive: 96,
    
    // Semantic spacing (generous for immersive feel)
    gutter: 24,              // Page side padding
    cardPadding: 24,         // Inside cards
    sectionGap: 40,          // Between sections
    itemGap: 16,             // Between list items
    breathe: 20,             // Extra breathing room
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // BORDER RADIUS — Organic, flowing curves
  // ─────────────────────────────────────────────────────────────────────────
  
  radius: {
    none: 0,
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    xxl: 36,
    xxxl: 48,
    full: 9999,
    
    // Semantic (larger = more organic)
    button: 14,
    buttonLg: 20,
    card: 24,
    cardLg: 32,
    modal: 32,
    input: 14,
    pill: 100,
    orb: 9999,               // Perfect circles for AI orb
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // TYPOGRAPHY — Clean, spacious, readable
  // ─────────────────────────────────────────────────────────────────────────
  
  typography: {
    // Font families
    family: {
      regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
      medium: Platform.select({ ios: 'System', android: 'Roboto-Medium', default: 'System' }),
      semibold: Platform.select({ ios: 'System', android: 'Roboto-Medium', default: 'System' }),
      bold: Platform.select({ ios: 'System', android: 'Roboto-Bold', default: 'System' }),
      mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    },
    
    // Type scale (slightly larger for readability)
    size: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 17,
      lg: 19,
      xl: 22,
      xxl: 26,
      xxxl: 32,
      display: 40,
      hero: 52,
      mega: 64,
    },
    
    // Line height multipliers
    lineHeight: {
      tight: 1.15,
      snug: 1.3,
      normal: 1.5,
      relaxed: 1.65,
      loose: 2,
    },
    
    // Letter spacing
    tracking: {
      tighter: -0.5,
      tight: -0.25,
      normal: 0,
      wide: 0.5,
      wider: 1,
      widest: 2,
    },
    
    // Font weights
    weight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      extrabold: '800' as const,
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // ANIMATION — Fluid, organic motion
  // ─────────────────────────────────────────────────────────────────────────
  
  animation: {
    // Durations (slightly longer for fluid feel)
    instant: 100,
    fast: 180,
    normal: 300,
    slow: 450,
    slower: 600,
    breathing: 2000,         // For ambient breathing effects
    aurora: 4000,            // Slow aurora gradient shifts
    
    // Spring configs (for react-native-reanimated)
    spring: {
      snappy: { damping: 18, stiffness: 350 },
      gentle: { damping: 25, stiffness: 150 },
      bouncy: { damping: 12, stiffness: 120 },
      fluid: { damping: 30, stiffness: 100 },
    },
    
    // Easing curves
    easing: {
      smooth: 'easeInOut',
      enter: 'easeOut',
      exit: 'easeIn',
    },
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // GRADIENTS — Aurora-inspired, multi-tone
  // ─────────────────────────────────────────────────────────────────────────
  
  gradients: {
    // Background gradients (cosmic depth)
    backgroundDeep: ['#030014', '#0A0A1A', '#0F0F24'] as const,
    backgroundMain: ['#0A0A1A', '#0F0F24'] as const,
    backgroundSubtle: ['#0F0F24', '#141432'] as const,
    
    // Surface gradients  
    card: ['#12122B', '#0F0F24'] as const,
    cardElevated: ['#1A1A40', '#141432'] as const,
    glass: ['rgba(20, 20, 50, 0.8)', 'rgba(15, 15, 36, 0.6)'] as const,
    
    // Aurora accent gradients
    aurora: ['#8B5CF6', '#6366F1', '#06B6D4'] as const,
    auroraFull: ['#EC4899', '#8B5CF6', '#06B6D4', '#10B981'] as const,
    auroraSubtle: ['rgba(139, 92, 246, 0.3)', 'rgba(6, 182, 212, 0.15)', 'rgba(16, 185, 129, 0.1)'] as const,
    
    // Button gradients
    accentButton: ['#8B5CF6', '#7C3AED'] as const,
    accentButtonHover: ['#A78BFA', '#8B5CF6'] as const,
    secondaryButton: ['rgba(139, 92, 246, 0.2)', 'rgba(99, 102, 241, 0.1)'] as const,
    
    // Legacy compatibility
    accent: ['#8B5CF6', '#7C3AED'] as const,
    mixedButton: ['#8B5CF6', '#7C3AED'] as const,
    
    // Shine/shimmer effects
    shimmer: ['transparent', 'rgba(255, 255, 255, 0.08)', 'transparent'] as const,
    
    // Radial for orb effects
    orbCenter: ['#A78BFA', '#8B5CF6', '#6366F1'] as const,
    orbGlow: ['rgba(139, 92, 246, 0.6)', 'rgba(99, 102, 241, 0.3)', 'transparent'] as const,
  },
  
  // Screen dimensions
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  
  // Glow effects (legacy + new)
  glow: {
    purple: 'rgba(139, 92, 246, 0.5)',
    purpleStrong: 'rgba(139, 92, 246, 0.75)',
    cyan: 'rgba(6, 182, 212, 0.5)',
    cyanStrong: 'rgba(6, 182, 212, 0.75)',
    pink: 'rgba(236, 72, 153, 0.5)',
    pinkStrong: 'rgba(236, 72, 153, 0.75)',
    ambient: 'rgba(139, 92, 246, 0.25)',
    auroraAmbient: 'rgba(99, 102, 241, 0.2)',
  },
  
  // Glass effects
  glass: {
    background: 'rgba(20, 20, 50, 0.75)',
    backgroundLight: 'rgba(30, 30, 66, 0.5)',
    backgroundDark: 'rgba(10, 10, 26, 0.9)',
    border: 'rgba(139, 92, 246, 0.15)',
    borderLight: 'rgba(255, 255, 255, 0.06)',
    blur: 25,
    blurStrong: 40,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════

export const Colors = {
  light: {
    text: Theme.text.primary,
    background: Theme.background.primary,
    tint: Theme.accent.primary,
    icon: Theme.text.secondary,
    tabIconDefault: Theme.text.tertiary,
    tabIconSelected: Theme.accent.primary,
  },
  dark: {
    text: Theme.text.primary,
    background: Theme.background.primary,
    tint: Theme.accent.primary,
    icon: Theme.text.secondary,
    tabIconDefault: Theme.text.tertiary,
    tabIconSelected: Theme.accent.primary,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT STYLES — Pre-built AURORA patterns
// ═══════════════════════════════════════════════════════════════════════════

export const CommonStyles = {
  // ─────────────────────────────────────────────────────────────────────────
  // CARDS — Floating, glassmorphic
  // ─────────────────────────────────────────────────────────────────────────
  
  card: {
    backgroundColor: Theme.background.card,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.default,
  } as ViewStyle,
  
  cardElevated: {
    backgroundColor: Theme.background.elevated,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.medium,
    ...Theme.shadow.md,
  } as ViewStyle,
  
  glassCard: {
    backgroundColor: Theme.glass.background,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.glass.border,
    overflow: 'hidden' as const,
  } as ViewStyle,
  
  floatingCard: {
    backgroundColor: Theme.background.elevated,
    borderRadius: Theme.radius.cardLg,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.accent,
    ...Theme.shadow.lg,
  } as ViewStyle,
  
  elevatedCard: {
    backgroundColor: Theme.background.elevated,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.border.default,
    ...Theme.shadow.lg,
  } as ViewStyle,
  
  cardInteractive: {
    backgroundColor: Theme.background.card,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1,
    borderColor: Theme.border.default,
    ...Theme.shadow.sm,
  } as ViewStyle,
  
  cardAccent: {
    backgroundColor: Theme.background.card,
    borderRadius: Theme.radius.card,
    padding: Theme.spacing.cardPadding,
    borderWidth: 1.5,
    borderColor: Theme.border.accent,
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // BUTTONS — Fluid, glowing
  // ─────────────────────────────────────────────────────────────────────────
  
  buttonPrimary: {
    backgroundColor: Theme.accent.primary,
    borderRadius: Theme.radius.button,
    paddingVertical: Theme.spacing.md + 2,
    paddingHorizontal: Theme.spacing.xl,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  buttonSecondary: {
    backgroundColor: Theme.accent.primarySoft,
    borderRadius: Theme.radius.button,
    paddingVertical: Theme.spacing.md + 2,
    paddingHorizontal: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.border.accent,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  buttonGhost: {
    backgroundColor: 'transparent',
    borderRadius: Theme.radius.button,
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  buttonIcon: {
    width: 52,
    height: 52,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.background.elevated,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Theme.border.default,
    ...Theme.shadow.sm,
  } as ViewStyle,
  
  buttonIconGlow: {
    width: 56,
    height: 56,
    borderRadius: Theme.radius.full,
    backgroundColor: Theme.accent.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  // Legacy aliases
  accentButton: {
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  pinkButton: {
    ...Theme.shadow.glowWarm,
  } as ViewStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // INPUTS — Soft, elegant
  // ─────────────────────────────────────────────────────────────────────────
  
  input: {
    backgroundColor: Theme.background.tertiary,
    borderRadius: Theme.radius.input,
    paddingVertical: Theme.spacing.md + 2,
    paddingHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.border.default,
    color: Theme.text.primary,
    fontSize: Theme.typography.size.base,
  } as ViewStyle & TextStyle,
  
  inputFocused: {
    borderColor: Theme.accent.primary,
    ...Theme.shadow.xs,
  } as ViewStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // TEXT STYLES — Clear hierarchy
  // ─────────────────────────────────────────────────────────────────────────
  
  textHero: {
    fontSize: Theme.typography.size.hero,
    fontWeight: Theme.typography.weight.bold,
    color: Theme.text.primary,
    letterSpacing: Theme.typography.tracking.tight,
    lineHeight: Theme.typography.size.hero * Theme.typography.lineHeight.tight,
  } as TextStyle,
  
  textDisplay: {
    fontSize: Theme.typography.size.display,
    fontWeight: Theme.typography.weight.bold,
    color: Theme.text.primary,
    letterSpacing: Theme.typography.tracking.tight,
  } as TextStyle,
  
  textTitle: {
    fontSize: Theme.typography.size.xxl,
    fontWeight: Theme.typography.weight.semibold,
    color: Theme.text.primary,
  } as TextStyle,
  
  textHeading: {
    fontSize: Theme.typography.size.xl,
    fontWeight: Theme.typography.weight.semibold,
    color: Theme.text.primary,
  } as TextStyle,
  
  textSubtitle: {
    fontSize: Theme.typography.size.lg,
    fontWeight: Theme.typography.weight.medium,
    color: Theme.text.secondary,
  } as TextStyle,
  
  textBody: {
    fontSize: Theme.typography.size.base,
    fontWeight: Theme.typography.weight.regular,
    color: Theme.text.primary,
    lineHeight: Theme.typography.size.base * Theme.typography.lineHeight.normal,
  } as TextStyle,
  
  textCaption: {
    fontSize: Theme.typography.size.sm,
    fontWeight: Theme.typography.weight.regular,
    color: Theme.text.tertiary,
  } as TextStyle,
  
  textLabel: {
    fontSize: Theme.typography.size.xs,
    fontWeight: Theme.typography.weight.medium,
    color: Theme.text.secondary,
    textTransform: 'uppercase' as const,
    letterSpacing: Theme.typography.tracking.wider,
  } as TextStyle,
  
  textAccent: {
    color: Theme.text.accent,
  } as TextStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONTAINERS — Full-screen immersive
  // ─────────────────────────────────────────────────────────────────────────
  
  screenContainer: {
    flex: 1,
    backgroundColor: Theme.background.primary,
  } as ViewStyle,
  
  contentContainer: {
    flex: 1,
    paddingHorizontal: Theme.spacing.gutter,
  } as ViewStyle,
  
  centeredContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,
  
  // ─────────────────────────────────────────────────────────────────────────
  // SPECIAL ELEMENTS — Aurora-specific
  // ─────────────────────────────────────────────────────────────────────────
  
  orb: {
    width: 120,
    height: 120,
    borderRadius: Theme.radius.orb,
    backgroundColor: Theme.accent.primary,
    ...Theme.shadow.glowStrong,
  } as ViewStyle,
  
  orbSmall: {
    width: 64,
    height: 64,
    borderRadius: Theme.radius.orb,
    backgroundColor: Theme.accent.primary,
    ...Theme.shadow.glow,
  } as ViewStyle,
  
  divider: {
    height: 1,
    backgroundColor: Theme.border.subtle,
    marginVertical: Theme.spacing.lg,
  } as ViewStyle,
  
  badge: {
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.accent.primarySoft,
    borderWidth: 1,
    borderColor: Theme.border.accent,
  } as ViewStyle,
  
  pill: {
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.xs + 2,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.background.tertiary,
    borderWidth: 1,
    borderColor: Theme.border.default,
  } as ViewStyle,
};

export default Theme;
