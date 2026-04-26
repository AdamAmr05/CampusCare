import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";
import type { ResolverOption } from "../../tickets/types";

type Props = {
  resolvers: ResolverOption[];
  selectedResolverId: string | null;
  onSelectResolver: (resolverId: string) => void;
};

const SEARCH_THRESHOLD = 8;

export function ManagerResolverPicker({
  resolvers,
  selectedResolverId,
  onSelectResolver,
}: Props): React.JSX.Element {
  const [query, setQuery] = useState("");
  const showSearch = resolvers.length > SEARCH_THRESHOLD;

  const filtered = useMemo(() => {
    if (!showSearch || query.trim().length === 0) return resolvers;
    const needle = query.trim().toLowerCase();
    return resolvers.filter((resolver) => {
      return (
        resolver.fullName.toLowerCase().includes(needle) ||
        resolver.email.toLowerCase().includes(needle)
      );
    });
  }, [query, resolvers, showSearch]);

  if (resolvers.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons
          name="alert-circle-outline"
          size={14}
          color={theme.colors.textMuted}
        />
        <Text style={styles.emptyText}>
          No active resolvers. Approve a resolver request first.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showSearch ? (
        <View style={styles.searchRow}>
          <Ionicons
            name="search-outline"
            size={14}
            color={theme.colors.textMuted}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search resolvers"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
      ) : null}

      <View style={styles.list}>
        {filtered.map((resolver) => {
          const isSelected = selectedResolverId === resolver._id;
          return (
            <Pressable
              key={resolver._id}
              onPress={() => onSelectResolver(resolver._id)}
              style={({ pressed }) => [
                styles.row,
                isSelected ? styles.rowActive : null,
                pressed ? styles.rowPressed : null,
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {getInitials(resolver.fullName)}
                </Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {resolver.fullName}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {resolver.email}
                </Text>
              </View>
              <View
                style={[
                  styles.checkbox,
                  isSelected ? styles.checkboxActive : null,
                ]}
              >
                {isSelected ? (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={theme.colors.white}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
        {showSearch && filtered.length === 0 ? (
          <Text style={styles.noResults}>No resolvers match "{query}".</Text>
        ) : null}
      </View>
    </View>
  );
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.glassFallbackMuted,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },
  list: {
    gap: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
  },
  rowActive: {
    borderColor: theme.colors.black,
    backgroundColor: theme.colors.glassFallbackActive,
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.glassFallbackMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  name: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
  email: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: theme.colors.black,
    borderColor: theme.colors.black,
  },
  empty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  noResults: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    paddingVertical: 6,
  },
});
