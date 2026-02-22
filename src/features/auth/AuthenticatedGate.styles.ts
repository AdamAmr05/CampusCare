import { StyleSheet } from "react-native";
import { theme } from "../../ui/theme";

export const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: "#fffdf4",
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: theme.colors.black,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: "800",
    fontSize: 14,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },
  errorText: {
    color: theme.colors.red,
    fontSize: 13,
  },
  disabled: {
    opacity: 0.7,
  },
});
