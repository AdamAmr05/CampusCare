import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import {
  Pressable,
  Text,
  View,
  type GestureResponderEvent,
} from "react-native";
import { theme } from "../../ui/theme";
import { TicketImagePreview } from "../tickets/TicketImagePreview";
import type { Ticket } from "../tickets/types";
import {
  formatRelativeTimestamp,
  getTicketStatusColors,
  getTicketStatusShortLabel,
  getTicketStatusStripeColor,
} from "../tickets/utils";
import { ticketCardStyles as styles } from "./ReporterTicketCard.styles";

export const ReporterTicketCard = memo(function ReporterTicketCard(props: {
  ticket: Ticket;
  onOpenDetails: (ticket: Ticket) => void;
  onOpenImage: (uri: string) => void;
}): React.JSX.Element {
  const { ticket, onOpenDetails, onOpenImage } = props;

  const statusColors = useMemo(
    () => getTicketStatusColors(ticket.status),
    [ticket.status],
  );
  const stripeColor = useMemo(
    () => getTicketStatusStripeColor(ticket.status),
    [ticket.status],
  );
  const statusLabel = useMemo(
    () => getTicketStatusShortLabel(ticket.status),
    [ticket.status],
  );
  const relativeUpdated = useMemo(
    () => formatRelativeTimestamp(ticket.updatedAt),
    [ticket.updatedAt],
  );

  const onPressImage = (event: GestureResponderEvent): void => {
    event.stopPropagation();
    if (ticket.imageUrl) {
      onOpenImage(ticket.imageUrl);
    }
  };

  return (
    <Pressable
      onPress={() => onOpenDetails(ticket)}
      style={({ pressed }) => [
        styles.container,
        pressed ? styles.pressed : null,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Ticket ${ticket.category}, status ${statusLabel}, location ${ticket.location}`}
    >
      <View style={styles.textColumn}>
        <View style={styles.topRow}>
          <View
            style={[styles.statusDot, { backgroundColor: stripeColor }]}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text style={styles.title} numberOfLines={1}>
            {ticket.category}
          </Text>
          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusColors.background },
            ]}
          >
            <Text
              style={[styles.statusPillText, { color: statusColors.text }]}
              maxFontSizeMultiplier={1.2}
            >
              {statusLabel}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Ionicons
            name="location-outline"
            size={12}
            color={theme.colors.textMuted}
          />
          <Text style={styles.metaText} numberOfLines={1}>
            {ticket.location}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText} numberOfLines={1}>
            {relativeUpdated}
          </Text>
        </View>
        {ticket.description ? (
          <Text
            style={styles.description}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {ticket.description}
          </Text>
        ) : null}
      </View>
      {ticket.imageUrl ? (
        <TicketImagePreview
          uri={ticket.imageUrl}
          style={styles.thumb}
          onPress={onPressImage}
        />
      ) : null}
    </Pressable>
  );
});
