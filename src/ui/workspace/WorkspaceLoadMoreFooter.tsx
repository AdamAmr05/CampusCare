import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { GlassPressable } from "../GlassSurface";
import { theme } from "../theme";

type Props = {
  canLoadMore: boolean;
  onLoadMore: () => void;
};

export function WorkspaceLoadMoreFooter({
  canLoadMore,
  onLoadMore,
}: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      {canLoadMore ? (
        <GlassPressable
          onPress={onLoadMore}
          surfaceStyle={styles.button}
          pressedSurfaceStyle={styles.pressed}
        >
          <Text style={styles.text}>Load more</Text>
        </GlassPressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.glassFallbackMuted,
    paddingVertical: 12,
    alignItems: "center",
    minHeight: 44,
    justifyContent: "center",
  },
  text: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
});
