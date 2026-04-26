import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { OnboardingIntent } from "../../domain/types";
import { AppScreen } from "../../ui/AppScreen";
import { CampusCareIllustration } from "../../ui/CampusCareIllustration";
import { theme } from "../../ui/theme";
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

  if (showAuthForm) {
    return (
      <AuthForm
        intent={intent}
        onBack={() => setShowAuthForm(false)}
      />
    );
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.screenContent}>
      <View style={styles.cardWrapper}>
        <CardHeader />
        <View style={styles.heroCard}>
          <CardBody
            onContinueAsReporter={() => continueWithIntent("reporter")}
            onResolverAccess={() => continueWithIntent("resolver")}
          />
        </View>
        <CardFooter />
      </View>
    </AppScreen>
  );
}

function CardHeader(): React.JSX.Element {
  return (
    <View style={styles.headerZone}>
      <CampusCareIllustration
        accessibilityLabel="CampusCare GIU welcome illustration"
        name="welcomeCampus"
        style={styles.heroIllustration}
      />
    </View>
  );
}

function CardBody({
  onContinueAsReporter,
  onResolverAccess,
}: {
  onContinueAsReporter: () => void;
  onResolverAccess: () => void;
}): React.JSX.Element {
  return (
    <View style={styles.bodyZone}>
      <View style={styles.copyBlock}>
        <Text style={styles.title}>Report Campus{"\n"}Issues Fast</Text>
        <Text style={styles.subtitle}>
          Report any issue on campus and track it from the moment you submit
          until it's resolved.
        </Text>
      </View>

      <Pressable
        onPress={onContinueAsReporter}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.primaryButtonPressed : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>Continue as Reporter</Text>
        <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
      </Pressable>

      <Pressable
        onPress={onResolverAccess}
        style={({ pressed }) => [
          styles.resolverLink,
          pressed ? styles.resolverLinkPressed : null,
        ]}
        hitSlop={6}
      >
        <Ionicons
          name="construct-outline"
          size={14}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.resolverLinkText}>
          Joining as a resolver? Request access
        </Text>
      </Pressable>
    </View>
  );
}

function CardFooter(): React.JSX.Element {
  return (
    <View style={styles.footerZone}>
      <Ionicons
        name="mail-outline"
        size={12}
        color={theme.colors.textMuted}
      />
      <Text style={styles.footerText}>
        Need help? Contact facilities@giu-uni.de
      </Text>
    </View>
  );
}
