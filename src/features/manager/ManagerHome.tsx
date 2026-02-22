import React, { useState } from "react";
import { FlatList, Pressable, SafeAreaView, Text, TextInput, View } from "react-native";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ResolverRequest } from "../auth/types";
import { styles } from "../../ui/styles";
import { formatError } from "../../utils/formatError";

export function ManagerHome(props: { onSignOut: () => void }): React.JSX.Element {
  const approveRequest = useMutation(api.resolverRequests.approve);
  const rejectRequest = useMutation(api.resolverRequests.reject);

  const { results, status, loadMore } = usePaginatedQuery(
    api.resolverRequests.listPending,
    {},
    { initialNumItems: 10 },
  );

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const pendingRequests = results as ResolverRequest[];

  const onApprove = async (requestId: Id<"resolver_requests">) => {
    setProcessingId(requestId);
    setErrorMessage("");

    try {
      await approveRequest({ requestId });
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setProcessingId(null);
    }
  };

  const onReject = async (requestId: Id<"resolver_requests">) => {
    const note = (decisionNotes[requestId] ?? "").trim();
    if (!note) {
      setErrorMessage("Decision note is required before rejecting a request.");
      return;
    }

    setProcessingId(requestId);
    setErrorMessage("");

    try {
      await rejectRequest({ requestId, decisionNote: note });
      setDecisionNotes((previous) => ({ ...previous, [requestId]: "" }));
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cardLarge}>
        <Text style={styles.title}>Manager Queue</Text>
        <Text style={styles.subtitle}>Review pending resolver requests.</Text>

        {errorMessage.length > 0 ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const noteValue = decisionNotes[item._id] ?? "";
            const isProcessing = processingId === item._id;

            return (
              <View style={styles.requestCard}>
                <Text style={styles.requestTitle}>{item.requesterName}</Text>
                <Text style={styles.requestMeta}>{item.requesterEmail}</Text>
                <Text style={styles.requestMeta}>
                  Submitted: {new Date(item.submittedAt).toLocaleString()}
                </Text>
                <Text style={styles.requestMeta}>Reason: {item.reason ?? "No reason provided."}</Text>

                <TextInput
                  value={noteValue}
                  onChangeText={(value) =>
                    setDecisionNotes((previous) => ({ ...previous, [item._id]: value }))
                  }
                  style={styles.input}
                  placeholder="Required note if rejected"
                  placeholderTextColor="#7c8fa1"
                />

                <View style={styles.inlineRow}>
                  <Pressable
                    disabled={isProcessing}
                    onPress={() => void onApprove(item._id)}
                    style={[styles.button, styles.primaryButton, styles.halfButton]}
                  >
                    <Text style={styles.primaryButtonText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    disabled={isProcessing}
                    onPress={() => void onReject(item._id)}
                    style={[styles.button, styles.secondaryButton, styles.halfButton]}
                  >
                    <Text style={styles.secondaryButtonText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.subtitle}>No pending requests.</Text>}
          ListFooterComponent={
            status === "CanLoadMore" ? (
              <Pressable onPress={() => loadMore(10)} style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Load more</Text>
              </Pressable>
            ) : null
          }
        />

        <Pressable onPress={props.onSignOut} style={[styles.button, styles.secondaryButton]}>
          <Text style={styles.secondaryButtonText}>Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
