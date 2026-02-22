export const theme = {
  colors: {
    background: "#fffef9",
    surface: "#ffffff",
    surfaceMuted: "#fff8df",
    border: "#eadfbd",
    textPrimary: "#101010",
    textSecondary: "#4d4d4d",
    textMuted: "#6f675b",
    yellow: "#ffcf00",
    yellowDeep: "#f3b300",
    red: "#dd0000",
    redSoft: "#f8c5c5",
    black: "#000000",
    white: "#ffffff",
    success: "#176739",
  },
  gradients: {
    background: ["#ffffff", "#fff9df", "#fff3cb"] as const,
    hero: ["#fffdf6", "#ffefad", "#ffe17f"] as const,
    button: ["#111111", "#2a2a2a"] as const,
    badge: ["#fff0b8", "#ffe287"] as const,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
} as const;

export type TicketStatusTone = "open" | "assigned" | "in_progress" | "resolved" | "closed";
