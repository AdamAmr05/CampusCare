import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";
import { TicketImagePreview } from "../../tickets/TicketImagePreview";
import type { ResolverOption, Ticket } from "../../tickets/types";
import {
  formatRelativeTimestamp,
  formatTimestamp,
  getTicketStatusColors,
  getTicketStatusShortLabel,
} from "../../tickets/utils";
import { ManagerResolverPicker } from "./ManagerResolverPicker";

type Props = {
  ticket: Ticket | null;
  visible: boolean;
  isProcessing: boolean;
  resolvers: ResolverOption[];
  selectedResolverId: string | null;
  assignmentNote: string;
  closureNote: string;
  errorMessage: string;
  onClose: () => void;
  onSelectResolver: (resolverId: string) => void;
  onAssignmentNoteChange: (value: string) => void;
  onClosureNoteChange: (value: string) => void;
  onAssign: () => void;
  onCloseTicket: () => void;
  onOpenImage: (uri: string) => void;
  onViewHistory: () => void;
};

export function ManagerActionSheet({
  ticket,
  visible,
  isProcessing,
  resolvers,
  selectedResolverId,
  assignmentNote,
  closureNote,
  errorMessage,
  onClose,
  onSelectResolver,
  onAssignmentNoteChange,
  onClosureNoteChange,
  onAssign,
  onCloseTicket,
  onOpenImage,
  onViewHistory,
}: Props): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropDismiss} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          {ticket ? (
            <ManagerActionSheetBody
              ticket={ticket}
              isProcessing={isProcessing}
              resolvers={resolvers}
              selectedResolverId={selectedResolverId}
              assignmentNote={assignmentNote}
              closureNote={closureNote}
              errorMessage={errorMessage}
              onClose={onClose}
              onSelectResolver={onSelectResolver}
              onAssignmentNoteChange={onAssignmentNoteChange}
              onClosureNoteChange={onClosureNoteChange}
              onAssign={onAssign}
              onCloseTicket={onCloseTicket}
              onOpenImage={onOpenImage}
              onViewHistory={onViewHistory}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type BodyProps = Omit<Props, "visible"> & { ticket: Ticket };

function ManagerActionSheetBody({
  ticket,
  isProcessing,
  resolvers,
  selectedResolverId,
  assignmentNote,
  closureNote,
  errorMessage,
  onClose,
  onSelectResolver,
  onAssignmentNoteChange,
  onClosureNoteChange,
  onAssign,
  onCloseTicket,
  onOpenImage,
  onViewHistory,
}: BodyProps): React.JSX.Element {
  const statusColors = getTicketStatusColors(ticket.status);
  const statusLabel = getTicketStatusShortLabel(ticket.status);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={1}>
            {ticket.category}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={12}
              color={theme.colors.textMuted}
            />
            <Text style={styles.meta}>{ticket.location}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.meta}>
              {formatRelativeTimestamp(ticket.createdAt)}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusColors.background },
          ]}
        >
          <Text style={[styles.statusPillText, { color: statusColors.text }]}>
            {statusLabel}
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeIcon,
            pressed ? styles.controlPressed : null,
          ]}
          accessibilityLabel="Close"
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      {ticket.status === "open" ? (
        <OpenTicketActions
          ticket={ticket}
          isProcessing={isProcessing}
          resolvers={resolvers}
          selectedResolverId={selectedResolverId}
          assignmentNote={assignmentNote}
          onSelectResolver={onSelectResolver}
          onAssignmentNoteChange={onAssignmentNoteChange}
          onAssign={onAssign}
          onOpenImage={onOpenImage}
        />
      ) : null}

      {ticket.status === "resolved" ? (
        <ResolvedTicketActions
          ticket={ticket}
          isProcessing={isProcessing}
          closureNote={closureNote}
          onClosureNoteChange={onClosureNoteChange}
          onCloseTicket={onCloseTicket}
          onOpenImage={onOpenImage}
        />
      ) : null}

      <Pressable
        onPress={onViewHistory}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed ? styles.controlPressed : null,
        ]}
        accessibilityRole="button"
        accessibilityLabel="View ticket history"
      >
        <Ionicons
          name="time-outline"
          size={16}
          color={theme.colors.textPrimary}
        />
        <Text style={styles.secondaryButtonText}>View ticket history</Text>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textMuted}
          style={styles.secondaryButtonChevron}
        />
      </Pressable>

      {errorMessage ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={theme.colors.red}
          />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function OpenTicketActions({
  ticket,
  isProcessing,
  resolvers,
  selectedResolverId,
  assignmentNote,
  onSelectResolver,
  onAssignmentNoteChange,
  onAssign,
  onOpenImage,
}: {
  ticket: Ticket;
  isProcessing: boolean;
  resolvers: ResolverOption[];
  selectedResolverId: string | null;
  assignmentNote: string;
  onSelectResolver: (resolverId: string) => void;
  onAssignmentNoteChange: (value: string) => void;
  onAssign: () => void;
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  const canAssign = !isProcessing && resolvers.length > 0 && !!selectedResolverId;

  return (
    <>
      {ticket.description ? (
        <Text style={styles.description}>{ticket.description}</Text>
      ) : null}
      {ticket.imageUrl ? (
        <TicketImagePreview
          uri={ticket.imageUrl}
          style={styles.ticketImage}
          onPress={() => onOpenImage(ticket.imageUrl as string)}
        />
      ) : null}

      <Text style={styles.fieldLabel}>Assign resolver</Text>
      <ManagerResolverPicker
        resolvers={resolvers}
        selectedResolverId={selectedResolverId}
        onSelectResolver={onSelectResolver}
      />

      <Text style={styles.fieldLabel}>Assignment note (optional)</Text>
      <TextInput
        value={assignmentNote}
        onChangeText={onAssignmentNoteChange}
        style={styles.input}
        placeholder="e.g. High priority, please check today"
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable
        onPress={onAssign}
        disabled={!canAssign}
        style={({ pressed }) => [
          styles.primaryButton,
          !canAssign ? styles.buttonDisabled : null,
          pressed && canAssign ? styles.controlPressed : null,
        ]}
      >
        <Ionicons
          name="person-add-outline"
          size={16}
          color={theme.colors.white}
        />
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Assigning…" : "Assign ticket"}
        </Text>
      </Pressable>
    </>
  );
}

function ResolvedTicketActions({
  ticket,
  isProcessing,
  closureNote,
  onClosureNoteChange,
  onCloseTicket,
  onOpenImage,
}: {
  ticket: Ticket;
  isProcessing: boolean;
  closureNote: string;
  onClosureNoteChange: (value: string) => void;
  onCloseTicket: () => void;
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  return (
    <>
      <ReviewBanner resolvedAt={ticket.resolvedAt} />

      {ticket.description ? (
        <>
          <Text style={styles.fieldLabel}>Original report</Text>
          <Text style={styles.description}>{ticket.description}</Text>
        </>
      ) : null}

      <View style={styles.imageCompareRow}>
        <ImageCompareSlot
          label="Reported"
          uri={ticket.imageUrl}
          onOpenImage={onOpenImage}
        />
        <ImageCompareSlot
          label="Resolved"
          uri={ticket.resolutionImageUrl}
          onOpenImage={onOpenImage}
        />
      </View>

      <Text style={styles.fieldLabel}>Resolver's note</Text>
      {ticket.resolutionNote && ticket.resolutionNote.trim().length > 0 ? (
        <View style={styles.resolutionNoteCard}>
          <Text style={styles.resolutionNoteText}>{ticket.resolutionNote}</Text>
        </View>
      ) : (
        <Text style={styles.emptyNoteText}>No resolution note was added.</Text>
      )}

      <Text style={styles.fieldLabel}>Closure note (optional)</Text>
      <TextInput
        value={closureNote}
        onChangeText={onClosureNoteChange}
        style={[styles.input, styles.multiline]}
        placeholder="Add a note for the reporter and resolver"
        placeholderTextColor={theme.colors.textMuted}
        multiline
      />

      <Pressable
        onPress={onCloseTicket}
        disabled={isProcessing}
        style={({ pressed }) => [
          styles.primaryButton,
          isProcessing ? styles.buttonDisabled : null,
          pressed && !isProcessing ? styles.controlPressed : null,
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={16}
          color={theme.colors.white}
        />
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Closing…" : "Close ticket"}
        </Text>
      </Pressable>
    </>
  );
}

function ReviewBanner({
  resolvedAt,
}: {
  resolvedAt: number | null;
}): React.JSX.Element {
  const submittedRelative = resolvedAt
    ? formatRelativeTimestamp(resolvedAt)
    : null;
  const submittedAbsolute = resolvedAt ? formatTimestamp(resolvedAt) : null;

  return (
    <View style={styles.reviewBanner}>
      <Ionicons
        name="checkmark-done-outline"
        size={16}
        color={theme.colors.success}
      />
      <View style={styles.reviewBannerText}>
        <Text style={styles.reviewBannerTitle}>Ready for closure</Text>
        {submittedRelative ? (
          <Text style={styles.reviewBannerMeta}>
            Resolved {submittedRelative}
            {submittedAbsolute ? ` · ${submittedAbsolute}` : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function ImageCompareSlot({
  label,
  uri,
  onOpenImage,
}: {
  label: string;
  uri: string | null;
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.imageCompareSlot}>
      <Text style={styles.imageCompareLabel}>{label}</Text>
      {uri ? (
        <TicketImagePreview
          uri={uri}
          style={styles.compareImage}
          onPress={() => onOpenImage(uri)}
        />
      ) : (
        <View style={[styles.compareImage, styles.compareImagePlaceholder]}>
          <Ionicons
            name="image-outline"
            size={20}
            color={theme.colors.textMuted}
          />
          <Text style={styles.compareImagePlaceholderText}>No photo</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.42)",
    justifyContent: "flex-end",
  },
  backdropDismiss: {
    flex: 1,
  },
  sheet: {
    maxHeight: "90%",
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderSoft,
    marginBottom: 8,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  meta: {
    fontSize: 12,
    fontWeight: "500",
    color: theme.colors.textMuted,
  },
  metaDot: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  closeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surfaceMuted,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.textSecondary,
  },
  ticketImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: "#ece6ce",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: "#fffdf6",
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 44,
  },
  multiline: {
    minHeight: 76,
    paddingTop: 11,
    textAlignVertical: "top",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    backgroundColor: theme.colors.black,
    paddingVertical: 13,
    minHeight: 44,
    marginTop: 4,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 11,
    minHeight: 44,
  },
  secondaryButtonText: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontWeight: "700",
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
  secondaryButtonChevron: {
    marginLeft: "auto",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  controlPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  reviewBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#e6f3ec",
    borderWidth: 1,
    borderColor: "rgba(23, 103, 57, 0.18)",
  },
  reviewBannerText: {
    flex: 1,
    gap: 2,
  },
  reviewBannerTitle: {
    color: theme.colors.success,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  reviewBannerMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  imageCompareRow: {
    flexDirection: "row",
    gap: 10,
  },
  imageCompareSlot: {
    flex: 1,
    gap: 6,
  },
  imageCompareLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  compareImage: {
    width: "100%",
    height: 130,
    borderRadius: 12,
    backgroundColor: "#ece6ce",
  },
  compareImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
  },
  compareImagePlaceholderText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  resolutionNoteCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.surfaceMuted,
    padding: 12,
  },
  resolutionNoteText: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyNoteText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontStyle: "italic",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  errorText: {
    color: theme.colors.red,
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
});
