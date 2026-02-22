import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Pressable, Text, View, type GestureResponderEvent } from "react-native";
import { theme } from "../../ui/theme";
import { TicketImagePreview } from "../tickets/TicketImagePreview";
import type { Ticket } from "../tickets/types";
import { formatTimestamp, getTicketStatusColors, getTicketStatusLabel, truncateText } from "../tickets/utils";
import { styles } from "./ReporterHome.styles";

export const ReporterTicketCard = memo(function ReporterTicketCard(props: {
  ticket: Ticket;
  onOpenDetails: (ticket: Ticket) => void;
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  const { ticket, onOpenDetails, onOpenImage } = props;
  const statusColors = useMemo(() => getTicketStatusColors(ticket.status), [ticket.status]);

  const onPressImage = (event: GestureResponderEvent): void => {
    event.stopPropagation();
    if (ticket.imageUrl) {
      onOpenImage(ticket.imageUrl);
    }
  };

  return (
    <Pressable style={styles.ticketCard} onPress={() => onOpenDetails(ticket)}>
      <View style={styles.ticketHeaderRow}>
        <Text style={styles.ticketTitle}>{ticket.category}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColors.background }]}>
          <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
            {getTicketStatusLabel(ticket.status)}
          </Text>
        </View>
      </View>

      <View style={styles.locationRow}>
        <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
        <Text style={styles.ticketMeta}>{ticket.location}</Text>
      </View>
      {ticket.imageUrl ? (
        <TicketImagePreview uri={ticket.imageUrl} style={styles.ticketCardImage} onPress={onPressImage} />
      ) : null}
      <Text style={styles.ticketDescription}>{truncateText(ticket.description, 110)}</Text>
      <Text style={styles.ticketMeta}>Updated {formatTimestamp(ticket.updatedAt)}</Text>
    </Pressable>
  );
});
