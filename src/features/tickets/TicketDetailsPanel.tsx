import React, { memo, useCallback, useMemo, useState } from "react";
import { Modal, Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Ticket, TicketStatusHistoryEntry } from "./types";
import { styles } from "./TicketDetailsPanel.styles";
import { getTicketStatusColors } from "./utils";
import { TicketDetailsHeader } from "./details/TicketDetailsHeader";
import { TicketDetailsHistorySection } from "./details/TicketDetailsHistorySection";
import { TicketDetailsInlineLightbox } from "./details/TicketDetailsInlineLightbox";
import { TicketDetailsSummaryCard } from "./details/TicketDetailsSummaryCard";

export const TicketDetailsPanel = memo(function TicketDetailsPanel(props: {
  visible: boolean;
  ticket: Ticket | null;
  historyEntries?: TicketStatusHistoryEntry[] | null;
  historyUnavailableText?: string;
  onClose: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);
  const { ticket, historyEntries, historyUnavailableText, visible } = props;

  const statusColors = useMemo(
    () => (ticket ? getTicketStatusColors(ticket.status) : null),
    [ticket?.status],
  );

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
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      allowSwipeDismissal={Platform.OS === "ios"}
      hardwareAccelerated={Platform.OS === "android"}
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={closeDetails}
      onDismiss={closeDetails}
    >
      <View style={styles.detailsScreen}>
        <TicketDetailsHeader onClose={closeDetails} style={headerStyle} />

        {ticket === null ? (
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
            {ticket && statusColors ? (
              <TicketDetailsSummaryCard
                ticket={ticket}
                statusColors={statusColors}
                onOpenImage={openImage}
              />
            ) : null}
            <TicketDetailsHistorySection
              historyEntries={historyEntries}
              historyUnavailableText={historyUnavailableText}
            />
          </ScrollView>
        )}
        <TicketDetailsInlineLightbox
          imageUri={lightboxImageUri}
          topInset={insets.top}
          onClose={closeLightbox}
        />
      </View>
    </Modal>
  );
});
