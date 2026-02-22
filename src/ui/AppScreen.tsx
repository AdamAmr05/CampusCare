import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  SafeAreaView,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { theme } from "./theme";
import { appScreenStyles as styles } from "./AppScreen.styles";

export function AppScreen(props: {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  const content = props.scroll ? (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.scrollContent, props.contentContainerStyle]}
    >
      {props.children}
    </ScrollView>
  ) : (
    <View style={[styles.content, props.contentContainerStyle]}>{props.children}</View>
  );

  return (
    <LinearGradient colors={theme.gradients.background} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <View pointerEvents="none" style={styles.glowTop} />
        <View pointerEvents="none" style={styles.glowBottom} />
        <View style={styles.frame}>{content}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}
