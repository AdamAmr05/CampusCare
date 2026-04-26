import React from "react";
import { Image as ExpoImage } from "expo-image";
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

const campusMapBackground = require("../../assets/backgrounds/campus-map-background-v2.png");

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
      <ExpoImage
        pointerEvents="none"
        source={campusMapBackground}
        style={styles.backgroundArtwork}
        contentFit="cover"
      />
      <View pointerEvents="none" style={styles.backgroundWash} />
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.frame}>{content}</View>
      </SafeAreaView>
    </LinearGradient>
  );
}
