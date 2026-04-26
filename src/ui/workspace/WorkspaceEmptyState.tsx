import React from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  CampusCareIllustration,
  type CampusCareIllustrationName,
} from "../CampusCareIllustration";
import { theme } from "../theme";

type Props = {
  illustration: CampusCareIllustrationName;
  title: string;
  body: string;
};

export function WorkspaceEmptyState({
  illustration,
  title,
  body,
}: Props): React.JSX.Element {
  return (
    <View style={styles.container}>
      <CampusCareIllustration
        accessibilityLabel={`${title} illustration`}
        name={illustration}
        style={styles.illustration}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
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
