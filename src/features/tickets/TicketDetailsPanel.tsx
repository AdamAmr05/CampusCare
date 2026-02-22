import { Ionicons } from "@expo/vector-icons";
import React, { memo, useCallback, useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../ui/theme";
import { TicketImagePreview } from "./TicketImagePreview";
import type { Ticket, TicketStatusHistoryEntry } from "./types";
import { formatTimestamp, getTicketStatusColors, getTicketStatusLabel } from "./utils";
import { styles } from "./TicketDetailsPanel.styles";

export const TicketDetailsPanel = memo(function TicketDetailsPanel(props: {
  visible: boolean;
  ticket: Ticket | null;
  historyEntries?: TicketStatusHistoryEntry[] | null;
  historyUnavailableText?: string;
  onClose: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);

  const statusColors = useMemo(
    () => (props.ticket ? getTicketStatusColors(props.ticket.status) : null),
    [props.ticket?.status],
  );
  const historyEntries = props.historyEntries;

  const closeDetails = useCallback(() => {
    setLightboxImageUri(null);
    props.onClose();
  }, [props.onClose]);

  const openImage = useCallback((uri: string) => {
    setLightboxImageUri(uri);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxImageUri(null);
  }, []);

  const headerStyle = useMemo(
    () => [
      styles.modalHeader,
      Platform.OS === "android" ? { paddingTop: Math.max(insets.top, 12) } : null,
    ],
    [insets.top],
  );

  const contentStyle = useMemo(
    () => [styles.detailsContent, { paddingBottom: insets.bottom + 40 }],
    [insets.bottom],
  );

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      allowSwipeDismissal={Platform.OS === "ios"}
      hardwareAccelerated={Platform.OS === "android"}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={closeDetails}
      onDismiss={closeDetails}
    >
      <View style={styles.detailsScreen}>
        <View style={headerStyle}>
          <Text style={styles.modalTitle}>Ticket Details</Text>
          <Pressable onPress={closeDetails} style={styles.modalCloseButton} hitSlop={12}>
            <Text style={styles.modalCloseButtonText}>Done</Text>
          </Pressable>
        </View>

        {props.ticket === null ? (
          <View style={contentStyle}>
            <Text style={styles.ticketMeta}>Ticket not found.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={contentStyle}
            contentInsetAdjustmentBehavior="automatic"
            bounces={false}
          >
            {(() => {
              const ticket = props.ticket;

              if (!ticket) {
                return null;
              }
              const ticketImageUrl = ticket.imageUrl;
              const resolutionImageUrl = ticket.resolutionImageUrl;

              return (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryHead}>
                    <Text style={styles.summaryTitle}>{ticket.category}</Text>
                    <View style={styles.locationRow}>
                      <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                      <Text style={styles.summaryLocation}>{ticket.location}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      styles.summaryStatusBadge,
                      { backgroundColor: statusColors?.background ?? theme.colors.surfaceMuted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: statusColors?.text ?? theme.colors.textSecondary },
                      ]}
                    >
                      {getTicketStatusLabel(ticket.status)}
                    </Text>
                  </View>
                  {ticketImageUrl ? (
                    <TicketImagePreview
                      uri={ticketImageUrl}
                      style={styles.modalImage}
                      onPress={() => openImage(ticketImageUrl)}
                    />
                  ) : null}
                  <Text style={styles.modalDescriptionLabel}>Description</Text>
                  <Text style={styles.modalDescription}>{ticket.description}</Text>
                  {ticket.resolutionNote ? (
                    <>
                      <Text style={styles.modalResolutionLabel}>Resolution Note</Text>
                      <Text style={styles.modalDescription}>{ticket.resolutionNote}</Text>
                    </>
                  ) : null}
                  {resolutionImageUrl ? (
                    <TicketImagePreview
                      uri={resolutionImageUrl}
                      style={styles.modalImage}
                      onPress={() => openImage(resolutionImageUrl)}
                    />
                  ) : null}
                </View>
              );
            })()}

            <Text style={styles.modalSection}>Status History</Text>
            {historyEntries === undefined ? (
              <View style={styles.modalSkeletonHistory}>
                <View style={styles.modalSkeletonLine} />
                <View style={styles.modalSkeletonLineShort} />
                <View style={styles.modalSkeletonLine} />
              </View>
            ) : historyEntries === null ? (
              <Text style={styles.ticketMeta}>
                {props.historyUnavailableText ?? "Status history is not available in this view."}
              </Text>
            ) : (
              <View style={styles.timelineContainer}>
                {historyEntries.map((entry, index) => {
                  const isLast = index === historyEntries.length - 1;
                  return (
                    <View key={entry._id} style={styles.timelineItem}>
                      <View style={styles.timelineLeft}>
                        <View style={styles.timelineDot} />
                        {!isLast ? <View style={styles.timelineLine} /> : null}
                      </View>
                      <View style={styles.timelineContent}>
                        <Text style={styles.historyLine}>{`${entry.fromStatus ?? "none"} -> ${entry.toStatus}`}</Text>
                        <Text style={styles.ticketMeta}>{formatTimestamp(entry.changedAt)}</Text>
                        {entry.note ? (
                          <View style={styles.historyNote}>
                            <View style={styles.historyNoteHeader}>
                              <Ionicons
                                name="chatbubble-outline"
                                size={14}
                                color={theme.colors.textSecondary}
                              />
                              <Text style={styles.historyNoteLabel}>Comment</Text>
                            </View>
                            <Text style={styles.historyNoteText}>{entry.note}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
        {lightboxImageUri ? (
          <View style={styles.lightboxOverlay}>
            <Pressable style={styles.lightboxDismissArea} onPress={closeLightbox} />
            <View style={styles.lightboxContent} pointerEvents="box-none">
              <Image source={{ uri: lightboxImageUri }} style={styles.lightboxImage} resizeMode="contain" />
            </View>
            <Pressable
              style={[styles.lightboxCloseButton, { top: insets.top + 10 }]}
              onPress={closeLightbox}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Close image preview"
            >
              <Ionicons name="close" size={18} color="#ffffff" />
              <Text style={styles.lightboxCloseButtonText}>Close</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </Modal>
  );
});
