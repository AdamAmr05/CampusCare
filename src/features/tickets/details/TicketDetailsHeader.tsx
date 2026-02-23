import React, { memo } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { styles } from "../TicketDetailsPanel.styles";

export const TicketDetailsHeader = memo(function TicketDetailsHeader(props: {
  onClose: () => void;
  style?: StyleProp<ViewStyle>;
}): React.JSX.Element {
  return (
    <View style={[styles.modalHeader, props.style]}>
      <Text style={styles.modalTitle}>Ticket Details</Text>
      <Pressable onPress={props.onClose} style={styles.modalCloseButton} hitSlop={12}>
        <Text style={styles.modalCloseButtonText}>Done</Text>
      </Pressable>
    </View>
  );
});
