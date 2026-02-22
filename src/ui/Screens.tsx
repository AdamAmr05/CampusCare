import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppScreen } from "./AppScreen";
import { theme } from "./theme";
import { styles } from "./Screens.styles";

export function LoadingScreen(props: { label: string }): React.JSX.Element {
  return (
    <AppScreen>
      <View style={styles.card}>
        <ActivityIndicator size="large" color={theme.colors.black} />
        <Text style={styles.subtitle}>{props.label}</Text>
      </View>
    </AppScreen>
  );
}

export function ErrorScreen(props: {
  title: string;
  message: string;
  footer?: React.ReactNode;
}): React.JSX.Element {
  return (
    <AppScreen>
      <View style={styles.card}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.errorText}>{props.message}</Text>
        {props.footer ?? null}
      </View>
    </AppScreen>
  );
}

export function InfoScreen(props: {
  title: string;
  message: string;
  footer?: React.ReactNode;
}): React.JSX.Element {
  return (
    <AppScreen>
      <View style={styles.card}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.subtitle}>{props.message}</Text>
        {props.footer ?? null}
      </View>
    </AppScreen>
  );
}
