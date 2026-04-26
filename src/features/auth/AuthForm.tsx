import React, { useMemo, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSignIn, useSignUp } from "@clerk/clerk-expo";
import type { OnboardingIntent } from "../../domain/types";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import {
  AuthSegmentedControl,
  type AuthMode,
} from "./components/AuthSegmentedControl";
import { AuthPasswordField } from "./components/AuthPasswordField";
import { AuthErrorBanner } from "./components/AuthErrorBanner";
import { styles } from "./AuthForm.styles";

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

const GIU_EMAIL_PATTERN = /@([a-z0-9-]+\.)*giu-uni\.de$/i;

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

function getAuthHeading(intent: OnboardingIntent, mode: AuthMode): string {
  if (intent === "resolver") {
    return mode === "sign_up" ? "Request resolver access" : "Resolver sign in";
  }
  return mode === "sign_up" ? "Create your account" : "Welcome back";
}

function getAuthSubtitle(intent: OnboardingIntent, mode: AuthMode): string {
  if (intent === "resolver") {
    return mode === "sign_up"
      ? "Sign up with your verified GIU email. A manager will review and approve your access."
      : "Sign in with your GIU email. If access was approved, you'll see your queue.";
  }
  return mode === "sign_up"
    ? "Sign up with your verified GIU email to start reporting issues."
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

function isLikelyGiuEmail(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return true;
  if (!trimmed.includes("@")) return true; // still typing
  return GIU_EMAIL_PATTERN.test(trimmed);
}

// ────────────────────────────────────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────────────────────────────────────

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
      <Text style={styles.stepHint}>
        {selectedOption
          ? `Enter ${getSecondFactorLabel(selectedOption)} to finish sign-in.`
          : "Enter your second-factor code to finish sign-in."}
      </Text>

      {options.length > 1 ? (
        <View style={styles.factorRow}>
          {options.map((option) => {
            const isActive = selectedOption?.strategy === option.strategy;
            return (
              <Pressable
                key={getSecondFactorKey(option)}
                onPress={() => onSelectOption(option)}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.factorChip,
                  isActive ? styles.factorChipActive : null,
                  pressed && !isActive ? styles.controlPressed : null,
                ]}
              >
                <Text
                  style={[
                    styles.factorChipText,
                    isActive ? styles.factorChipTextActive : null,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <TextInput
        value={code}
        onChangeText={onCodeChange}
        style={[styles.input, styles.codeInput]}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        placeholder="Code"
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable
        onPress={onSubmit}
        disabled={submitDisabled}
        style={({ pressed }) => [
          styles.primaryButton,
          submitDisabled ? styles.disabledButton : null,
          pressed && !submitDisabled ? styles.controlPressed : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? "Verifying…" : "Verify and sign in"}
        </Text>
      </Pressable>
    </>
  );
}

function NameFields({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
}: {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.nameRow}>
      <TextInput
        value={firstName}
        onChangeText={onFirstNameChange}
        style={[styles.input, styles.nameInput]}
        placeholder="First name"
        placeholderTextColor={theme.colors.textMuted}
        textContentType="givenName"
        autoComplete="name-given"
      />
      <TextInput
        value={lastName}
        onChangeText={onLastNameChange}
        style={[styles.input, styles.nameInput]}
        placeholder="Last name"
        placeholderTextColor={theme.colors.textMuted}
        textContentType="familyName"
        autoComplete="name-family"
      />
    </View>
  );
}

function EmailField({
  value,
  onChange,
  showValidationHint,
}: {
  value: string;
  onChange: (value: string) => void;
  showValidationHint: boolean;
}): React.JSX.Element {
  return (
    <View style={styles.fieldGroup}>
      <TextInput
        value={value}
        onChangeText={onChange}
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        autoComplete="email"
        placeholder="GIU email"
        placeholderTextColor={theme.colors.textMuted}
      />
      {showValidationHint ? (
        <View style={styles.fieldHintRow}>
          <Ionicons
            name="information-circle-outline"
            size={12}
            color={theme.colors.yellowDeep}
          />
          <Text style={styles.fieldHintText}>
            Use a @giu-uni.de email so you can complete verification.
          </Text>
        </View>
      ) : null}
    </View>
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
  const isBusy = isSubmitting || !loaded;
  const showEmailHint =
    email.trim().length > 0 && !isLikelyGiuEmail(email);

  return (
    <>
      <AuthSegmentedControl mode={mode} onChange={onModeChange} />

      {isSignUp ? (
        <NameFields
          firstName={firstName}
          lastName={lastName}
          onFirstNameChange={onFirstNameChange}
          onLastNameChange={onLastNameChange}
        />
      ) : null}

      <EmailField
        value={email}
        onChange={onEmailChange}
        showValidationHint={showEmailHint}
      />

      <AuthPasswordField
        value={password}
        onChangeText={onPasswordChange}
        isSignUp={isSignUp}
      />

      <Pressable
        onPress={onSubmit}
        disabled={isBusy}
        style={({ pressed }) => [
          styles.primaryButton,
          isBusy ? styles.disabledButton : null,
          pressed && !isBusy ? styles.controlPressed : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {getCredentialsButtonLabel(isSignUp, isSubmitting)}
        </Text>
      </Pressable>
    </>
  );
}

function getCredentialsButtonLabel(
  isSignUp: boolean,
  isSubmitting: boolean,
): string {
  if (isSubmitting) return "Working…";
  return isSignUp ? "Sign up & verify email" : "Sign in";
}

function VerificationStep({
  code,
  isSubmitting,
  loaded,
  onCodeChange,
  onSubmit,
}: VerificationStepProps): React.JSX.Element {
  const isBusy = isSubmitting || !loaded;
  return (
    <>
      <Text style={styles.stepHint}>
        Enter the verification code from your GIU inbox.
      </Text>

      <TextInput
        value={code}
        onChangeText={onCodeChange}
        style={[styles.input, styles.codeInput]}
        autoCapitalize="none"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        placeholder="Verification code"
        placeholderTextColor={theme.colors.textMuted}
        autoFocus
      />

      <Pressable
        onPress={onSubmit}
        disabled={isBusy}
        style={({ pressed }) => [
          styles.primaryButton,
          isBusy ? styles.disabledButton : null,
          pressed && !isBusy ? styles.controlPressed : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {isSubmitting ? "Verifying…" : "Verify and continue"}
        </Text>
      </Pressable>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main form
// ────────────────────────────────────────────────────────────────────────────

export function AuthForm(props: {
  intent: OnboardingIntent;
  onBack: () => void;
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
  const stage = useMemo(
    () =>
      getAuthStage({
        awaitingSecondFactor,
        awaitingVerification,
      }),
    [awaitingSecondFactor, awaitingVerification],
  );

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

  const stageContent = renderStageContent({
    stage,
    isSubmitting,
    loaded,
    mode,
    email,
    firstName,
    lastName,
    password,
    verificationCode,
    secondFactorOptions,
    selectedSecondFactor,
    secondFactorCode,
    onEmailChange: setEmail,
    onFirstNameChange: setFirstName,
    onLastNameChange: setLastName,
    onModeChange: handleModeChange,
    onPasswordChange: setPassword,
    onSecondFactorCodeChange: setSecondFactorCode,
    onSelectSecondFactor: (option) => {
      void selectSecondFactor(option);
    },
    onSubmitSignIn: () => {
      void submitSignIn();
    },
    onSubmitSignUp: () => {
      void submitSignUp();
    },
    onSubmitSecondFactor: () => {
      void submitSecondFactor();
    },
    onSubmitVerification: () => {
      void verifySignUp();
    },
    onVerificationCodeChange: setVerificationCode,
  });

  return (
    <AppScreen scroll contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <Pressable
          onPress={props.onBack}
          style={({ pressed }) => [
            styles.backRow,
            pressed ? styles.backRowPressed : null,
          ]}
          hitSlop={6}
        >
          <Ionicons
            name="chevron-back"
            size={16}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <View style={styles.headBlock}>
          <Text style={styles.title}>{getAuthHeading(props.intent, mode)}</Text>
          <Text style={styles.subtitle}>
            {getAuthSubtitle(props.intent, mode)}
          </Text>
        </View>

        {props.intent === "resolver" && stage === "credentials" ? (
          <ResolverNotice mode={mode} />
        ) : null}

        {stageContent}

        <AuthErrorBanner message={errorMessage} />
      </View>
    </AppScreen>
  );
}

function ResolverNotice({ mode }: { mode: AuthMode }): React.JSX.Element {
  return (
    <View style={styles.noticeBanner}>
      <Ionicons
        name="construct-outline"
        size={14}
        color={theme.colors.yellowDeep}
      />
      <Text style={styles.noticeText}>
        {mode === "sign_up"
          ? "After sign-up, a manager will review your request before resolver access becomes active."
          : "If you've been approved, you'll see your resolver queue. Otherwise you'll see a pending or rejected screen."}
      </Text>
    </View>
  );
}

type StageContentArgs = {
  stage: AuthStage;
  isSubmitting: boolean;
  loaded: boolean;
  mode: AuthMode;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  verificationCode: string;
  secondFactorOptions: SecondFactorOption[];
  selectedSecondFactor: SecondFactorOption | null;
  secondFactorCode: string;
  onEmailChange: (value: string) => void;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onModeChange: (mode: AuthMode) => void;
  onPasswordChange: (value: string) => void;
  onSecondFactorCodeChange: (value: string) => void;
  onSelectSecondFactor: (option: SecondFactorOption) => void;
  onSubmitSignIn: () => void;
  onSubmitSignUp: () => void;
  onSubmitSecondFactor: () => void;
  onSubmitVerification: () => void;
  onVerificationCodeChange: (value: string) => void;
};

function renderStageContent(args: StageContentArgs): React.JSX.Element {
  if (args.stage === "second_factor") {
    return (
      <SecondFactorStep
        code={args.secondFactorCode}
        isSubmitting={args.isSubmitting}
        loaded={args.loaded}
        options={args.secondFactorOptions}
        selectedOption={args.selectedSecondFactor}
        onCodeChange={args.onSecondFactorCodeChange}
        onSelectOption={args.onSelectSecondFactor}
        onSubmit={args.onSubmitSecondFactor}
      />
    );
  }
  if (args.stage === "verification") {
    return (
      <VerificationStep
        code={args.verificationCode}
        isSubmitting={args.isSubmitting}
        loaded={args.loaded}
        onCodeChange={args.onVerificationCodeChange}
        onSubmit={args.onSubmitVerification}
      />
    );
  }
  return (
    <CredentialsStep
      email={args.email}
      firstName={args.firstName}
      isSubmitting={args.isSubmitting}
      lastName={args.lastName}
      loaded={args.loaded}
      mode={args.mode}
      password={args.password}
      onEmailChange={args.onEmailChange}
      onFirstNameChange={args.onFirstNameChange}
      onLastNameChange={args.onLastNameChange}
      onModeChange={args.onModeChange}
      onPasswordChange={args.onPasswordChange}
      onSubmitSignIn={args.onSubmitSignIn}
      onSubmitSignUp={args.onSubmitSignUp}
    />
  );
}
