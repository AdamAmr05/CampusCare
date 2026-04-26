import React, { memo, useMemo } from "react";
import {
  Animated,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../theme";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const SHIMMER_BAND_WIDTH = 120;
const BASE_COLOR = "#eadfbd33";
const HIGHLIGHT_COLOR = "#fdf6dd";

type Props = {
  /**
   * Shared progress value owned by the parent list. 0 → 1 over a single
   * shimmer cycle. Using a single shared value keeps the whole list animating
   * with one native driver instead of N per block.
   */
  progress: Animated.Value;
  /**
   * Width of the rendered block in dp. Required so we can compute the band
   * translation range without measuring on layout.
   */
  width: number;
  /**
   * Height of the rendered block in dp.
   */
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export const WorkspaceShimmer = memo(function WorkspaceShimmer({
  progress,
  width,
  height,
  borderRadius = 6,
  style,
}: Props): React.JSX.Element {
  const translateX = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [-SHIMMER_BAND_WIDTH, width + SHIMMER_BAND_WIDTH],
      }),
    [progress, width],
  );

  return (
    <View
      style={[
        styles.block,
        { width, height, borderRadius },
        style,
      ]}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      <AnimatedLinearGradient
        pointerEvents="none"
        colors={[BASE_COLOR, HIGHLIGHT_COLOR, BASE_COLOR]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.band,
          {
            width: SHIMMER_BAND_WIDTH,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  block: {
    backgroundColor: theme.colors.surfaceMuted,
    overflow: "hidden",
  },
  band: {
    position: "absolute",
    top: 0,
    bottom: 0,
    opacity: 0.7,
  },
});
