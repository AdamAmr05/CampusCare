import { StyleSheet } from "react-native";
import { theme } from "../theme";

export const ticketCardStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    alignItems: "center",
  },
  pressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.96,
  },
  textColumn: {
    flex: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.textSecondary,
  },
  trailing: {
    marginTop: 6,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: "#ece6ce",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
