import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../TicketDetailsPanel.styles";

export const TicketDetailsInlineLightbox = memo(function TicketDetailsInlineLightbox(props: {
  imageUri: string | null;
  topInset: number;
  onClose: () => void;
}): React.JSX.Element | null {
  if (!props.imageUri) {
    return null;
  }

  return (
    <View style={styles.lightboxOverlay}>
      <Pressable style={styles.lightboxDismissArea} onPress={props.onClose} />
      <View style={styles.lightboxContent} pointerEvents="box-none">
        <ExpoImage
          source={{ uri: props.imageUri }}
          style={styles.lightboxImage}
          contentFit="contain"
          cachePolicy="memory-disk"
        />
      </View>
      <Pressable
        style={[styles.lightboxCloseButton, { top: props.topInset + 10 }]}
        onPress={props.onClose}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Close image preview"
      >
        <Ionicons name="close" size={18} color="#ffffff" />
        <Text style={styles.lightboxCloseButtonText}>Close</Text>
      </Pressable>
    </View>
  );
});
