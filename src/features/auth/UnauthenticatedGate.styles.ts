import { StyleSheet } from "react-native";
import { theme } from "../../ui/theme";

export const styles = StyleSheet.create({
  screenContent: {
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 40,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    paddingHorizontal: 4,
    gap: 10,
    transform: [{ translateY: -22 }],
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
    shadowColor: theme.colors.black,
    shadowOpacity: 0.1,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  // ── Header artwork (transparent integrated welcome illustration) ──────────
  headerZone: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 176,
    marginBottom: -10,
  },
  heroIllustration: {
    height: 176,
    width: "100%",
    maxWidth: 422,
  },

  // ── Body zone (white, title + CTA) ────────────────────────────────────────
  bodyZone: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 16,
  },
  copyBlock: {
    gap: 10,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14.5,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.black,
    paddingVertical: 14,
    minHeight: 48,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  resolverLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    alignSelf: "center",
    paddingVertical: 4,
  },
  resolverLinkPressed: {
    opacity: 0.6,
  },
  resolverLinkText: {
    color: theme.colors.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },

  // ── Footer zone (cream, help line) ────────────────────────────────────────
  footerZone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 12,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
