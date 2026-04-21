import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import type { OnboardingIntent } from "../../domain/types";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { styles } from "./AuthForm.styles";

type AuthMode = "sign_in" | "sign_up";
type AuthStage = "credentials" | "verification" | "second_factor";
type SecondFactorStrategy =
  | "totp"
  | "backup_code"
  | "phone_code"
  | "email_code";

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

type IntentSelectorProps = {
  intent: OnboardingIntent;
  onSelectIntent: (intent: OnboardingIntent) => void;
};

type SecondFactorStepProps = {
  code: string;
  isSubmitting: boolean;
  loaded: boolean;
  options: SecondFactorOption[];
  selectedOption: SecondFactorOption | null;
  onCodeChange: (code: string) => void;
  onSelectOption: (option: SecondFactorOption) => void;
  onSubmit: () => void;
};

type CredentialsStepProps = {
  email: string;
  firstName: string;
  isSubmitting: boolean;
  lastName: string;
  loaded: boolean;
  mode: AuthMode;
  password: string;
  onEmailChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onModeChange: (mode: AuthMode) => void;
  onPasswordChange: (value: string) => void;
  onSubmitSignIn: () => void;
  onSubmitSignUp: () => void;
};

type VerificationStepProps = {
  code: string;
  isSubmitting: boolean;
  loaded: boolean;
  onCodeChange: (code: string) => void;
  onSubmit: () => void;
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

  return options.sort(
    (a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)),
  );
}

function getSecondFactorKey(option: SecondFactorOption): string {
  return `${option.strategy}-${option.safeIdentifier ?? "default"}`;
}

function getAuthStage(args: {
  awaitingSecondFactor: boolean;
  awaitingVerification: boolean;
}): AuthStage {
  if (args.awaitingSecondFactor) {
    return "second_factor";
  }

  if (args.awaitingVerification) {
    return "verification";
  }

  return "credentials";
}

function getAuthHeading(intent: OnboardingIntent): string {
  return intent === "resolver"
    ? "Resolver Access Request"
    : "Reporter Sign In";
}

function getAuthSubtitle(intent: OnboardingIntent): string {
  return intent === "resolver"
    ? "Use your GIU account. Manager approval is required before resolver access is active."
    : "Sign in with your verified GIU email to report and track issues.";
}

function requireCompletedSession(args: {
  createdSessionId?: string | null;
  incompleteMessage: string;
  missingSessionMessage: string;
  status: string | null | undefined;
}): string {
  if (args.status !== "complete") {
    throw new Error(args.incompleteMessage);
  }

  if (!args.createdSessionId) {
    throw new Error(args.missingSessionMessage);
  }

  return args.createdSessionId;
}

function IntentSelector({
  intent,
  onSelectIntent,
}: IntentSelectorProps): React.JSX.Element {
  return (
    <View style={styles.pathRow}>
      <Pressable
        onPress={() => onSelectIntent("reporter")}
        style={[styles.pathChip, intent === "reporter" ? styles.pathChipActive : null]}
      >
        <Text
          style={[
            styles.pathChipText,
            intent === "reporter" ? styles.pathChipTextActive : null,
          ]}
        >
          Reporter
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSelectIntent("resolver")}
        style={[styles.pathChip, intent === "resolver" ? styles.pathChipActive : null]}
      >
        <Text
          style={[
            styles.pathChipText,
            intent === "resolver" ? styles.pathChipTextActive : null,
          ]}
        >
          Resolver
        </Text>
      </Pressable>
    </View>
  );
}

