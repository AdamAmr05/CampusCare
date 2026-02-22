import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import type { OnboardingIntent } from "../../domain/types";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { styles } from "./AuthForm.styles";

export function AuthForm(props: {
  intent: OnboardingIntent;
  onBack: () => void;
  onIntentChange: (intent: OnboardingIntent) => void;
}): React.JSX.Element {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const loaded = signInLoaded && signUpLoaded;

  const submitSignIn = async () => {
    if (!loaded || !signIn) {
      return;
    }

    const identifier = email.trim().toLowerCase();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const signInAttempt = await signIn.create({
        identifier,
        password,
      });

      if (signInAttempt.status !== "complete") {
        throw new Error("Sign-in requires additional steps. Please try again.");
      }

      if (!signInAttempt.createdSessionId) {
        throw new Error("Sign-in completed without a session.");
      }

      await setActiveSignIn({ session: signInAttempt.createdSessionId });
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSignUp = async () => {
    if (!loaded || !signUp) {
      return;
    }

    const emailAddress = email.trim().toLowerCase();

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await signUp.create({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setAwaitingVerification(true);
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifySignUp = async () => {
    if (!loaded || !signUp) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const verificationAttempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      if (verificationAttempt.status !== "complete") {
        throw new Error("Verification code is invalid or expired.");
      }

      if (!verificationAttempt.createdSessionId) {
        throw new Error("Verification completed without a session.");
      }

      await setActiveSignUp({ session: verificationAttempt.createdSessionId });
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const heading = props.intent === "resolver" ? "Resolver Access Request" : "Reporter Sign In";

  return (
    <AppScreen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>{heading}</Text>
        <Text style={styles.subtitle}>
          {props.intent === "resolver"
            ? "Use your GIU account. Manager approval is required before resolver access is active."
            : "Sign in with your verified GIU email to report and track issues."}
        </Text>

        <View style={styles.pathRow}>
          <Pressable
            onPress={() => {
              props.onIntentChange("reporter");
              setAwaitingVerification(false);
            }}
            style={[
              styles.pathChip,
              props.intent === "reporter" ? styles.pathChipActive : null,
            ]}
          >
            <Text
              style={[
                styles.pathChipText,
                props.intent === "reporter" ? styles.pathChipTextActive : null,
              ]}
            >
              Reporter
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              props.onIntentChange("resolver");
              setAwaitingVerification(false);
            }}
            style={[
              styles.pathChip,
              props.intent === "resolver" ? styles.pathChipActive : null,
            ]}
          >
            <Text
              style={[
                styles.pathChipText,
                props.intent === "resolver" ? styles.pathChipTextActive : null,
              ]}
            >
              Resolver
            </Text>
          </Pressable>
        </View>

        {!awaitingVerification ? (
          <>
            <View style={styles.modeRow}>
              <Pressable onPress={() => setMode("sign_in")} style={styles.modeButton}>
                <Text style={mode === "sign_in" ? styles.modeTextActive : styles.modeText}>
                  Sign in
                </Text>
              </Pressable>
              <Pressable onPress={() => setMode("sign_up")} style={styles.modeButton}>
                <Text style={mode === "sign_up" ? styles.modeTextActive : styles.modeText}>
                  Sign up
                </Text>
              </Pressable>
            </View>

            {mode === "sign_up" ? (
              <>
                <TextInput
                  value={firstName}
                  onChangeText={setFirstName}
                  style={styles.input}
                  placeholder="First name"
                  placeholderTextColor={theme.colors.textMuted}
                  textContentType="givenName"
                  autoComplete="name-given"
                />
                <TextInput
                  value={lastName}
                  onChangeText={setLastName}
                  style={styles.input}
                  placeholder="Last name"
                  placeholderTextColor={theme.colors.textMuted}
                  textContentType="familyName"
                  autoComplete="name-family"
                />
              </>
            ) : null}

            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              placeholder="Email (@*.giu-uni.de)"
              placeholderTextColor={theme.colors.textMuted}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              secureTextEntry
              autoCorrect={false}
              textContentType={mode === "sign_in" ? "password" : "newPassword"}
              autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
              placeholder="Password"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Pressable
              onPress={mode === "sign_in" ? submitSignIn : submitSignUp}
              disabled={isSubmitting || !loaded}
              style={[styles.primaryButton, isSubmitting || !loaded ? styles.disabledButton : null]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting
                  ? "Working..."
                  : mode === "sign_in"
                    ? "Sign in"
                    : "Sign up & verify email"}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>Enter the verification code from your GIU inbox.</Text>

            <TextInput
              value={verificationCode}
              onChangeText={setVerificationCode}
              style={styles.input}
              autoCapitalize="none"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              placeholder="Verification code"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Pressable
              onPress={verifySignUp}
              disabled={isSubmitting || !loaded}
              style={[styles.primaryButton, isSubmitting || !loaded ? styles.disabledButton : null]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Verifying..." : "Verify and continue"}
              </Text>
            </Pressable>
          </>
        )}

        {errorMessage.length > 0 ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Pressable onPress={props.onBack} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
