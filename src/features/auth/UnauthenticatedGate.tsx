import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { OnboardingIntent } from "../../domain/types";
import { AppScreen } from "../../ui/AppScreen";
import { CampusCareIllustration } from "../../ui/CampusCareIllustration";
import { AuthForm } from "./AuthForm";
import { styles } from "./UnauthenticatedGate.styles";

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
      <AppScreen>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <Text style={styles.badge}>CampusCare GIU</Text>
            <CampusCareIllustration
              accessibilityLabel="Ticket reporting illustration"
              name="ticketReport"
              style={styles.heroIllustration}
            />
          </View>
          <Text style={styles.title}>Report Campus Issues Fast</Text>
          <Text style={styles.subtitle}>
            Secure access with verified GIU email. Track every issue through assignment, work, and
            manager closure.
          </Text>

          <Pressable onPress={() => continueWithIntent("reporter")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Continue as Reporter</Text>
          </Pressable>

          <Pressable onPress={() => continueWithIntent("resolver")} style={styles.linkButton}>
            <Text style={styles.linkText}>Resolver access request</Text>
          </Pressable>
        </View>
      </AppScreen>
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
