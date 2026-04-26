import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";
import type { Ticket } from "../../tickets/types";

type Props = {
  ticket: Ticket;
};

export function ResolverActionHint({ ticket }: Props): React.JSX.Element | null {
  if (ticket.status === "assigned") {
    return (
      <View style={styles.row}>
        <Ionicons
          name="play-circle-outline"
          size={14}
          color={theme.colors.statusAssigned}
        />
        <Text style={[styles.text, { color: theme.colors.statusAssigned }]}>
          Tap to start work
        </Text>
      </View>
    );
  }
  if (ticket.status === "in_progress") {
    return (
      <View style={styles.row}>
        <Ionicons
          name="checkmark-done-outline"
          size={14}
          color={theme.colors.statusInProgress}
        />
        <Text style={[styles.text, { color: theme.colors.statusInProgress }]}>
          Tap to submit resolution
        </Text>
      </View>
    );
  }
  if (ticket.status === "resolved") {
    return (
      <View style={styles.row}>
        <Ionicons
          name="hourglass-outline"
          size={14}
          color={theme.colors.success}
        />
        <Text style={[styles.text, { color: theme.colors.success }]}>
          Awaiting manager closure
        </Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});
