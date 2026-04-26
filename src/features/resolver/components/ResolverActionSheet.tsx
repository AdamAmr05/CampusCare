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
import { GlassPressable } from "../../../ui/GlassSurface";
import { theme } from "../../../ui/theme";
import { TicketImagePreview } from "../../tickets/TicketImagePreview";
import type { Ticket } from "../../tickets/types";
import {
  formatRelativeTimestamp,
  formatTimestamp,
  getTicketStatusColors,
  getTicketStatusShortLabel,
} from "../../tickets/utils";
import type {
  TicketImageAsset,
  TicketImageSource,
} from "../../tickets/ticketImageSelection";

type Props = {
  ticket: Ticket | null;
  visible: boolean;
  isProcessing: boolean;
  progressNote: string;
  resolutionNote: string;
  resolutionImage: TicketImageAsset | null;
  imageSelectionSource: TicketImageSource | null;
  errorMessage: string;
  onClose: () => void;
  onProgressNoteChange: (value: string) => void;
  onResolutionNoteChange: (value: string) => void;
  onSelectResolutionImage: (source: TicketImageSource) => void;
  onRemoveResolutionImage: () => void;
  onOpenImage: (uri: string) => void;
  onStartWork: () => void;
  onResolve: () => void;
};

export function ResolverActionSheet({
  ticket,
  visible,
  isProcessing,
  progressNote,
  resolutionNote,
  resolutionImage,
  imageSelectionSource,
  errorMessage,
  onClose,
  onProgressNoteChange,
  onResolutionNoteChange,
  onSelectResolutionImage,
  onRemoveResolutionImage,
  onOpenImage,
  onStartWork,
  onResolve,
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
            <ResolverActionSheetBody
              ticket={ticket}
              isProcessing={isProcessing}
              progressNote={progressNote}
              resolutionNote={resolutionNote}
              resolutionImage={resolutionImage}
              imageSelectionSource={imageSelectionSource}
              errorMessage={errorMessage}
              onClose={onClose}
              onProgressNoteChange={onProgressNoteChange}
              onResolutionNoteChange={onResolutionNoteChange}
              onSelectResolutionImage={onSelectResolutionImage}
              onRemoveResolutionImage={onRemoveResolutionImage}
              onOpenImage={onOpenImage}
              onStartWork={onStartWork}
              onResolve={onResolve}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type BodyProps = Omit<Props, "visible"> & { ticket: Ticket };

function ResolverActionSheetBody({
  ticket,
  isProcessing,
  progressNote,
  resolutionNote,
  resolutionImage,
  imageSelectionSource,
  errorMessage,
  onClose,
  onProgressNoteChange,
  onResolutionNoteChange,
  onSelectResolutionImage,
  onRemoveResolutionImage,
  onOpenImage,
  onStartWork,
  onResolve,
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
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusColors.background },
          ]}
        >
          <Text
            style={[styles.statusPillText, { color: statusColors.text }]}
          >
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

      {ticket.description ? (
        <Text style={styles.description}>{ticket.description}</Text>
      ) : null}

      {ticket.status === "assigned" ? (
        <AssignedActions
          isProcessing={isProcessing}
          note={progressNote}
          onNoteChange={onProgressNoteChange}
          onStartWork={onStartWork}
        />
      ) : null}

      {ticket.status === "in_progress" ? (
        <InProgressActions
          isProcessing={isProcessing}
          note={resolutionNote}
          resolutionImage={resolutionImage}
          imageSelectionSource={imageSelectionSource}
          onNoteChange={onResolutionNoteChange}
          onPickImage={onSelectResolutionImage}
          onRemoveImage={onRemoveResolutionImage}
          onOpenImage={onOpenImage}
          onResolve={onResolve}
        />
      ) : null}

      {ticket.status === "resolved" ? (
        <ResolvedActions ticket={ticket} onOpenImage={onOpenImage} />
      ) : null}

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

function AssignedActions({
  isProcessing,
  note,
  onNoteChange,
  onStartWork,
}: {
  isProcessing: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onStartWork: () => void;
}): React.JSX.Element {
  return (
    <>
      <Text style={styles.fieldLabel}>Optional progress note</Text>
      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={styles.input}
        placeholder="e.g. Dispatched and on site"
        placeholderTextColor={theme.colors.textMuted}
      />
      <Pressable
        onPress={onStartWork}
        disabled={isProcessing}
        style={({ pressed }) => [
          styles.primaryButton,
          isProcessing ? styles.buttonDisabled : null,
          pressed && !isProcessing ? styles.controlPressed : null,
        ]}
      >
        <Ionicons
          name="play-circle-outline"
          size={16}
          color={theme.colors.white}
        />
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Updating…" : "Start work"}
        </Text>
      </Pressable>
    </>
  );
}

function InProgressActions({
  isProcessing,
  note,
  resolutionImage,
  imageSelectionSource,
  onNoteChange,
  onPickImage,
  onRemoveImage,
  onOpenImage,
  onResolve,
}: {
  isProcessing: boolean;
  note: string;
  resolutionImage: TicketImageAsset | null;
  imageSelectionSource: TicketImageSource | null;
  onNoteChange: (value: string) => void;
  onPickImage: (source: TicketImageSource) => void;
  onRemoveImage: () => void;
  onOpenImage: (uri: string) => void;
  onResolve: () => void;
}): React.JSX.Element {
  const imageActionDisabled = isProcessing || imageSelectionSource !== null;
  return (
    <>
      <Text style={styles.fieldLabel}>Resolution note</Text>
      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={[styles.input, styles.multiline]}
        placeholder="What was done to resolve this?"
        placeholderTextColor={theme.colors.textMuted}
        multiline
      />

      <Text style={styles.fieldLabel}>Photo (optional)</Text>
      {resolutionImage ? (
        <View style={styles.thumbRow}>
          <TicketImagePreview
            uri={resolutionImage.uri}
            style={styles.thumb}
            onPress={() => onOpenImage(resolutionImage.uri)}
          />
          <View style={styles.thumbActions}>
            <GlassPressable
              onPress={() => onPickImage("library")}
              disabled={imageActionDisabled}
              surfaceStyle={styles.thumbActionButton}
              pressedSurfaceStyle={styles.controlPressed}
            >
              <Ionicons
                name="refresh-outline"
                size={14}
                color={theme.colors.textPrimary}
              />
              <Text style={styles.thumbActionText}>Replace</Text>
            </GlassPressable>
            <Pressable
              onPress={onRemoveImage}
              style={({ pressed }) => [
                styles.thumbRemoveButton,
                pressed ? styles.controlPressed : null,
              ]}
            >
              <Ionicons name="close" size={14} color={theme.colors.red} />
              <Text style={styles.thumbRemoveText}>Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.photoZone}>
          <PhotoSourceButton
            icon="camera-outline"
            label={imageSelectionSource === "camera" ? "Opening…" : "Camera"}
            disabled={imageActionDisabled}
            onPress={() => onPickImage("camera")}
          />
          <PhotoSourceButton
            icon="images-outline"
            label={imageSelectionSource === "library" ? "Opening…" : "Library"}
            disabled={imageActionDisabled}
            onPress={() => onPickImage("library")}
          />
        </View>
      )}

      <Pressable
        onPress={onResolve}
        disabled={isProcessing}
        style={({ pressed }) => [
          styles.primaryButton,
          isProcessing ? styles.buttonDisabled : null,
          pressed && !isProcessing ? styles.controlPressed : null,
        ]}
      >
        <Ionicons
          name="checkmark-done-outline"
          size={16}
          color={theme.colors.white}
        />
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Submitting…" : "Mark resolved"}
        </Text>
      </Pressable>
    </>
  );
}

