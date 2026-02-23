import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "./theme";
import { appScreenStyles as styles } from "./AppScreen.styles";

export function AppScreen(props: {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const content = props.scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(24, insets.bottom + 10) },
        props.contentContainerStyle,
      ]}
    >
      {props.children}
    </ScrollView>
  ) : (
    <View style={[styles.content, props.contentContainerStyle]}>{props.children}</View>
  );

  return (
    <LinearGradient colors={theme.gradients.background} style={styles.background}>
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View pointerEvents="none" style={styles.glowTop} />
        <View pointerEvents="none" style={styles.glowBottom} />
        <View style={styles.frame}>{content}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}
