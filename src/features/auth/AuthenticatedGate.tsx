import React, { useCallback, useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { OnboardingIntent } from "../../domain/types";
import { usePushRegistration } from "../notifications/usePushRegistration";
import { ManagerHome } from "../manager/ManagerHome";
import { ReporterHome } from "../reporter/ReporterHome";
import { ResolverHome } from "../resolver/ResolverHome";
import { AppScreen } from "../../ui/AppScreen";
import { ErrorScreen, InfoScreen, LoadingScreen } from "../../ui/Screens";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import type { AccessSummary } from "./types";
import { styles } from "./AuthenticatedGate.styles";
import { getStoredPushInstallationId } from "../notifications/pushInstallation";

type ResolverRejectedViewProps = {
  decisionNote: string | null;
  isSubmitting: boolean;
  onReasonChange: (value: string) => void;
  onReapply: () => void;
  onSignOut: () => void;
  reason: string;
  reapplyError: string;
};

type ReadyAccessViewArgs = {
  access: AccessSummary;
  intent: OnboardingIntent;
  onIntentChanged: (intent: OnboardingIntent) => void;
  onReapply: () => void;
  onReasonChange: (value: string) => void;
  onSignOut: () => void;
  reason: string;
  reapplyError: string;
  reapplying: boolean;
};

function ResolverRejectedView({
  decisionNote,
  isSubmitting,
  onReasonChange,
  onReapply,
  onSignOut,
  reason,
  reapplyError,
}: ResolverRejectedViewProps): React.JSX.Element {
  return (
    <AppScreen>
      <View style={styles.card}>
        <Text style={styles.title}>Resolver request rejected</Text>
        <Text style={styles.subtitle}>
          Manager note: {decisionNote ?? "No note provided."}
        </Text>

        <TextInput
          placeholder="Optional reason for reapply"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
          value={reason}
          onChangeText={onReasonChange}
        />

        <Pressable
          onPress={onReapply}
          disabled={isSubmitting}
          style={[styles.primaryButton, isSubmitting ? styles.disabled : null]}
        >
          <Text style={styles.primaryButtonText}>
            {isSubmitting ? "Submitting..." : "Reapply for resolver"}
          </Text>
        </Pressable>

        {reapplyError.length > 0 ? (
          <Text style={styles.errorText}>{reapplyError}</Text>
        ) : null}

        <Pressable onPress={onSignOut} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </AppScreen>
  );
}

function renderReadyAccessView({
  access,
  intent,
  onIntentChanged,
  onReapply,
  onReasonChange,
  onSignOut,
  reason,
  reapplyError,
  reapplying,
}: ReadyAccessViewArgs): React.JSX.Element {
  if (access.accountStatus === "pending_resolver_approval") {
    return (
      <InfoScreen
        title="Resolver request pending"
        message="Your resolver request is pending manager approval. Protected app features remain locked until a decision is made."
        footer={
          <Pressable onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        }
      />
    );
  }

  if (access.accountStatus === "inactive") {
    return (
      <InfoScreen
        title="Account deactivated"
        message="Your CampusCare account has been deactivated by a manager. Please contact a manager if you believe this is a mistake."
        footer={
          <Pressable onPress={onSignOut} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        }
      />
    );
  }

  if (access.accountStatus === "resolver_rejected") {
    return (
      <ResolverRejectedView
        decisionNote={access.latestResolverDecisionNote}
        isSubmitting={reapplying}
        onReasonChange={onReasonChange}
        onReapply={onReapply}
        onSignOut={onSignOut}
        reason={reason}
        reapplyError={reapplyError}
      />
    );
  }

  if (access.role === "manager") {
    return <ManagerHome email={access.email} onSignOut={onSignOut} />;
  }

  if (access.role === "resolver" && intent !== "reporter") {
    return (
      <ResolverHome
        email={access.email}
        onSignOut={onSignOut}
        onSwitchToReporter={() => onIntentChanged("reporter")}
      />
    );
  }

  return (
    <ReporterHome
      email={access.email}
      onSignOut={onSignOut}
      onSwitchToResolver={
        access.role === "resolver"
          ? () => onIntentChanged("resolver")
          : undefined
      }
    />
  );
}

export function AuthenticatedGate(props: {
  intent: OnboardingIntent;
  onIntentChanged: (intent: OnboardingIntent) => void;
}): React.JSX.Element {
  const { signOut } = useClerk();
  const upsertCurrentUser = useMutation(api.auth.upsertCurrentUser);
  const reapplyResolverRequest = useMutation(api.resolverRequests.reapply);
  const disablePushToken = useMutation(api.notifications.disablePushToken);
  const access = useQuery(api.auth.getMyAccess) as AccessSummary | null | undefined;

  const [lastSyncedIntent, setLastSyncedIntent] =
    useState<OnboardingIntent | null>(null);
  const [syncState, setSyncState] = useState<
    "idle" | "syncing" | "ready" | "error"
  >("idle");
  const [syncError, setSyncError] = useState<string>("");

  const [reapplyReason, setReapplyReason] = useState("");
  const [reapplying, setReapplying] = useState(false);
  const [reapplyError, setReapplyError] = useState("");
  const [syncAttempt, setSyncAttempt] = useState(0);

  usePushRegistration(syncState === "ready" && access !== undefined && access !== null);

  const handleSignOut = useCallback(async () => {
    try {
      const installationId = await getStoredPushInstallationId();

      if (installationId) {
        await disablePushToken({ installationId });
      } else {
        await disablePushToken({});
      }
    } catch {
      // Sign-out should proceed even if token cleanup fails.
    }

    await signOut();
  }, [disablePushToken, signOut]);

  const retrySync = useCallback(() => {
    setSyncAttempt((previous) => previous + 1);
    setLastSyncedIntent(null);
  }, []);

  const onReapply = useCallback(async () => {
    setReapplyError("");
    setReapplying(true);

    try {
      const trimmedReason = reapplyReason.trim();

      if (trimmedReason.length > 0) {
        await reapplyResolverRequest({ reason: trimmedReason });
      } else {
        await reapplyResolverRequest({});
      }

      props.onIntentChanged("resolver");
      setLastSyncedIntent(null);
    } catch (error) {
      setReapplyError(formatError(error));
    } finally {
      setReapplying(false);
    }
  }, [props, reapplyReason, reapplyResolverRequest]);

  useEffect(() => {
    if (lastSyncedIntent === props.intent) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      setSyncState("syncing");
      setSyncError("");

      try {
        await Promise.race([
          upsertCurrentUser({ intent: props.intent }),
          new Promise<never>((_, reject) => {
            setTimeout(
              () =>
                reject(
                  new Error(
                    "Account sync timed out. Check network and Convex dev status.",
                  ),
                ),
              15000,
            );
          }),
        ]);

        if (!cancelled) {
          setLastSyncedIntent(props.intent);
          setSyncState("ready");
        }
      } catch (error) {
        if (!cancelled) {
          setSyncState("error");
          setSyncError(formatError(error));
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [lastSyncedIntent, props.intent, syncAttempt, upsertCurrentUser]);

  if (syncState === "error") {
    return (
      <ErrorScreen
        title="Unable to onboard"
        message={syncError}
        footer={
          <>
            <Pressable onPress={retrySync} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Retry sync</Text>
            </Pressable>
            <Pressable onPress={() => void handleSignOut()} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign out</Text>
            </Pressable>
          </>
        }
      />
    );
  }

  if (syncState !== "ready" || access === undefined) {
    return <LoadingScreen label="Syncing account..." />;
  }

  if (access === null) {
    return (
      <ErrorScreen
        title="Account not found"
        message="Your account is signed in but not yet available in CampusCare."
      />
    );
  }

  return renderReadyAccessView({
    access,
    intent: props.intent,
    onIntentChanged: props.onIntentChanged,
    onReapply: () => {
      void onReapply();
    },
    onReasonChange: setReapplyReason,
    onSignOut: () => {
      void handleSignOut();
    },
    reason: reapplyReason,
    reapplyError,
    reapplying,
  });
}
