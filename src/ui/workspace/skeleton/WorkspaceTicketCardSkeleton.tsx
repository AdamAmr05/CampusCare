import React, { memo } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { theme } from "../../theme";
import { WorkspaceShimmer } from "./WorkspaceShimmer";

type Props = {
  progress: Animated.Value;
};

export const WorkspaceTicketCardSkeleton = memo(
  function WorkspaceTicketCardSkeleton({
    progress,
  }: Props): React.JSX.Element {
    return (
      <View
        style={styles.container}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <View style={styles.textColumn}>
          <View style={styles.topRow}>
            <WorkspaceShimmer
              progress={progress}
              width={8}
              height={8}
              borderRadius={4}
            />
            <WorkspaceShimmer
              progress={progress}
              width={140}
              height={14}
              borderRadius={4}
              style={styles.titlePlaceholder}
            />
            <View style={styles.flexFiller} />
            <WorkspaceShimmer
              progress={progress}
              width={56}
              height={16}
              borderRadius={999}
            />
          </View>
          <View style={styles.metaRow}>
            <WorkspaceShimmer
              progress={progress}
              width={86}
              height={10}
              borderRadius={4}
            />
            <WorkspaceShimmer
              progress={progress}
              width={48}
              height={10}
              borderRadius={4}
            />
          </View>
          <WorkspaceShimmer
            progress={progress}
            width={220}
            height={10}
            borderRadius={4}
            style={[styles.descriptionLine, styles.wideLinePlaceholder]}
          />
          <WorkspaceShimmer
            progress={progress}
            width={170}
            height={10}
            borderRadius={4}
            style={styles.mediumLinePlaceholder}
          />
        </View>
        <WorkspaceShimmer
          progress={progress}
          width={64}
          height={64}
          borderRadius={12}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 12,
    alignItems: "center",
  },
  textColumn: {
    flex: 1,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titlePlaceholder: {
    flexShrink: 1,
    maxWidth: 140,
    minWidth: 48,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  descriptionLine: {
    marginTop: 2,
  },
  wideLinePlaceholder: {
    maxWidth: "100%",
  },
  mediumLinePlaceholder: {
    maxWidth: "82%",
  },
  flexFiller: {
    flex: 1,
    minWidth: 0,
  },
});
