import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardLarge: {
    width: "100%",
    maxWidth: 680,
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10263f",
  },
  subtitle: {
    color: "#334e68",
    fontSize: 15,
    lineHeight: 22,
  },
  metaText: {
    color: "#486581",
    fontSize: 14,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#0055cc",
  },
  secondaryButton: {
    backgroundColor: "#e4ecf5",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: "#16324f",
    fontWeight: "600",
    fontSize: 15,
  },
  linkText: {
    color: "#0055cc",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  smallLink: {
    color: "#0055cc",
    textDecorationLine: "underline",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: "#c4d1df",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: "#10263f",
    backgroundColor: "#f8fbff",
  },
  errorText: {
    color: "#b00020",
    fontSize: 14,
    lineHeight: 20,
  },
  errorSlot: {
    minHeight: 44,
    justifyContent: "center",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  tab: {
    fontSize: 15,
    color: "#627d98",
  },
  tabActive: {
    fontSize: 15,
    color: "#10263f",
    fontWeight: "700",
  },
  listContainer: {
    paddingVertical: 8,
    gap: 10,
  },
  requestCard: {
    borderWidth: 1,
    borderColor: "#d8e3ef",
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "#fcfdff",
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#10263f",
  },
  requestMeta: {
    fontSize: 13,
    color: "#486581",
  },
  halfButton: {
    flex: 1,
  },
});
