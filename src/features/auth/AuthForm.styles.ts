import { StyleSheet } from "react-native";
import { theme } from "../../ui/theme";

export const styles = StyleSheet.create({
  scrollContent: {
    justifyContent: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  pathRow: {
    flexDirection: "row",
    gap: 8,
  },
  pathChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fffdf4",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pathChipActive: {
    borderColor: theme.colors.black,
    backgroundColor: "#fff1b8",
  },
  pathChipText: {
    color: theme.colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  pathChipTextActive: {
    color: theme.colors.textPrimary,
  },
  modeRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 4,
  },
  modeButton: {
    paddingVertical: 6,
  },
  modeText: {
    fontSize: 14,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  modeTextActive: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: "#fffdf6",
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 2,
    borderRadius: 12,
    backgroundColor: theme.colors.black,
    paddingVertical: 13,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: "800",
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: 11,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
  },
  errorText: {
    color: theme.colors.red,
    fontSize: 14,
    lineHeight: 20,
  },
});
