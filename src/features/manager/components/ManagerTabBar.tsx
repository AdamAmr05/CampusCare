import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../../../ui/theme";

export type ManagerTab = "approvals" | "assign" | "close";

type Tab = {
  key: ManagerTab;
  label: string;
  count: number;
};

type Props = {
  activeTab: ManagerTab;
  tabs: ReadonlyArray<Tab>;
  onSelectTab: (tab: ManagerTab) => void;
};

export function ManagerTabBar({
  activeTab,
  tabs,
  onSelectTab,
}: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              isActive ? styles.tabActive : null,
              pressed && !isActive ? styles.tabPressed : null,
            ]}
          >
            <Text
              style={[styles.label, isActive ? styles.labelActive : null]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {tab.count > 0 ? (
              <View
                style={[styles.badge, isActive ? styles.badgeActive : null]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    isActive ? styles.badgeTextActive : null,
                  ]}
                >
                  {tab.count > 99 ? "99+" : tab.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: theme.colors.black,
  },
  tabPressed: {
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
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.black,
  },
  badgeActive: {
    backgroundColor: theme.colors.white,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: theme.colors.white,
  },
  badgeTextActive: {
    color: theme.colors.black,
  },
});
