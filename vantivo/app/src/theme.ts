export const theme = {
  colors: {
    // Premium near-black canvas (ChatGPT-like depth)
    bg: "#0A0A0F",
    bgElevated: "#101016",
    surface: "#17171F",
    surfaceAlt: "#20202B",
    border: "#262630",
    borderSoft: "#1E1E27",

    // Refined indigo/violet accent
    primary: "#8B7CFF",
    primaryDeep: "#6D5CE6",
    primarySoft: "#211C3A",
    accent: "#2DD4A7",

    // Text
    text: "#ECECF1",
    textDim: "#9A9AA8",
    textFaint: "#6B6B78",

    // Bubbles
    userBubble: "#2A2A36",
    assistantBubble: "transparent",

    danger: "#FF6B81",
    warning: "#FFC15E",
  },
  // Premium accent gradients
  gradient: {
    brand: ["#8B7CFF", "#6D5CE6"] as const,
    brandSoft: ["#2A2350", "#1A1730"] as const,
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 999,
  },
  spacing: (n: number) => n * 4,
} as const;

export type Theme = typeof theme;
