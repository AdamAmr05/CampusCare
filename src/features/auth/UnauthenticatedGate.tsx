import React, { useState } from "react";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import type { OnboardingIntent } from "../../domain/types";
import { styles } from "../../ui/styles";
import { AuthForm } from "./AuthForm";

export function UnauthenticatedGate(props: {
  onIntentSelected: (intent: OnboardingIntent) => void;
}): React.JSX.Element {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [intent, setIntent] = useState<OnboardingIntent>("reporter");

  const continueWithIntent = (nextIntent: OnboardingIntent) => {
    setIntent(nextIntent);
    props.onIntentSelected(nextIntent);
    setShowAuthForm(true);
  };

  if (!showAuthForm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>CampusCare</Text>
          <Text style={styles.subtitle}>
            Sign in with a verified @*.giu-uni.de account to continue.
          </Text>

          <Pressable
            onPress={() => continueWithIntent("reporter")}
            style={[styles.button, styles.primaryButton]}
          >
            <Text style={styles.primaryButtonText}>Continue as Reporter</Text>
          </Pressable>

          <Pressable onPress={() => continueWithIntent("resolver")}>
            <Text style={styles.linkText}>If you are a resolver, go here</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <AuthForm
      intent={intent}
      onBack={() => setShowAuthForm(false)}
      onIntentChange={(nextIntent) => {
        setIntent(nextIntent);
        props.onIntentSelected(nextIntent);
      }}
    />
  );
}