function SecondFactorStep({
  code,
  isSubmitting,
  loaded,
  options,
  selectedOption,
  onCodeChange,
  onSelectOption,
  onSubmit,
}: SecondFactorStepProps): React.JSX.Element {
  const submitDisabled =
    isSubmitting ||
    !loaded ||
    selectedOption === null ||
    code.trim().length === 0;

  return (
    <>
      <Text style={styles.subtitle}>
        {selectedOption
          ? `Enter ${getSecondFactorLabel(selectedOption)} to finish sign-in.`
          : "Enter your second-factor code to finish sign-in."}
      </Text>

      {options.length > 1 ? (
        <View style={styles.pathRow}>
          {options.map((option) => (
            <Pressable
              key={getSecondFactorKey(option)}
              onPress={() => onSelectOption(option)}
              style={[
                styles.pathChip,
                selectedOption?.strategy === option.strategy
                  ? styles.pathChipActive
                  : null,
              ]}
              disabled={isSubmitting}
            >
              <Text
                style={[
                  styles.pathChipText,
                  selectedOption?.strategy === option.strategy
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
        value={code}
        onChangeText={onCodeChange}
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
        onPress={onSubmit}
        disabled={submitDisabled}
        style={[
          styles.primaryButton,
          submitDisabled ? styles.disabledButton : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? "Verifying..." : "Verify and sign in"}
        </Text>
      </Pressable>
    </>
  );
}

function CredentialsStep({
  email,
  firstName,
  isSubmitting,
  lastName,
  loaded,
  mode,
  password,
  onEmailChange,
  onFirstNameChange,
  onLastNameChange,
  onModeChange,
  onPasswordChange,
  onSubmitSignIn,
  onSubmitSignUp,
}: CredentialsStepProps): React.JSX.Element {
  const isSignUp = mode === "sign_up";
  const onSubmit = isSignUp ? onSubmitSignUp : onSubmitSignIn;

  return (
    <>
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => onModeChange("sign_in")}
          style={styles.modeButton}
        >
          <Text style={mode === "sign_in" ? styles.modeTextActive : styles.modeText}>
            Sign in
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onModeChange("sign_up")}
          style={styles.modeButton}
        >
          <Text style={mode === "sign_up" ? styles.modeTextActive : styles.modeText}>
            Sign up
          </Text>
        </Pressable>
      </View>

      {isSignUp ? (
        <>
          <TextInput
            value={firstName}
            onChangeText={onFirstNameChange}
            style={styles.input}
            placeholder="First name"
            placeholderTextColor={theme.colors.textMuted}
            textContentType="givenName"
            autoComplete="name-given"
          />
          <TextInput
            value={lastName}
            onChangeText={onLastNameChange}
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
        onChangeText={onEmailChange}
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
        onChangeText={onPasswordChange}
        style={styles.input}
        secureTextEntry
        autoCorrect={false}
        textContentType={isSignUp ? "newPassword" : "password"}
        autoComplete={isSignUp ? "new-password" : "current-password"}
        placeholder="Password"
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !loaded}
        style={[
          styles.primaryButton,
          isSubmitting || !loaded ? styles.disabledButton : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting
            ? "Working..."
            : isSignUp
              ? "Sign up & verify email"
              : "Sign in"}
        </Text>
      </Pressable>
    </>
  );
}

function VerificationStep({
  code,
  isSubmitting,
  loaded,
  onCodeChange,
  onSubmit,
}: VerificationStepProps): React.JSX.Element {
  return (
    <>
      <Text style={styles.subtitle}>
        Enter the verification code from your GIU inbox.
      </Text>

      <TextInput
        value={code}
        onChangeText={onCodeChange}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        placeholder="Verification code"
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable
        onPress={onSubmit}
        disabled={isSubmitting || !loaded}
        style={[
          styles.primaryButton,
          isSubmitting || !loaded ? styles.disabledButton : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? "Verifying..." : "Verify and continue"}
        </Text>
      </Pressable>
    </>
  );
}

export function AuthForm(props: {
  intent: OnboardingIntent;
  onBack: () => void;
  onIntentChange: (intent: OnboardingIntent) => void;
}): React.JSX.Element {
  const { signIn, setActive: setActiveSignIn, isLoaded: signInLoaded } =
    useSignIn();
  const { signUp, setActive: setActiveSignUp, isLoaded: signUpLoaded } =
    useSignUp();

  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [awaitingSecondFactor, setAwaitingSecondFactor] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [secondFactorOptions, setSecondFactorOptions] = useState<
    SecondFactorOption[]
  >([]);
  const [selectedSecondFactor, setSelectedSecondFactor] =
    useState<SecondFactorOption | null>(null);
  const [secondFactorCode, setSecondFactorCode] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");

  const loaded = signInLoaded && signUpLoaded;
  const stage = getAuthStage({
    awaitingSecondFactor,
    awaitingVerification,
  });

  const resetSecondFactorState = () => {
    setAwaitingSecondFactor(false);
    setSecondFactorOptions([]);
    setSelectedSecondFactor(null);
    setSecondFactorCode("");
  };

  const resetVerificationState = () => {
    setAwaitingVerification(false);
    setVerificationCode("");
  };

  const runSubmittingAction = async (action: () => Promise<void>) => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await action();
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setIsSubmitting(false);
    }
  };

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

  const beginSecondFactorStep = async (
    rawFactors: RawSecondFactor[] | null | undefined,
  ) => {
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

  const handleIntentChange = (intent: OnboardingIntent) => {
    props.onIntentChange(intent);
    resetVerificationState();
    resetSecondFactorState();
    setErrorMessage("");
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    resetSecondFactorState();
    setErrorMessage("");
  };

  const selectSecondFactor = async (option: SecondFactorOption) => {
    if (!loaded || !signIn) {
      return;
    }

    if (selectedSecondFactor?.strategy === option.strategy) {
      return;
    }

    await runSubmittingAction(async () => {
      await prepareSecondFactor(option);
      setSelectedSecondFactor(option);
      setSecondFactorCode("");
    });
  };

  const submitSecondFactor = async () => {
    if (!loaded || !signIn || !selectedSecondFactor) {
      return;
    }

    await runSubmittingAction(async () => {
      const signInAttempt = await signIn.attemptSecondFactor({
        strategy: selectedSecondFactor.strategy,
        code: secondFactorCode.trim(),
      });

      const sessionId = requireCompletedSession({
        status: signInAttempt.status,
        createdSessionId: signInAttempt.createdSessionId,
        incompleteMessage: getIncompleteSignInMessage(signInAttempt.status),
        missingSessionMessage: "Sign-in completed without a session.",
      });

      await setActiveSignIn({ session: sessionId });
    });
  };

  const submitSignIn = async () => {
    if (!loaded || !signIn) {
      return;
    }

    const identifier = email.trim().toLowerCase();

    await runSubmittingAction(async () => {
      const signInAttempt = await signIn.create({
        strategy: "password",
        identifier,
        password,
      });

      if (signInAttempt.status === "needs_second_factor") {
        await beginSecondFactorStep(signInAttempt.supportedSecondFactors);
        return;
      }

      const sessionId = requireCompletedSession({
        status: signInAttempt.status,
        createdSessionId: signInAttempt.createdSessionId,
        incompleteMessage: getIncompleteSignInMessage(signInAttempt.status),
        missingSessionMessage: "Sign-in completed without a session.",
      });

      await setActiveSignIn({ session: sessionId });
    });
  };

  const submitSignUp = async () => {
    if (!loaded || !signUp) {
      return;
    }

    const emailAddress = email.trim().toLowerCase();

    await runSubmittingAction(async () => {
      await signUp.create({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });
      setAwaitingVerification(true);
      resetSecondFactorState();
    });
  };

  const verifySignUp = async () => {
    if (!loaded || !signUp) {
      return;
    }

    await runSubmittingAction(async () => {
      const verificationAttempt = await signUp.attemptEmailAddressVerification({
        code: verificationCode.trim(),
      });

      const sessionId = requireCompletedSession({
        status: verificationAttempt.status,
        createdSessionId: verificationAttempt.createdSessionId,
        incompleteMessage: "Verification code is invalid or expired.",
        missingSessionMessage: "Verification completed without a session.",
      });

      await setActiveSignUp({ session: sessionId });
    });
  };

  let stageContent: React.JSX.Element;

  if (stage === "second_factor") {
    stageContent = (
      <SecondFactorStep
        code={secondFactorCode}
        isSubmitting={isSubmitting}
        loaded={loaded}
        options={secondFactorOptions}
        selectedOption={selectedSecondFactor}
        onCodeChange={setSecondFactorCode}
        onSelectOption={(option) => {
          void selectSecondFactor(option);
        }}
        onSubmit={() => {
          void submitSecondFactor();
        }}
      />
    );
  } else if (stage === "verification") {
    stageContent = (
      <VerificationStep
        code={verificationCode}
        isSubmitting={isSubmitting}
        loaded={loaded}
        onCodeChange={setVerificationCode}
        onSubmit={() => {
          void verifySignUp();
        }}
      />
    );
  } else {
    stageContent = (
      <CredentialsStep
        email={email}
        firstName={firstName}
        isSubmitting={isSubmitting}
        lastName={lastName}
        loaded={loaded}
        mode={mode}
        password={password}
        onEmailChange={setEmail}
        onFirstNameChange={setFirstName}
        onLastNameChange={setLastName}
        onModeChange={handleModeChange}
        onPasswordChange={setPassword}
        onSubmitSignIn={() => {
          void submitSignIn();
        }}
        onSubmitSignUp={() => {
          void submitSignUp();
        }}
      />
    );
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Text style={styles.title}>{getAuthHeading(props.intent)}</Text>
        <Text style={styles.subtitle}>{getAuthSubtitle(props.intent)}</Text>

        <IntentSelector
          intent={props.intent}
          onSelectIntent={handleIntentChange}
        />

        {stageContent}

        {errorMessage.length > 0 ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <Pressable onPress={props.onBack} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}
