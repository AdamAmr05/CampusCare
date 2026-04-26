import { Image as ExpoImage } from "expo-image";
import React from "react";
import { StyleSheet, type ImageStyle, type StyleProp } from "react-native";

export type CampusCareIllustrationName =
  | "welcomeCampus"
  | "ticketReport"
  | "campusLocation"
  | "maintenanceTools"
  | "managerAssignment"
  | "resolverProgress"
  | "ticketClosed";

const illustrationSources = {
  welcomeCampus: require("../../assets/illustrations/welcome-campus.png"),
  ticketReport: require("../../assets/illustrations/ticket-report.png"),
  campusLocation: require("../../assets/illustrations/campus-location.png"),
  maintenanceTools: require("../../assets/illustrations/maintenance-tools.png"),
  managerAssignment: require("../../assets/illustrations/manager-assignment.png"),
  resolverProgress: require("../../assets/illustrations/resolver-progress.png"),
  ticketClosed: require("../../assets/illustrations/ticket-closed.png"),
} as const;

export function CampusCareIllustration(props: {
  accessibilityLabel: string;
  name: CampusCareIllustrationName;
  style?: StyleProp<ImageStyle>;
}): React.JSX.Element {
  return (
    <ExpoImage
      accessibilityLabel={props.accessibilityLabel}
      contentFit="contain"
      source={illustrationSources[props.name]}
      style={[styles.image, props.style]}
      transition={120}
    />
  );
}

const styles = StyleSheet.create({
  image: {
    height: 112,
    width: 112,
  },
});
