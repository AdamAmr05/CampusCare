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

export function AuthenticatedGate(props: {
  intent: OnboardingIntent;
  onIntentChanged: (intent: OnboardingIntent) => void;
}): React.JSX.Element {
  const { signOut } = useClerk();
  const upsertCurrentUser = useMutation(api.auth.upsertCurrentUser);
  const reapplyResolverRequest = useMutation(api.resolverRequests.reapply);
  const disablePushToken = useMutation(api.notifications.disablePushToken);
  const access = useQuery(api.auth.getMyAccess) as AccessSummary | null | undefined;

  const [lastSyncedIntent, setLastSyncedIntent] = useState<OnboardingIntent | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "ready" | "error">("idle");
  const [syncError, setSyncError] = useState<string>("");

  const [reapplyReason, setReapplyReason] = useState("");
  const [reapplying, setReapplying] = useState(false);
  const [reapplyError, setReapplyError] = useState("");
  const [syncAttempt, setSyncAttempt] = useState(0);

  usePushRegistration(syncState === "ready" && access !== undefined && access !== null);

  const handleSignOut = useCallback(async () => {
    try {
      await disablePushToken({});
    } catch {
      // Sign-out should proceed even if token cleanup fails.
    }
    await signOut();
  }, [disablePushToken, signOut]);

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
            setTimeout(() => reject(new Error("Account sync timed out. Check network and Convex dev status.")), 15000);
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
  }, [lastSyncedIntent, props.intent, upsertCurrentUser, syncAttempt]);

  if (syncState === "error") {
    return (
      <ErrorScreen
        title="Unable to onboard"
        message={syncError}
        footer={
          <>
            <Pressable
              onPress={() => {
                setSyncAttempt((previous) => previous + 1);
                setLastSyncedIntent(null);
              }}
              style={styles.primaryButton}
            >
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

  if (access.accountStatus === "pending_resolver_approval") {
    return (
      <InfoScreen
        title="Resolver request pending"
        message="Your resolver request is pending manager approval. Protected app features remain locked until a decision is made."
        footer={
          <Pressable onPress={() => void handleSignOut()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        }
      />
    );
  }

  if (access.accountStatus === "resolver_rejected") {
    const onReapply = async () => {
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
    };

    return (
      <AppScreen>
        <View style={styles.card}>
          <Text style={styles.title}>Resolver request rejected</Text>
          <Text style={styles.subtitle}>
            Manager note: {access.latestResolverDecisionNote ?? "No note provided."}
          </Text>

          <TextInput
            placeholder="Optional reason for reapply"
            placeholderTextColor={theme.colors.textMuted}
            style={styles.input}
            value={reapplyReason}
            onChangeText={setReapplyReason}
          />

          <Pressable
            onPress={onReapply}
            disabled={reapplying}
            style={[styles.primaryButton, reapplying ? styles.disabled : null]}
          >
            <Text style={styles.primaryButtonText}>
              {reapplying ? "Submitting..." : "Reapply for resolver"}
            </Text>
          </Pressable>

          {reapplyError.length > 0 ? <Text style={styles.errorText}>{reapplyError}</Text> : null}

          <Pressable onPress={() => void handleSignOut()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  if (access.role === "manager") {
    return <ManagerHome email={access.email} onSignOut={() => void handleSignOut()} />;
  }

  if (access.role === "resolver") {
    if (props.intent === "reporter") {
      return (
        <ReporterHome
          email={access.email}
          onSignOut={() => void handleSignOut()}
          onSwitchToResolver={() => props.onIntentChanged("resolver")}
        />
      );
    }
    return (
      <ResolverHome
        email={access.email}
        onSignOut={() => void handleSignOut()}
        onSwitchToReporter={() => props.onIntentChanged("reporter")}
      />
    );
  }

  return <ReporterHome email={access.email} onSignOut={() => void handleSignOut()} />;
}
