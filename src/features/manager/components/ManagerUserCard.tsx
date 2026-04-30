import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Id } from "../../../../convex/_generated/dataModel";
import { theme } from "../../../ui/theme";
import type { UserRole } from "../../../domain/types";
import { formatRelativeTimestamp } from "../../tickets/utils";

export type DirectoryUser = {
  _id: Id<"users">;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: number;
};

export type UserCardAction = "none" | "deactivate" | "reactivate";

type Props = {
  user: DirectoryUser;
  isProcessing: boolean;
  action: UserCardAction;
  isInactive?: boolean;
  onDeactivate?: (userId: Id<"users">) => void;
  onReactivate?: (userId: Id<"users">) => void;
};

export const ManagerUserCard = memo(function ManagerUserCard({
  user,
  isProcessing,
  action,
  isInactive,
  onDeactivate,
  onReactivate,
}: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(user.fullName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {user.fullName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.roleBadge}>
              <Ionicons
                name={getRoleIcon(user.role)}
                size={11}
                color={theme.colors.textPrimary}
              />
              <Text style={styles.roleText}>{getRoleLabel(user.role)}</Text>
            </View>
            {isInactive ? (
              <View style={styles.inactiveBadge}>
                <Ionicons
                  name="pause"
                  size={10}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.inactiveBadgeText}>Inactive</Text>
              </View>
            ) : null}
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaText}>
              Joined {formatRelativeTimestamp(user.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      <UserCardActionButton
        action={action}
        userId={user._id}
        userName={user.fullName}
        isProcessing={isProcessing}
        onDeactivate={onDeactivate}
        onReactivate={onReactivate}
      />
    </View>
  );
});

function UserCardActionButton({
  action,
  userId,
  userName,
  isProcessing,
  onDeactivate,
  onReactivate,
}: {
  action: UserCardAction;
  userId: Id<"users">;
  userName: string;
  isProcessing: boolean;
  onDeactivate?: (userId: Id<"users">) => void;
  onReactivate?: (userId: Id<"users">) => void;
}): React.JSX.Element | null {
  if (action === "deactivate" && onDeactivate) {
    return (
      <Pressable
        onPress={() => onDeactivate(userId)}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel={`Deactivate ${userName}`}
        style={({ pressed }) => [
          styles.deactivateButton,
          isProcessing ? styles.buttonDisabled : null,
          pressed && !isProcessing ? styles.controlPressed : null,
        ]}
      >
        <Ionicons
          name="pause-circle-outline"
          size={14}
          color={theme.colors.red}
        />
        <Text style={styles.deactivateButtonText}>
          {isProcessing ? "Deactivating…" : "Deactivate access"}
        </Text>
      </Pressable>
    );
  }

  if (action === "reactivate" && onReactivate) {
    return (
      <Pressable
        onPress={() => onReactivate(userId)}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel={`Reactivate ${userName}`}
        style={({ pressed }) => [
          styles.reactivateButton,
          isProcessing ? styles.buttonDisabled : null,
          pressed && !isProcessing ? styles.controlPressed : null,
        ]}
      >
        <Ionicons
          name="play-circle-outline"
          size={14}
          color={theme.colors.success}
        />
        <Text style={styles.reactivateButtonText}>
          {isProcessing ? "Reactivating…" : "Reactivate access"}
        </Text>
      </Pressable>
    );
  }

  return null;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleLabel(role: UserRole): string {
  if (role === "manager") return "Manager";
  if (role === "resolver") return "Resolver";
  return "Reporter";
}

function getRoleIcon(
  role: UserRole,
): React.ComponentProps<typeof Ionicons>["name"] {
  if (role === "manager") return "shield-checkmark-outline";
  if (role === "resolver") return "construct-outline";
  return "person-outline";
}

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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.glassFallbackMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: 0.3,
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  name: {
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    letterSpacing: -0.1,
  },
  email: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    flexWrap: "wrap",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  roleText: {
    color: theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  metaDot: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  deactivateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.redSoft,
    backgroundColor: "rgba(248, 197, 197, 0.18)",
    paddingVertical: 10,
    minHeight: 38,
  },
  deactivateButtonText: {
    color: theme.colors.red,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  reactivateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(23, 103, 57, 0.32)",
    backgroundColor: "rgba(23, 103, 57, 0.10)",
    paddingVertical: 10,
    minHeight: 38,
  },
  reactivateButtonText: {
    color: theme.colors.success,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  inactiveBadgeText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  controlPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
});
