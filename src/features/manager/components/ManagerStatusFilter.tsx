import React, { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "../../../ui/theme";
import type { TicketStatus } from "../../../domain/types";
import { getTicketStatusStripeColor } from "../../tickets/utils";

export type MonitorStatusFilter = "all" | TicketStatus;

type Chip = {
  key: MonitorStatusFilter;
  label: string;
  count: MonitorCount;
};

export type MonitorCount = {
  value: number;
  isCapped: boolean;
};

type Props = {
  active: MonitorStatusFilter;
  onSelect: (filter: MonitorStatusFilter) => void;
  counts: {
    open: MonitorCount;
    assigned: MonitorCount;
    in_progress: MonitorCount;
    resolved: MonitorCount;
    closed: MonitorCount;
  };
};

function sumMonitorCounts(counts: Props["counts"]): MonitorCount {
  return {
    value:
      counts.open.value +
      counts.assigned.value +
      counts.in_progress.value +
      counts.resolved.value +
      counts.closed.value,
    isCapped:
      counts.open.isCapped ||
      counts.assigned.isCapped ||
      counts.in_progress.isCapped ||
      counts.resolved.isCapped ||
      counts.closed.isCapped,
  };
}

function formatMonitorCount(count: MonitorCount): string {
  return count.isCapped ? `${count.value}+` : String(count.value);
}

export const ManagerStatusFilter = memo(function ManagerStatusFilter({
  active,
  onSelect,
  counts,
}: Props): React.JSX.Element {
  const chips = useMemo<ReadonlyArray<Chip>>(
    () => [
      {
        key: "all",
        label: "All",
        count: sumMonitorCounts(counts),
      },
      { key: "assigned", label: "Assigned", count: counts.assigned },
      { key: "in_progress", label: "In progress", count: counts.in_progress },
      { key: "resolved", label: "Resolved", count: counts.resolved },
      { key: "closed", label: "Closed", count: counts.closed },
      { key: "open", label: "Open", count: counts.open },
    ],
    [counts],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {chips.map((chip) => {
        const isActive = active === chip.key;
        const dotColor =
          chip.key === "all"
            ? theme.colors.textMuted
            : getTicketStatusStripeColor(chip.key);

        return (
          <Pressable
            key={chip.key}
            onPress={() => onSelect(chip.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={({ pressed }) => [
              styles.chip,
              isActive ? styles.chipActive : null,
              pressed && !isActive ? styles.chipPressed : null,
            ]}
          >
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text
              style={[styles.label, isActive ? styles.labelActive : null]}
              numberOfLines={1}
            >
              {chip.label}
            </Text>
            {chip.count.value > 0 ? (
              <Text
                style={[
                  styles.count,
                  isActive ? styles.countActive : null,
                ]}
              >
                {formatMonitorCount(chip.count)}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
    paddingHorizontal: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    minHeight: 36,
  },
  chipActive: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  chipPressed: {
    opacity: 0.85,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12.5,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: theme.colors.white,
  },
  count: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    marginLeft: 2,
  },
  countActive: {
    color: theme.colors.yellow,
  },
});
