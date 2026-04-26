import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";

type Props = {
  message: string;
};

export function AuthErrorBanner({ message }: Props): React.JSX.Element | null {
  if (!message) return null;
  return (
    <View style={styles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={16}
        color={theme.colors.red}
      />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.redSoft,
    backgroundColor: "rgba(248, 197, 197, 0.18)",
  },
  text: {
    flex: 1,
    color: theme.colors.red,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
});
