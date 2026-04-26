import React, { memo } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { theme } from "../../../ui/theme";
import { WorkspaceShimmer } from "../../../ui/workspace/skeleton/WorkspaceShimmer";

type Props = {
  progress: Animated.Value;
};

export const ManagerRequestCardSkeleton = memo(
  function ManagerRequestCardSkeleton({
    progress,
  }: Props): React.JSX.Element {
    return (
      <View
        style={styles.card}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <View style={styles.headerRow}>
          <WorkspaceShimmer
            progress={progress}
            width={44}
            height={44}
            borderRadius={22}
          />
          <View style={styles.headerText}>
            <WorkspaceShimmer
              progress={progress}
              width={150}
              height={14}
              borderRadius={4}
            />
            <WorkspaceShimmer
              progress={progress}
              width={180}
              height={11}
              borderRadius={4}
              style={styles.headerLine}
            />
            <WorkspaceShimmer
              progress={progress}
              width={120}
              height={10}
              borderRadius={4}
              style={styles.headerLineShort}
            />
          </View>
        </View>

        <View style={styles.reasonBlock}>
          <WorkspaceShimmer
            progress={progress}
            width={50}
            height={9}
            borderRadius={4}
          />
          <WorkspaceShimmer
            progress={progress}
            width={240}
            height={11}
            borderRadius={4}
            style={[styles.reasonLine, styles.reasonLineWide]}
          />
          <WorkspaceShimmer
            progress={progress}
            width={180}
            height={11}
            borderRadius={4}
            style={styles.reasonLineShort}
          />
        </View>

        <WorkspaceShimmer
          progress={progress}
          width={260}
          height={40}
          borderRadius={10}
          style={styles.inputPlaceholder}
        />

        <View style={styles.buttonRow}>
          <WorkspaceShimmer
            progress={progress}
            width={140}
            height={40}
            borderRadius={12}
            style={styles.buttonPlaceholder}
          />
          <WorkspaceShimmer
            progress={progress}
            width={140}
            height={40}
            borderRadius={12}
            style={styles.buttonPlaceholder}
          />
        </View>
      </View>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
  },
  headerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    gap: 6,
  },
  headerLine: {
    maxWidth: "100%",
  },
  headerLineShort: {
    maxWidth: "72%",
  },
  reasonBlock: {
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  reasonLine: {
    marginTop: 2,
  },
  reasonLineWide: {
    maxWidth: "100%",
  },
  reasonLineShort: {
    maxWidth: "78%",
  },
  inputPlaceholder: {
    maxWidth: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  buttonPlaceholder: {
    flex: 1,
    minWidth: 0,
  },
});
