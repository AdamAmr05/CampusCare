import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { WorkspaceTicketCardSkeleton } from "./WorkspaceTicketCardSkeleton";

type RenderRow = (key: string, progress: Animated.Value) => React.ReactNode;

type Props = {
  /**
   * Number of rows to render. Defaults to 5.
   */
  count?: number;
  /**
   * Optional custom row renderer (used by Manager's Approvals tab to render
   * request-card skeletons instead of ticket-card skeletons). When omitted,
   * renders standard ticket-card skeletons.
   */
  renderRow?: RenderRow;
};

const DEFAULT_COUNT = 5;
const SHIMMER_DURATION_MS = 1300;

/**
 * Owns a single shared `Animated.Value` and drives it on the native thread.
 * All skeleton blocks below subscribe to the same progress value, so the
 * whole list animates with one driver regardless of how many rows render.
 *
 * Unmounts cleanly the moment real data is rendered: the animation loop is
 * stopped in the effect cleanup, so no JS work continues after data arrives.
 */
export function WorkspaceListSkeleton({
  count = DEFAULT_COUNT,
  renderRow,
}: Props): React.JSX.Element {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: SHIMMER_DURATION_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();

    return () => {
      animation.stop();
    };
  }, [progress]);

  const rows: React.ReactNode[] = [];
  for (let index = 0; index < count; index += 1) {
    const key = `skeleton-${index}`;
    if (renderRow) {
      rows.push(renderRow(key, progress));
    } else {
      rows.push(
        <WorkspaceTicketCardSkeleton key={key} progress={progress} />,
      );
    }
  }

  return (
    <View
      style={styles.container}
      accessibilityElementsHidden
      importantForAccessibility="no"
    >
      {rows}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
});
