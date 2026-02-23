import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import React from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ImageStyle,
  type ViewStyle,
  type StyleProp,
} from "react-native";

export function TicketImagePreview(props: {
  uri: string;
  style: StyleProp<ViewStyle | ImageStyle>;
  onPress: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
}): React.JSX.Element {
  return (
    <Pressable
      style={[props.style as StyleProp<ViewStyle>, styles.container]}
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? "Open image full screen"}
    >
      <ExpoImage
        source={{ uri: props.uri }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={120}
      />
      <View style={styles.expandBadge} pointerEvents="none">
        <Ionicons name="expand-outline" size={16} color="#ffffff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  expandBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
});
