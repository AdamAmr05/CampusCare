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
  heroMeta: {
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
  row: {
    flexDirection: "row",
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
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
    color: theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tabButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tabButtonActive: {
    borderColor: theme.colors.black,
    backgroundColor: "#fff1b8",
  },
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  tabTextActive: {
    color: theme.colors.textPrimary,
  },
  errorText: {
    color: theme.colors.red,
    fontSize: 13,
  },
  card: {
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 12,
    gap: 6,
  },
  detailsPreviewArea: {
    gap: 6,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: theme.colors.textPrimary,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  ticketImage: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#ece6ce",
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  smallLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "700",
    marginTop: 2,
  },
  resolverChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  resolverChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: "#fffdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resolverChipActive: {
    borderColor: theme.colors.black,
    backgroundColor: "#ffe79b",
  },
  resolverChipText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  resolverChipTextActive: {
    color: theme.colors.textPrimary,
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
  disabled: {
    opacity: 0.7,
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
  halfButton: {
    flex: 1,
  },
  emptyText: {
    marginTop: 8,
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  footerSpace: {
    paddingVertical: 8,
  },
});
