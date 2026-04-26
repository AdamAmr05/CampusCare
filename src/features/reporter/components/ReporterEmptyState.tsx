import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { CampusCareIllustration } from "../../../ui/CampusCareIllustration";
import { theme } from "../../../ui/theme";

export function ReporterEmptyState(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <CampusCareIllustration
        accessibilityLabel="No tickets illustration"
        name="ticketClosed"
        style={styles.illustration}
      />
      <Text style={styles.title}>No tickets yet</Text>
      <Text style={styles.body}>
        Submit your first issue when something needs attention.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 6,
  },
  illustration: {
    width: 116,
    height: 116,
  },
  title: {
    marginTop: 4,
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: "700",
  },
  body: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
