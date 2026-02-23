import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { theme } from "../../../ui/theme";
import { TicketImagePreview } from "../TicketImagePreview";
import { styles } from "../TicketDetailsPanel.styles";
import type { Ticket } from "../types";
import { getTicketStatusLabel } from "../utils";

export const TicketDetailsSummaryCard = memo(function TicketDetailsSummaryCard(props: {
  ticket: Ticket;
  statusColors: {
    background: string;
    text: string;
  };
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  const { ticket, statusColors, onOpenImage } = props;
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
          { backgroundColor: statusColors.background },
        ]}
      >
        <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
          {getTicketStatusLabel(ticket.status)}
        </Text>
      </View>
      {ticketImageUrl ? (
        <TicketImagePreview
          uri={ticketImageUrl}
          style={styles.modalImage}
          onPress={() => onOpenImage(ticketImageUrl)}
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
          onPress={() => onOpenImage(resolutionImageUrl)}
        />
      ) : null}
    </View>
  );
});
