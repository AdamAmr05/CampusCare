import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

export function ImageLightbox(props: {
  imageUri: string | null;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <Modal
      visible={props.imageUri !== null}
      transparent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={props.onClose} />
        <View style={styles.content}>
          <Pressable style={styles.closeButton} onPress={props.onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
          {props.imageUri ? (
            <Image source={{ uri: props.imageUri }} style={styles.image} resizeMode="contain" />
          ) : null}
        </View>
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
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 36,
  },
  closeButton: {
    position: "absolute",
    top: 44,
    right: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffffff55",
    backgroundColor: "#00000080",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
