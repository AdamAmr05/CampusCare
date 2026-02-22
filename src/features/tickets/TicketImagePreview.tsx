import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type ImageStyle,
  type StyleProp,
} from "react-native";

export function TicketImagePreview(props: {
  uri: string;
  style: StyleProp<ImageStyle>;
  onPress: (event: GestureResponderEvent) => void;
  accessibilityLabel?: string;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel ?? "Open image full screen"}
    >
      <Image source={{ uri: props.uri }} style={props.style} />
      <View style={styles.expandBadge} pointerEvents="none">
        <Ionicons name="expand-outline" size={16} color="#ffffff" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
