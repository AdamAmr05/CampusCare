import React, { memo, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";

export type PeopleFilter =
  | "approvals"
  | "resolvers"
  | "managers"
  | "inactive";

export type PeopleCount = {
  value: number;
  isCapped: boolean;
};

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type Chip = {
  key: PeopleFilter;
  label: string;
  icon: IoniconsName;
  count: PeopleCount;
};

type Props = {
  active: PeopleFilter;
  onSelect: (filter: PeopleFilter) => void;
  counts: {
    approvals: PeopleCount;
    resolvers: PeopleCount;
    managers: PeopleCount;
    inactive: PeopleCount;
  };
};

function formatPeopleCount(count: PeopleCount): string {
  return count.isCapped ? `${count.value}+` : String(count.value);
}

export const ManagerPeopleFilter = memo(function ManagerPeopleFilter({
  active,
  onSelect,
  counts,
}: Props): React.JSX.Element {
  const chips = useMemo<ReadonlyArray<Chip>>(
    () => [
      {
        key: "approvals",
        label: "Approvals",
        icon: "person-add-outline",
        count: counts.approvals,
      },
      {
        key: "resolvers",
        label: "Resolvers",
        icon: "construct-outline",
        count: counts.resolvers,
      },
      {
        key: "managers",
        label: "Managers",
        icon: "shield-checkmark-outline",
        count: counts.managers,
      },
      {
        key: "inactive",
        label: "Inactive",
        icon: "pause-circle-outline",
        count: counts.inactive,
      },
    ],
    [counts],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {chips.map((chip) => (
        <PeopleFilterChip
          key={chip.key}
          chip={chip}
          isActive={active === chip.key}
          onSelect={onSelect}
        />
      ))}
    </ScrollView>
  );
});

function PeopleFilterChip({
  chip,
  isActive,
  onSelect,
}: {
  chip: Chip;
  isActive: boolean;
  onSelect: (filter: PeopleFilter) => void;
}): React.JSX.Element {
  const iconColor = isActive ? theme.colors.white : theme.colors.textPrimary;

  return (
    <Pressable
      onPress={() => onSelect(chip.key)}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      style={({ pressed }) => [
        styles.chip,
        isActive ? styles.chipActive : null,
        pressed && !isActive ? styles.chipPressed : null,
      ]}
    >
      <Ionicons name={chip.icon} size={14} color={iconColor} />
      <Text
        style={[styles.label, isActive ? styles.labelActive : null]}
        numberOfLines={1}
      >
        {chip.label}
      </Text>
      {chip.count.value > 0 ? (
        <Text style={[styles.count, isActive ? styles.countActive : null]}>
          {formatPeopleCount(chip.count)}
        </Text>
      ) : null}
    </Pressable>
  );
}

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
