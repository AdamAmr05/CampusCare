import React from "react";
import { ActivityIndicator, Pressable, SafeAreaView, Text, View } from "react-native";
import { styles } from "./styles";

export function LoadingScreen(props: { label: string }): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#0055cc" />
        <Text style={styles.subtitle}>{props.label}</Text>
      </View>
    </SafeAreaView>
  );
}

export function ErrorScreen(props: {
  title: string;
  message: string;
  footer?: React.ReactNode;
}): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.errorText}>{props.message}</Text>
        {props.footer ?? null}
      </View>
    </SafeAreaView>
  );
}

export function InfoScreen(props: {
  title: string;
  message: string;
  footer?: React.ReactNode;
}): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{props.title}</Text>
        <Text style={styles.subtitle}>{props.message}</Text>
        {props.footer ?? null}
      </View>
    </SafeAreaView>
  );
}

export function RoleHome(props: {
  role: "Reporter" | "Resolver";
  email: string;
  description: string;
  onSignOut: () => void;
}): React.JSX.Element {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{props.role} Home</Text>
        <Text style={styles.subtitle}>{props.description}</Text>
        <Text style={styles.metaText}>Signed in as {props.email}</Text>

        <Pressable onPress={props.onSignOut} style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
