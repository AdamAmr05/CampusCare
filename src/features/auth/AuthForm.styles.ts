import { StyleSheet } from "react-native";
import { theme } from "../../ui/theme";

export const styles = StyleSheet.create({
  scrollContent: {
    justifyContent: "center",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    padding: 20,
    gap: 14,
    shadowColor: theme.colors.black,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingRight: 8,
  },
  backRowPressed: {
    opacity: 0.6,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  headBlock: {
    gap: 6,
  },
  title: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  stepHint: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  noticeBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(243, 179, 0, 0.32)",
    backgroundColor: "rgba(255, 207, 0, 0.12)",
  },
  noticeText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
  },
  fieldGroup: {
    gap: 4,
  },
  fieldHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
  },
  fieldHintText: {
    color: theme.colors.textMuted,
    fontSize: 11.5,
    fontWeight: "500",
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    gap: 8,
  },
  nameInput: {
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 46,
  },
  codeInput: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
  },
  factorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  factorChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
  },
  factorChipActive: {
    borderColor: theme.colors.black,
    backgroundColor: theme.colors.black,
  },
  factorChipText: {
    color: theme.colors.textPrimary,
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  factorChipTextActive: {
    color: theme.colors.white,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: theme.colors.black,
    paddingVertical: 13,
    minHeight: 46,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.2,
  },
  controlPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.92,
  },
});
