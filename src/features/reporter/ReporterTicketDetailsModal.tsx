import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import React, { memo, useMemo } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { theme } from "../../ui/theme";
import { TicketImagePreview } from "../tickets/TicketImagePreview";
import type { Ticket, TicketWithHistory } from "../tickets/types";
import { formatTimestamp, getTicketStatusColors, getTicketStatusLabel } from "../tickets/utils";
import { styles } from "./ReporterHome.styles";

export const ReporterTicketDetailsModal = memo(function ReporterTicketDetailsModal(props: {
  visible: boolean;
  selectedTicketId: Id<"tickets"> | null;
  previewTicket: Ticket | null;
  onClose: () => void;
  onClosed: () => void;
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  const selectedTicket = useQuery(
    api.ticketsReporter.getMineById,
    props.selectedTicketId ? { ticketId: props.selectedTicketId } : "skip",
  ) as TicketWithHistory | null | undefined;

  const selectedStatusColors = useMemo(
    () => (selectedTicket ? getTicketStatusColors(selectedTicket.ticket.status) : null),
    [selectedTicket?.ticket.status],
  );
  const displayTicket = selectedTicket?.ticket ?? props.previewTicket;
  const displayStatusColors = displayTicket ? getTicketStatusColors(displayTicket.status) : null;
  const ticketImageUrl = displayTicket?.imageUrl ?? null;
  const resolutionImageUrl = selectedTicket?.ticket.resolutionImageUrl ?? null;

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      allowSwipeDismissal={false}
      hardwareAccelerated={Platform.OS === "android"}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={props.onClose}
      onDismiss={props.onClosed}
    >
      <View style={styles.detailsScreen}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Ticket Details</Text>
          <Pressable onPress={props.onClose} style={styles.modalCloseButton} hitSlop={10}>
            <Text style={styles.modalCloseButtonText}>Done</Text>
          </Pressable>
        </View>

        {displayTicket === null ? (
          <View style={styles.detailsContent}>
            <Text style={styles.ticketMeta}>Ticket not found.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailsContent}
            contentInsetAdjustmentBehavior="automatic"
            bounces={false}
          >
            <View style={styles.summaryCard}>
              <View style={styles.summaryHead}>
                <Text style={styles.summaryTitle}>{displayTicket.category}</Text>
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                  <Text style={styles.summaryLocation}>{displayTicket.location}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  styles.summaryStatusBadge,
                  {
                    backgroundColor:
                      selectedStatusColors?.background ??
                      displayStatusColors?.background ??
                      theme.colors.surfaceMuted,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    {
                      color:
                        selectedStatusColors?.text ??
                        displayStatusColors?.text ??
                        theme.colors.textSecondary,
                    },
                  ]}
                >
                  {getTicketStatusLabel(displayTicket.status)}
                </Text>
              </View>
              {ticketImageUrl ? (
                <TicketImagePreview
                  uri={ticketImageUrl}
                  style={styles.modalImage}
                  onPress={() => props.onOpenImage(ticketImageUrl)}
                />
              ) : null}
              <Text style={styles.modalDescriptionLabel}>Description</Text>
              <Text style={styles.modalDescription}>{displayTicket.description}</Text>
              {selectedTicket?.ticket.resolutionNote ? (
                <>
                  <Text style={styles.modalResolutionLabel}>Resolution Note</Text>
                  <Text style={styles.modalDescription}>{selectedTicket.ticket.resolutionNote}</Text>
                </>
              ) : selectedTicket === undefined ? (
                <View style={styles.modalSkeletonBlock} />
              ) : null}
              {resolutionImageUrl ? (
                <TicketImagePreview
                  uri={resolutionImageUrl}
                  style={styles.modalImage}
                  onPress={() => props.onOpenImage(resolutionImageUrl)}
                />
              ) : null}
            </View>

            <Text style={styles.modalSection}>Status History</Text>
            {selectedTicket === undefined ? (
              <View style={styles.modalSkeletonHistory}>
                <View style={styles.modalSkeletonLine} />
                <View style={styles.modalSkeletonLineShort} />
                <View style={styles.modalSkeletonLine} />
              </View>
            ) : selectedTicket === null ? (
              <Text style={styles.ticketMeta}>No history available.</Text>
            ) : (
              <View style={styles.timelineContainer}>
                {selectedTicket.history.map((entry, index) => {
                  const isLast = index === selectedTicket.history.length - 1;
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
      </View>
    </Modal>
  );
});
