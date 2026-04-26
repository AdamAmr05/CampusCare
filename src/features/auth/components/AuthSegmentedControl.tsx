import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../../ui/theme";

export type AuthMode = "sign_in" | "sign_up";

type Props = {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
};

export function AuthSegmentedControl({
  mode,
  onChange,
}: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Segment label="Sign in" active={mode === "sign_in"} onPress={() => onChange("sign_in")} />
      <Segment label="Sign up" active={mode === "sign_up"} onPress={() => onChange("sign_up")} />
    </View>
  );
}

function Segment({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.segment,
        active ? styles.segmentActive : null,
        pressed && !active ? styles.segmentPressed : null,
      ]}
    >
      <Text style={[styles.label, active ? styles.labelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentActive: {
    backgroundColor: theme.colors.black,
  },
  segmentPressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: theme.colors.white,
  },
});
