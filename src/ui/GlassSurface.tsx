import React, { useEffect, useState } from "react";
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
  type GlassColorScheme,
  type GlassViewProps,
} from "expo-glass-effect";

import { theme } from "./theme";

type GlassSurfaceProps = {
  children?: React.ReactNode;
  colorScheme?: GlassColorScheme;
  fallbackStyle?: StyleProp<ViewStyle>;
  glassEffectStyle?: GlassViewProps["glassEffectStyle"];
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  tintColor?: string;
};

type GlassPressableProps = Omit<PressableProps, "children" | "style"> & {
  children: React.ReactNode;
  colorScheme?: GlassColorScheme;
  containerStyle?: StyleProp<ViewStyle>;
  disabledSurfaceStyle?: StyleProp<ViewStyle>;
  fallbackStyle?: StyleProp<ViewStyle>;
  glassEffectStyle?: GlassViewProps["glassEffectStyle"];
  pressedSurfaceStyle?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  tintColor?: string;
};

export function getActiveGlassTint(active: boolean): string | undefined {
  return active ? "rgba(255, 225, 127, 0.22)" : undefined;
}

type GlassAvailability = {
  available: boolean;
  glassEffectApiAvailable: boolean;
  liquidGlassAvailable: boolean;
  reason: "checking_accessibility" | "reduce_transparency" | "available" | "unsupported_runtime";
};

function useReduceTransparency(): boolean | null {
  const [reduceTransparency, setReduceTransparency] = useState<boolean | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      setReduceTransparency(false);
      return;
    }

    let mounted = true;

    void AccessibilityInfo.isReduceTransparencyEnabled()
      .then((enabled) => {
        if (mounted) {
          setReduceTransparency(enabled);
        }
      })
      .catch(() => {
        if (mounted) {
          setReduceTransparency(true);
        }
      });

    const subscription = AccessibilityInfo.addEventListener(
      "reduceTransparencyChanged",
      setReduceTransparency,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceTransparency;
}

let loggedGlassAvailability = false;

function getGlassAvailability(reduceTransparency: boolean | null): GlassAvailability {
  let glassEffectApiAvailable = false;
  let liquidGlassAvailable = false;

  try {
    glassEffectApiAvailable = isGlassEffectAPIAvailable();
    liquidGlassAvailable = isLiquidGlassAvailable();
  } catch {
    glassEffectApiAvailable = false;
    liquidGlassAvailable = false;
  }

  const availability = {
    available: false,
    glassEffectApiAvailable,
    liquidGlassAvailable,
    reason: "unsupported_runtime",
  } satisfies GlassAvailability;

  if (reduceTransparency === null) {
    return { ...availability, reason: "checking_accessibility" };
  }

  if (reduceTransparency) {
    return { ...availability, reason: "reduce_transparency" };
  }

  if (glassEffectApiAvailable && liquidGlassAvailable) {
    return { ...availability, available: true, reason: "available" };
  }

  return availability;
}

function withoutOpaqueFallback(style: StyleProp<ViewStyle>): StyleProp<ViewStyle> {
  const flattenedStyle = StyleSheet.flatten(style);

  if (!flattenedStyle) {
    return style;
  }

  const { backgroundColor: _backgroundColor, ...nativeStyle } = flattenedStyle;
  return nativeStyle;
}

export function GlassSurface({
  children,
  colorScheme = "auto",
  fallbackStyle,
  glassEffectStyle = "regular",
  interactive = false,
  style,
  tintColor = "rgba(255, 255, 255, 0.16)",
}: GlassSurfaceProps): React.JSX.Element {
  const reduceTransparency = useReduceTransparency();
  const availability = getGlassAvailability(reduceTransparency);

  useEffect(() => {
    if (__DEV__ && !loggedGlassAvailability && reduceTransparency !== null) {
      loggedGlassAvailability = true;
      console.info("CampusCare Liquid Glass availability", availability);
    }
  }, [availability, reduceTransparency]);

  if (availability.available) {
    return (
      <GlassView
        colorScheme={colorScheme}
        glassEffectStyle={glassEffectStyle}
        isInteractive={interactive}
        key={interactive ? "interactive" : "static"}
        style={withoutOpaqueFallback(style)}
        tintColor={tintColor}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.fallbackSurface, style, fallbackStyle]}>{children}</View>
  );
}

export function GlassPressable({
  children,
  colorScheme,
  containerStyle,
  disabled,
  disabledSurfaceStyle,
  fallbackStyle,
  glassEffectStyle,
  pressedSurfaceStyle,
  surfaceStyle,
  tintColor,
  ...pressableProps
}: GlassPressableProps): React.JSX.Element {
  return (
    <Pressable
      {...pressableProps}
      disabled={disabled}
      style={containerStyle}
    >
      {({ pressed }) => (
        <GlassSurface
          colorScheme={colorScheme}
          fallbackStyle={fallbackStyle}
          glassEffectStyle={glassEffectStyle}
          interactive={!disabled}
          style={[
            surfaceStyle,
            pressed && !disabled ? pressedSurfaceStyle : null,
            disabled ? disabledSurfaceStyle : null,
          ]}
          tintColor={tintColor}
        >
          {children}
        </GlassSurface>
      )}
    </Pressable>
  );
}

const styles = {
  fallbackSurface: {
    backgroundColor: theme.colors.glassFallback,
  },
} satisfies Record<string, ViewStyle>;
