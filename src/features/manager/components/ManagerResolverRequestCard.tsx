import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";
import type { ResolverRequest } from "../../auth/types";
import { formatRelativeTimestamp } from "../../tickets/utils";

type Props = {
  request: ResolverRequest;
  isProcessing: boolean;
  note: string;
  onApprove: () => void;
  onReject: () => void;
  onNoteChange: (value: string) => void;
};

export function ManagerResolverRequestCard({
  request,
  isProcessing,
  note,
  onApprove,
  onReject,
  onNoteChange,
}: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(request.requesterName)}</Text>
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {request.requesterName}
          </Text>
          <Text style={styles.email} numberOfLines={1}>
            {request.requesterEmail}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons
              name="time-outline"
              size={11}
              color={theme.colors.textMuted}
            />
            <Text style={styles.metaText}>
              Submitted {formatRelativeTimestamp(request.submittedAt)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.reasonCard}>
        <Text style={styles.reasonLabel}>Reason</Text>
        <Text style={styles.reasonText}>
          {request.reason && request.reason.trim().length > 0
            ? request.reason
            : "No reason provided."}
        </Text>
      </View>

      <Text style={styles.fieldLabel}>Decision note (required for reject)</Text>
      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={styles.input}
        placeholder="e.g. Not affiliated with facilities team"
        placeholderTextColor={theme.colors.textMuted}
      />

      <View style={styles.buttonRow}>
        <Pressable
          onPress={onReject}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.rejectButton,
            isProcessing ? styles.buttonDisabled : null,
            pressed && !isProcessing ? styles.controlPressed : null,
          ]}
        >
          <Ionicons name="close" size={14} color={theme.colors.red} />
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>
        <Pressable
          onPress={onApprove}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.approveButton,
            isProcessing ? styles.buttonDisabled : null,
            pressed && !isProcessing ? styles.controlPressed : null,
          ]}
        >
          <Ionicons name="checkmark" size={14} color={theme.colors.white} />
          <Text style={styles.approveButtonText}>
            {isProcessing ? "Working…" : "Approve"}
          </Text>
        </Pressable>
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
    gap: 2,
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
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
  reasonCard: {
    gap: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  reasonText: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: "#fffdf6",
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 40,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.black,
    paddingVertical: 11,
    minHeight: 40,
  },
  approveButtonText: {
    color: theme.colors.white,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.redSoft,
    backgroundColor: "rgba(248, 197, 197, 0.18)",
    paddingVertical: 11,
    minHeight: 40,
  },
  rejectButtonText: {
    color: theme.colors.red,
    fontWeight: "700",
    fontSize: 13,
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
