import { StyleSheet } from "react-native";
import { theme } from "../../ui/theme";

export const styles = StyleSheet.create({
  cardWrapper: {
    paddingHorizontal: 4,
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

  // ── Header zone (cream, wordmark + illustration) ──────────────────────────
  headerZone: {
    minHeight: 132,
    paddingTop: 22,
    paddingLeft: 22,
    paddingRight: 0,
    paddingBottom: 14,
    backgroundColor: theme.colors.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.borderSoft,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    overflow: "hidden",
  },
  wordmarkBlock: {
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 6,
  },
  wordmark: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: -0.4,
  },
  wordmarkAccent: {
    fontSize: 22,
    fontWeight: "900",
    color: theme.colors.yellowDeep,
    letterSpacing: -0.4,
  },
  wordmarkUnderline: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.yellow,
    marginTop: 6,
    flexBasis: "100%",
  },
  heroIllustration: {
    height: 152,
    width: 152,
    marginRight: -22,
    marginTop: -8,
    transform: [{ rotate: "-4deg" }],
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
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: theme.colors.surfaceMuted,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderSoft,
  },
  footerText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },
});
