import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function ImageLightbox(props: {
  imageUri: string | null;
  onClose: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={props.imageUri !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={props.onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={props.onClose} />
        <View style={styles.content} pointerEvents="box-none">
          {props.imageUri ? <Image source={{ uri: props.imageUri }} style={styles.image} resizeMode="contain" /> : null}
        </View>
        <Pressable
          style={[styles.closeButton, { top: insets.top + 10 }]}
          onPress={props.onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close image preview"
        >
          <Ionicons name="close" size={18} color="#ffffff" />
          <Text style={styles.closeButtonText}>Close</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 36,
    zIndex: 1,
  },
  closeButton: {
    position: "absolute",
    right: 16,
    minHeight: 46,
    minWidth: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ffffff55",
    backgroundColor: "#00000080",
    paddingHorizontal: 14,
    paddingVertical: 10,
    zIndex: 2,
  },
  closeButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
