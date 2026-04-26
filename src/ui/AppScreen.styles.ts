import { StyleSheet } from "react-native";

export const appScreenStyles = StyleSheet.create({
  background: {
    flex: 1,
  },
  backgroundArtwork: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.72,
  },
  backgroundWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 254, 249, 0.44)",
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
});
