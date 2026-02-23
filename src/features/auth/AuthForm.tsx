import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import type { OnboardingIntent } from "../../domain/types";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { styles } from "./AuthForm.styles";

type SecondFactorStrategy = "totp" | "backup_code" | "phone_code" | "email_code";

type SecondFactorOption = {
  strategy: SecondFactorStrategy;
  label: string;
  safeIdentifier?: string;
  phoneNumberId?: string;
  emailAddressId?: string;
  primary?: boolean;
};

type RawSecondFactor = {
  strategy: string;
  safeIdentifier?: string;
  phoneNumberId?: string;
  emailAddressId?: string;
  primary?: boolean;
};

function getIncompleteSignInMessage(status: string | null | undefined): string {
  switch (status) {
    case "needs_first_factor":
      return "Sign-in requires another first-factor step. Ensure this account supports password sign-in.";
    case "needs_second_factor":
      return "Second-factor verification is still required to complete sign-in.";
    case "needs_new_password":
      return "Sign-in requires setting a new password before access can continue.";
    default:
      return `Sign-in was not completed (status: ${status ?? "unknown"}).`;
  }
}

function getSecondFactorLabel(option: SecondFactorOption): string {
  switch (option.strategy) {
    case "totp":
      return "Authenticator app code";
    case "phone_code":
      return option.safeIdentifier
        ? `SMS code to ${option.safeIdentifier}`
        : "SMS verification code";
    case "email_code":
      return option.safeIdentifier
        ? `Email code to ${option.safeIdentifier}`
        : "Email verification code";
    case "backup_code":
      return "Backup code";
  }
}

function extractSecondFactorOptions(
  supportedSecondFactors: RawSecondFactor[] | null | undefined,
): SecondFactorOption[] {
  if (!supportedSecondFactors || supportedSecondFactors.length === 0) {
    return [];
  }

  const options: SecondFactorOption[] = [];
  for (const factor of supportedSecondFactors) {
    switch (factor.strategy) {
      case "totp":
        options.push({
          strategy: "totp",
          label: "Authenticator",
          primary: factor.primary,
        });
        break;
      case "backup_code":
        options.push({
          strategy: "backup_code",
          label: "Backup code",
          primary: factor.primary,
        });
        break;
      case "phone_code":
        options.push({
          strategy: "phone_code",
          label: "Phone code",
          safeIdentifier: factor.safeIdentifier,
          phoneNumberId: factor.phoneNumberId,
          primary: factor.primary,
        });
        break;
      case "email_code":
        options.push({
          strategy: "email_code",
          label: "Email code",
          safeIdentifier: factor.safeIdentifier,
          emailAddressId: factor.emailAddressId,
          primary: factor.primary,
        });
        break;
      default:
        break;
    }
  }

  return options.sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)));
}

