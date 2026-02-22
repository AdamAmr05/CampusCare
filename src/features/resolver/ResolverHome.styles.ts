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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: theme.colors.surface,
    padding: 16,
    gap: 8,
  },
  detailsPreviewArea: {
    gap: 8,
  },
  ticketHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ticketTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
  },
  ticketMeta: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  ticketDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  ticketImage: {
    marginTop: 4,
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#ece6ce",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
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
    borderRadius: 16,
    backgroundColor: theme.colors.black,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  imageActionRow: {
    flexDirection: "row",
    gap: 8,
  },
  imageActionButton: {
    flex: 1,
  },
  resolutionPreviewImage: {
    marginTop: 4,
    width: "100%",
    height: 160,
    borderRadius: 16,
    backgroundColor: "#ece6ce",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
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
