import { StyleSheet } from "react-native";
import { theme } from "../../ui/theme";

export const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 22,
    gap: 14,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  heroTopRow: {
    minHeight: 112,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroIllustration: {
    marginRight: -6,
    marginTop: -18,
    height: 138,
    width: 138,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: theme.colors.yellow,
    color: theme.colors.black,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.35,
  },
  title: {
    fontSize: 31,
    lineHeight: 34,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.textSecondary,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 13,
    backgroundColor: theme.colors.black,
    paddingVertical: 13,
    alignItems: "center",
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  linkButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
  },
  linkText: {
    color: theme.colors.red,
    fontWeight: "700",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