export function AuthForm(props: {
  intent: OnboardingIntent;
  onBack: () => void;
  onIntentChange: (intent: OnboardingIntent) => void;
}): React.JSX.Element {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<"sign_in" | "sign_up">("sign_in");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [awaitingSecondFactor, setAwaitingSecondFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [secondFactorOptions, setSecondFactorOptions] = useState<SecondFactorOption[]>([]);
  const [selectedSecondFactor, setSelectedSecondFactor] = useState<SecondFactorOption | null>(null);
  const [secondFactorCode, setSecondFactorCode] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const loaded = signInLoaded && signUpLoaded;

  const prepareSecondFactor = async (option: SecondFactorOption) => {
    if (!signIn) {
      throw new Error("Sign-in is not ready.");
    }

    if (option.strategy === "phone_code") {
      await signIn.prepareSecondFactor({
        strategy: "phone_code",
        phoneNumberId: option.phoneNumberId,
      });
      return;
    }

    if (option.strategy === "email_code") {
      await signIn.prepareSecondFactor({
        strategy: "email_code",
        emailAddressId: option.emailAddressId,
      });
    }
  };

  const beginSecondFactorStep = async (rawFactors: RawSecondFactor[] | null | undefined) => {
    const options = extractSecondFactorOptions(rawFactors);
    if (options.length === 0) {
      throw new Error(
        "This account requires an unsupported second factor in the current app configuration.",
      );
    }

    const defaultOption = options[0];
    await prepareSecondFactor(defaultOption);

    setSecondFactorOptions(options);
    setSelectedSecondFactor(defaultOption);
    setSecondFactorCode("");
    setAwaitingVerification(false);
    setAwaitingSecondFactor(true);
  };

  const selectSecondFactor = async (option: SecondFactorOption) => {
    if (!loaded || !signIn) {
      return;
    }

    if (selectedSecondFactor?.strategy === option.strategy) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await prepareSecondFactor(option);
      setSelectedSecondFactor(option);
      setSecondFactorCode("");
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSecondFactor = async () => {
    if (!loaded || !signIn || !selectedSecondFactor) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: selectedSecondFactor.strategy,
        code: secondFactorCode.trim(),
      });

      if (signInAttempt.status !== "complete") {
        throw new Error(getIncompleteSignInMessage(signInAttempt.status));
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

  const submitSignIn = async () => {
    if (!loaded || !signIn) {
      return;
    }

    const identifier = email.trim().toLowerCase();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const signInAttempt = await signIn.create({
        strategy: "password",
        identifier,
        password,
      });

      if (signInAttempt.status === "needs_second_factor") {
        await beginSecondFactorStep(signInAttempt.supportedSecondFactors);
        return;
      }

      if (signInAttempt.status !== "complete") {
        throw new Error(getIncompleteSignInMessage(signInAttempt.status));
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
              setAwaitingSecondFactor(false);
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
              setAwaitingSecondFactor(false);
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

        {awaitingSecondFactor ? (
          <>
            <Text style={styles.subtitle}>
              {selectedSecondFactor
                ? `Enter ${getSecondFactorLabel(selectedSecondFactor)} to finish sign-in.`
                : "Enter your second-factor code to finish sign-in."}
            </Text>

            {secondFactorOptions.length > 1 ? (
              <View style={styles.pathRow}>
                {secondFactorOptions.map((option) => (
                  <Pressable
                    key={`${option.strategy}-${option.safeIdentifier ?? "default"}`}
                    onPress={() => {
                      void selectSecondFactor(option);
                    }}
                    style={[
                      styles.pathChip,
                      selectedSecondFactor?.strategy === option.strategy
                        ? styles.pathChipActive
                        : null,
                    ]}
                    disabled={isSubmitting}
                  >
                    <Text
                      style={[
                        styles.pathChipText,
                        selectedSecondFactor?.strategy === option.strategy
                          ? styles.pathChipTextActive
                          : null,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <TextInput
              value={secondFactorCode}
              onChangeText={setSecondFactorCode}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              placeholder="Second-factor code"
              placeholderTextColor={theme.colors.textMuted}
            />

            <Pressable
              onPress={submitSecondFactor}
              disabled={
                isSubmitting ||
                !loaded ||
                !selectedSecondFactor ||
                secondFactorCode.trim().length === 0
              }
              style={[
                styles.primaryButton,
                isSubmitting ||
                !loaded ||
                !selectedSecondFactor ||
                secondFactorCode.trim().length === 0
                  ? styles.disabledButton
                  : null,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {isSubmitting ? "Verifying..." : "Verify and sign in"}
              </Text>
            </Pressable>
          </>
        ) : !awaitingVerification ? (
          <>
            <View style={styles.modeRow}>
              <Pressable
                onPress={() => {
                  setMode("sign_in");
                  setAwaitingSecondFactor(false);
                  setSecondFactorOptions([]);
                  setSelectedSecondFactor(null);
                  setSecondFactorCode("");
                }}
                style={styles.modeButton}
              >
                <Text style={mode === "sign_in" ? styles.modeTextActive : styles.modeText}>
                  Sign in
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setMode("sign_up");
                  setAwaitingSecondFactor(false);
                  setSecondFactorOptions([]);
                  setSelectedSecondFactor(null);
                  setSecondFactorCode("");
                }}
                style={styles.modeButton}
              >
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
