import { StyleSheet } from "react-native";
import { theme } from "./theme";

export const appScreenStyles = StyleSheet.create({
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 860,
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  content: {
    flex: 1,
    gap: 12,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 12,
    paddingBottom: 24,
  },
  glowTop: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: theme.colors.yellow,
    opacity: 0.18,
  },
  glowBottom: {
    position: "absolute",
    bottom: -90,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.red,
    opacity: 0.09,
  },
});
