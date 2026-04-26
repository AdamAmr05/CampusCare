import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";

type Props = {
  value: string;
  onChangeText: (value: string) => void;
  isSignUp: boolean;
  placeholder?: string;
};

export function AuthPasswordField({
  value,
  onChangeText,
  isSignUp,
  placeholder = "Password",
}: Props): React.JSX.Element {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        secureTextEntry={!visible}
        autoCorrect={false}
        autoCapitalize="none"
        textContentType={isSignUp ? "newPassword" : "password"}
        autoComplete={isSignUp ? "new-password" : "current-password"}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        style={({ pressed }) => [
          styles.toggle,
          pressed ? styles.togglePressed : null,
        ]}
        hitSlop={6}
        accessibilityLabel={visible ? "Hide password" : "Show password"}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={18}
          color={theme.colors.textMuted}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingRight: 44,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 46,
  },
  toggle: {
    position: "absolute",
    right: 4,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  togglePressed: {
    opacity: 0.6,
  },
});
