import { Ionicons } from "@expo/vector-icons";
import React, { memo } from "react";
import { Text, View } from "react-native";
import { theme } from "../../../ui/theme";
import { styles } from "../TicketDetailsPanel.styles";
import type { TicketStatusHistoryEntry } from "../types";
import { formatTimestamp, getTicketStatusShortLabel } from "../utils";

export const TicketDetailsHistorySection = memo(function TicketDetailsHistorySection(props: {
  historyEntries?: TicketStatusHistoryEntry[] | null;
  historyUnavailableText?: string;
}): React.JSX.Element {
  const { historyEntries } = props;

  return (
    <>
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
                  <Text style={styles.historyLine}>
                    {`${getTicketStatusShortLabel(entry.fromStatus)} → ${getTicketStatusShortLabel(entry.toStatus)}`}
                  </Text>
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
    </>
  );
});
