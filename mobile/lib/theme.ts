// Design tokens — "Utility" kit from the Claude Design handoff.
// One UI, three user-selectable themes (violet / lime / mono); everything
// neutral is shared, only the accent token set changes.

export type ThemeName = "violet" | "lime" | "mono";

export interface AccentTokens {
  /** Fills: chips, nav bar, progress, CTA, avatar dot */
  accent: string;
  /** Text/icons on accent */
  onAccent: string;
  /** Accent-colored text on white: links, countdowns */
  accentText: string;
  /** Bottom-nav inactive icons (on accent bar) */
  navInactive: string;
  /** Welcome/splash background */
  welcomeBg: string;
  /** Welcome ink (text, logo, barcode art) */
  welcomeInk: string;
  welcomeBtnBg: string;
  welcomeBtnText: string;
  /** Accent chip rendered ON an ink surface (mono's black-on-black fix) */
  accentOnInkBg: string;
  accentOnInkText: string;
  /** Light tint of accent readable on ink (e.g. "412 days left") */
  tintOnInk: string;
}

export const THEMES: Record<ThemeName, AccentTokens> = {
  violet: {
    accent: "#7361F2",
    onAccent: "#FFFFFF",
    accentText: "#7361F2",
    navInactive: "#FFFFFF",
    welcomeBg: "#7361F2",
    welcomeInk: "#FFFFFF",
    welcomeBtnBg: "#FFFFFF",
    welcomeBtnText: "#0B0B0B",
    accentOnInkBg: "#7361F2",
    accentOnInkText: "#FFFFFF",
    tintOnInk: "#CBBFFF",
  },
  lime: {
    accent: "#BEF264",
    onAccent: "#131118",
    accentText: "#557A0D",
    navInactive: "#0B0B0B",
    welcomeBg: "#BEF264",
    welcomeInk: "#0B0B0B",
    welcomeBtnBg: "#FFFFFF",
    welcomeBtnText: "#0B0B0B",
    accentOnInkBg: "#BEF264",
    accentOnInkText: "#131118",
    tintOnInk: "#D9F99D",
  },
  mono: {
    accent: "#0B0B0B",
    onAccent: "#FFFFFF",
    accentText: "#17150F",
    navInactive: "#FFFFFF",
    welcomeBg: "#FFFFFF",
    welcomeInk: "#0B0B0B",
    welcomeBtnBg: "#0B0B0B",
    welcomeBtnText: "#FFFFFF",
    accentOnInkBg: "#FFFFFF",
    accentOnInkText: "#0B0B0B",
    tintOnInk: "#FFFFFF",
  },
};

// Shared neutrals (identical across themes)
export const ink = {
  ink: "#0B0B0B",
  paper: "#FFFFFF",
  card: "#F7F6F4",
  cardBorder: "#EEECE8",
  hairline: "#ECEAE5",
  controlBorder: "#E4E1DA",
  chipBorder: "#DEDBD4",
  avatarBg: "#F4F3F0",
  textSecondary: "#8A857D",
  textMuted: "#9A958E",
  chipOutlineText: "#6E695F",
  onInkSecondary: "rgba(255,255,255,0.62)",
  onInkBorder: "rgba(255,255,255,0.28)",
  viewfinder: "#17150F",
  overlayPill: "rgba(255,255,255,0.12)",
  placeholder: "#F1EFEB",
  placeholderAlt: "#E9E6E0",
  placeholderText: "#7A756C",
  progressTrack: "#F0EEE9",
  pressHighlight: "#F1EFEB",
};

export const fonts = {
  // Hanken Grotesk
  regular: "HankenGrotesk_400Regular",
  medium: "HankenGrotesk_500Medium",
  semibold: "HankenGrotesk_600SemiBold",
  bold: "HankenGrotesk_700Bold",
  extrabold: "HankenGrotesk_800ExtraBold",
  // JetBrains Mono
  mono: "JetBrainsMono_400Regular",
  monoMedium: "JetBrainsMono_500Medium",
  monoSemibold: "JetBrainsMono_600SemiBold",
};

export const SCREEN_PAD = 22;

export const THEME_LABELS: Record<ThemeName, string> = {
  violet: "Violet",
  lime: "Lime",
  mono: "Mono",
};
