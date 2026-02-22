import { StyleSheet } from "react-native";
import { theme } from "../../ui/theme";

export const styles = StyleSheet.create({
  listContent: {
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 2,
  },
  listHeader: {
    gap: 10,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  headerMeta: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.red,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.textSecondary,
  },
  signedInText: {
    marginTop: 2,
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  signOutButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  signOutText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  workspaceButton: {
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.black,
    backgroundColor: "#fff2b8",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  workspaceButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  ticketCard: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 12,
    gap: 6,
  },
  ticketHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "center",
  },
  ticketTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  ticketMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  ticketDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  ticketImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#ece6ce",
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.25,
  },
  input: {
    borderRadius: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fffdf4",
    color: theme.colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  primaryButton: {
    borderRadius: 12,
    backgroundColor: theme.colors.black,
    paddingVertical: 11,
    alignItems: "center",
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "800",
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
    fontSize: 14,
    fontWeight: "700",
  },
  imageActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  imageActionButton: {
    flex: 1,
  },
  resolutionPreviewImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#ece6ce",
  },
  errorText: {
    color: theme.colors.red,
    fontSize: 13,
  },
  awaitingText: {
    color: theme.colors.success,
    fontWeight: "700",
    fontSize: 13,
  },
  emptyText: {
    marginTop: 8,
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  footerSpace: {
    paddingVertical: 8,
  },
});
