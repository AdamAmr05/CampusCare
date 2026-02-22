import React, { useEffect, useState } from "react";
import { Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { useClerk } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { OnboardingIntent } from "../../domain/types";
import { ManagerHome } from "../manager/ManagerHome";
import { ErrorScreen, InfoScreen, LoadingScreen, RoleHome } from "../../ui/Screens";
import { styles } from "../../ui/styles";
import { formatError } from "../../utils/formatError";
import type { AccessSummary } from "./types";

export function AuthenticatedGate(props: {
  intent: OnboardingIntent;
  onIntentChanged: (intent: OnboardingIntent) => void;
}): React.JSX.Element {
  const { signOut } = useClerk();
  const upsertCurrentUser = useMutation(api.auth.upsertCurrentUser);
  const reapplyResolverRequest = useMutation(api.resolverRequests.reapply);
  const access = useQuery(api.auth.getMyAccess) as AccessSummary | null | undefined;

  const [lastSyncedIntent, setLastSyncedIntent] = useState<OnboardingIntent | null>(null);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "ready" | "error">("idle");
  const [syncError, setSyncError] = useState<string>("");

  const [reapplyReason, setReapplyReason] = useState("");
  const [reapplying, setReapplying] = useState(false);
  const [reapplyError, setReapplyError] = useState("");
  const [syncAttempt, setSyncAttempt] = useState(0);

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
              style={[styles.button, styles.primaryButton]}
            >
              <Text style={styles.primaryButtonText}>Retry sync</Text>
            </Pressable>
            <Pressable onPress={() => void signOut()} style={[styles.button, styles.secondaryButton]}>
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
          <Pressable onPress={() => void signOut()} style={[styles.button, styles.secondaryButton]}>
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
      <SafeAreaView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Resolver request rejected</Text>
          <Text style={styles.subtitle}>
            Manager note: {access.latestResolverDecisionNote ?? "No note provided."}
          </Text>

          <TextInput
            placeholder="Optional reason for reapply"
            placeholderTextColor="#7c8fa1"
            style={styles.input}
            value={reapplyReason}
            onChangeText={setReapplyReason}
          />

          <Pressable
            onPress={onReapply}
            disabled={reapplying}
            style={[styles.button, styles.primaryButton]}
          >
            <Text style={styles.primaryButtonText}>
              {reapplying ? "Submitting..." : "Reapply for resolver"}
            </Text>
          </Pressable>

          {reapplyError.length > 0 ? <Text style={styles.errorText}>{reapplyError}</Text> : null}

          <Pressable onPress={() => void signOut()} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>Sign out</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (access.role === "manager") {
    return <ManagerHome onSignOut={() => void signOut()} />;
  }

  if (access.role === "resolver") {
    return (
      <RoleHome
        role="Resolver"
        email={access.email}
        onSignOut={() => void signOut()}
        description="You are approved as a resolver. Manager approval queue stays under the Manager role."
      />
    );
  }

  return (
    <RoleHome
      role="Reporter"
      email={access.email}
      onSignOut={() => void signOut()}
      description="Reporter access is active. Ticket status flow uses: open, assigned, in_progress, resolved (awaiting manager approval), closed."
    />
  );
}
