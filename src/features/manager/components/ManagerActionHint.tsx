import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../ui/theme";
import type { Ticket } from "../../tickets/types";

type Props = {
  ticket: Ticket;
};

export function ManagerActionHint({ ticket }: Props): React.JSX.Element | null {
  if (ticket.status === "open") {
    return (
      <View style={styles.row}>
        <Ionicons
          name="person-add-outline"
          size={14}
          color={theme.colors.statusOpen}
        />
        <Text style={[styles.text, { color: theme.colors.statusOpen }]}>
          Tap to assign
        </Text>
      </View>
    );
  }
  if (ticket.status === "resolved") {
    return (
      <View style={styles.row}>
        <Ionicons
          name="checkmark-done-outline"
          size={14}
          color={theme.colors.success}
        />
        <Text style={[styles.text, { color: theme.colors.success }]}>
          Tap to review and close
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
