import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../../ui/theme";

export type ManagerSection = "action" | "monitor" | "people";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

type SectionConfig = {
  key: ManagerSection;
  label: string;
  icon: IoniconsName;
  iconActive: IoniconsName;
};

const SECTIONS: ReadonlyArray<SectionConfig> = [
  {
    key: "action",
    label: "Action",
    icon: "flash-outline",
    iconActive: "flash",
  },
  {
    key: "monitor",
    label: "Monitor",
    icon: "pulse-outline",
    iconActive: "pulse",
  },
  {
    key: "people",
    label: "People",
    icon: "people-outline",
    iconActive: "people",
  },
];

type Props = {
  activeSection: ManagerSection;
  onSelect: (section: ManagerSection) => void;
  actionBadgeCount: number;
  peopleBadgeCount: number;
};

function pickBadgeForSection(
  sectionKey: ManagerSection,
  actionBadgeCount: number,
  peopleBadgeCount: number,
): number {
  if (sectionKey === "action") return actionBadgeCount;
  if (sectionKey === "people") return peopleBadgeCount;
  return 0;
}

export const ManagerBottomNav = memo(function ManagerBottomNav({
  activeSection,
  onSelect,
  actionBadgeCount,
  peopleBadgeCount,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(10, insets.bottom) },
      ]}
    >
      <View style={styles.bar}>
        {SECTIONS.map((section) => (
          <ManagerBottomNavItem
            key={section.key}
            section={section}
            isActive={activeSection === section.key}
            badge={pickBadgeForSection(
              section.key,
              actionBadgeCount,
              peopleBadgeCount,
            )}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
});

type ItemProps = {
  section: SectionConfig;
  isActive: boolean;
  badge: number;
  onSelect: (section: ManagerSection) => void;
};

function ManagerBottomNavItem({
  section,
  isActive,
  badge,
  onSelect,
}: ItemProps): React.JSX.Element {
  const iconName = isActive ? section.iconActive : section.icon;
  const iconColor = isActive ? theme.colors.white : theme.colors.textPrimary;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={section.label}
      hitSlop={6}
      onPress={() => onSelect(section.key)}
      style={({ pressed }) => [
        styles.item,
        isActive ? styles.itemActive : styles.itemInactive,
        pressed && !isActive ? styles.itemPressed : null,
      ]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={iconName} size={isActive ? 18 : 22} color={iconColor} />
        <ManagerBottomNavBadge badge={badge} isActive={isActive} />
      </View>
      {isActive ? (
        <Text style={styles.labelActive} numberOfLines={1}>
          {section.label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function ManagerBottomNavBadge({
  badge,
  isActive,
}: {
  badge: number;
  isActive: boolean;
}): React.JSX.Element | null {
  if (badge <= 0) return null;
  return (
    <View style={[styles.badge, isActive ? styles.badgeOnActive : null]}>
      <Text
        style={[styles.badgeText, isActive ? styles.badgeTextOnActive : null]}
      >
        {badge > 99 ? "99+" : badge}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: "transparent",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    minHeight: 44,
  },
  itemActive: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  itemInactive: {
    width: 52,
  },
  itemPressed: {
    opacity: 0.85,
  },
  iconWrap: {
    position: "relative",
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  labelActive: {
    color: theme.colors.white,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.red,
  },
  badgeOnActive: {
    backgroundColor: theme.colors.yellow,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 9,
    fontWeight: "800",
  },
  badgeTextOnActive: {
    color: theme.colors.black,
  },
});