function ResolvedActions({
  ticket,
  onOpenImage,
}: {
  ticket: Ticket;
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  const submittedRelative = ticket.resolvedAt
    ? formatRelativeTimestamp(ticket.resolvedAt)
    : null;
  const submittedAbsolute = ticket.resolvedAt
    ? formatTimestamp(ticket.resolvedAt)
    : null;

  return (
    <View style={styles.awaitingBlock}>
      <View style={styles.awaitingBanner}>
        <Ionicons
          name="hourglass-outline"
          size={16}
          color={theme.colors.success}
        />
        <View style={styles.awaitingBannerText}>
          <Text style={styles.awaitingTitle}>Awaiting manager closure</Text>
          {submittedRelative ? (
            <Text style={styles.awaitingMeta}>
              You submitted this resolution {submittedRelative}
              {submittedAbsolute ? ` · ${submittedAbsolute}` : ""}
            </Text>
          ) : (
            <Text style={styles.awaitingMeta}>
              The manager will review and close this ticket.
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.fieldLabel}>Your resolution note</Text>
      {ticket.resolutionNote && ticket.resolutionNote.trim().length > 0 ? (
        <View style={styles.resolutionNoteCard}>
          <Text style={styles.resolutionNoteText}>{ticket.resolutionNote}</Text>
        </View>
      ) : (
        <Text style={styles.emptyNoteText}>No resolution note was added.</Text>
      )}

      <Text style={styles.fieldLabel}>Resolution photo</Text>
      {ticket.resolutionImageUrl ? (
        <TicketImagePreview
          uri={ticket.resolutionImageUrl}
          style={styles.resolutionImage}
          onPress={() => onOpenImage(ticket.resolutionImageUrl as string)}
        />
      ) : (
        <Text style={styles.emptyNoteText}>No photo was attached.</Text>
      )}
    </View>
  );
}

function PhotoSourceButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <GlassPressable
      onPress={onPress}
      disabled={disabled}
      containerStyle={styles.photoZoneAction}
      surfaceStyle={styles.photoButton}
      pressedSurfaceStyle={styles.controlPressed}
    >
      <Ionicons name={icon} size={16} color={theme.colors.textPrimary} />
      <Text style={styles.photoButtonText}>{label}</Text>
    </GlassPressable>
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
    maxHeight: "86%",
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
    minHeight: 88,
    paddingTop: 11,
    textAlignVertical: "top",
  },
  photoZone: {
    flexDirection: "row",
    gap: 8,
  },
  photoZoneAction: {
    flex: 1,
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.glassFallbackMuted,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  photoButtonText: {
    color: theme.colors.textPrimary,
    fontWeight: "600",
    fontSize: 13,
  },
  thumbRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumb: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: "#ece6ce",
  },
  thumbActions: {
    flex: 1,
    gap: 8,
  },
  thumbActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: theme.colors.glassFallbackMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  thumbActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  thumbRemoveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.redSoft,
    backgroundColor: "rgba(248, 197, 197, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: "center",
  },
  thumbRemoveText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.red,
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
  buttonDisabled: {
    opacity: 0.6,
  },
  controlPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  awaitingBlock: {
    gap: 10,
  },
  awaitingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#e6f3ec",
    borderWidth: 1,
    borderColor: "rgba(23, 103, 57, 0.18)",
  },
  awaitingBannerText: {
    flex: 1,
    gap: 2,
  },
  awaitingTitle: {
    color: theme.colors.success,
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: -0.1,
  },
  awaitingMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
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
  resolutionImage: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    backgroundColor: "#ece6ce",
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
