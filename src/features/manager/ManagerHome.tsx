import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ResolverRequest } from "../auth/types";
import { ImageLightbox } from "../tickets/ImageLightbox";
import { TicketDetailsPanel } from "../tickets/TicketDetailsPanel";
import { TicketImagePreview } from "../tickets/TicketImagePreview";
import type { ResolverOption, Ticket } from "../tickets/types";
import { formatTimestamp, getTicketStatusColors, getTicketStatusLabel, truncateText } from "../tickets/utils";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { styles } from "./ManagerHome.styles";

type ManagerTab = "resolver_requests" | "assign_tickets" | "close_tickets";

export function ManagerHome(props: { email: string; onSignOut: () => void }): React.JSX.Element {
  const approveRequest = useMutation(api.resolverRequests.approve);
  const rejectRequest = useMutation(api.resolverRequests.reject);
  const assignResolver = useMutation(api.ticketsManager.assignResolver);
  const closeTicket = useMutation(api.ticketsManager.close);

  const resolverRequestsQuery = usePaginatedQuery(
    api.resolverRequests.listPending,
    {},
    { initialNumItems: 10 },
  );

  const openTicketsQuery = usePaginatedQuery(
    api.ticketsManager.listOpenUnassigned,
    {},
    { initialNumItems: 10 },
  );

  const resolvedTicketsQuery = usePaginatedQuery(
    api.ticketsManager.listResolvedAwaitingClose,
    {},
    { initialNumItems: 10 },
  );

  const activeResolvers = useQuery(api.ticketsManager.listActiveResolvers, {}) as
    | ResolverOption[]
    | undefined;

  const [activeTab, setActiveTab] = useState<ManagerTab>("resolver_requests");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [selectedResolverByTicket, setSelectedResolverByTicket] = useState<Record<string, string>>(
    {},
  );
  const [assignmentNotes, setAssignmentNotes] = useState<Record<string, string>>({});
  const [closureNotes, setClosureNotes] = useState<Record<string, string>>({});
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);
  const [selectedTicketPreview, setSelectedTicketPreview] = useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const pendingRequests = useMemo(
    () => resolverRequestsQuery.results as ResolverRequest[],
    [resolverRequestsQuery.results],
  );
  const openTickets = useMemo(() => openTicketsQuery.results as Ticket[], [openTicketsQuery.results]);
  const resolvedTickets = useMemo(
    () => resolvedTicketsQuery.results as Ticket[],
    [resolvedTicketsQuery.results],
  );

  const onApprove = useCallback(async (requestId: Id<"resolver_requests">) => {
    setProcessingId(requestId);
    setErrorMessage("");

    try {
      await approveRequest({ requestId });
    } catch (error) {
      setErrorMessage(formatError(error));
    } finally {
      setProcessingId(null);
    }
  }, [approveRequest]);

  const onReject = useCallback(async (requestId: Id<"resolver_requests">) => {
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
  }, [decisionNotes, rejectRequest]);

  const onAssignResolver = useCallback(
    async (ticket: Ticket) => {
      const selectedResolverId =
        selectedResolverByTicket[ticket._id] ?? activeResolvers?.[0]?._id ?? null;
      if (!selectedResolverId) {
        setErrorMessage("No active resolver available for assignment.");
        return;
      }

      const note = (assignmentNotes[ticket._id] ?? "").trim();
      setProcessingId(ticket._id);
      setErrorMessage("");

      try {
        if (note.length > 0) {
          await assignResolver({
            ticketId: ticket._id,
            resolverUserId: selectedResolverId as Id<"users">,
            note,
          });
        } else {
          await assignResolver({
            ticketId: ticket._id,
            resolverUserId: selectedResolverId as Id<"users">,
          });
        }
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [activeResolvers, assignmentNotes, assignResolver, selectedResolverByTicket],
  );

  const onCloseTicket = useCallback(
    async (ticket: Ticket) => {
      const note = (closureNotes[ticket._id] ?? "").trim();
      setProcessingId(ticket._id);
      setErrorMessage("");

      try {
        if (note.length > 0) {
          await closeTicket({ ticketId: ticket._id, note });
        } else {
          await closeTicket({ ticketId: ticket._id });
        }
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [closeTicket, closureNotes],
  );

  const openTicketDetails = useCallback((ticket: Ticket) => {
    setSelectedTicketPreview(ticket);
    setIsDetailsVisible(true);
  }, []);

  const closeTicketDetails = useCallback(() => {
    setIsDetailsVisible(false);
  }, []);

  useEffect(() => {
    if (isDetailsVisible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setSelectedTicketPreview(null);
    }, 260);

    return () => clearTimeout(timeoutId);
  }, [isDetailsVisible]);

  const renderResolverRequest = useCallback(
    ({ item }: { item: ResolverRequest }) => {
      const noteValue = decisionNotes[item._id] ?? "";
      const isProcessing = processingId === item._id;

      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.requesterName}</Text>
          <Text style={styles.metaText}>{item.requesterEmail}</Text>
          <Text style={styles.metaText}>Submitted {formatTimestamp(item.submittedAt)}</Text>
          <Text style={styles.bodyText}>Reason: {item.reason ?? "No reason provided."}</Text>

          <TextInput
            value={noteValue}
            onChangeText={(value) =>
              setDecisionNotes((previous) => ({ ...previous, [item._id]: value }))
            }
            style={styles.input}
            placeholder="Required note for rejection"
            placeholderTextColor={theme.colors.textMuted}
          />

          <View style={styles.row}>
            <Pressable
              disabled={isProcessing}
              onPress={() => void onApprove(item._id)}
              style={[styles.primaryButton, styles.halfButton, isProcessing ? styles.disabled : null]}
            >
              <Text style={styles.primaryButtonText}>Approve</Text>
            </Pressable>
            <Pressable
              disabled={isProcessing}
              onPress={() => void onReject(item._id)}
              style={[styles.secondaryButton, styles.halfButton, isProcessing ? styles.disabled : null]}
            >
              <Text style={styles.secondaryButtonText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      );
    },
    [decisionNotes, onApprove, onReject, processingId],
  );

  const renderOpenTicket = useCallback(
    ({ item }: { item: Ticket }) => {
      const isProcessing = processingId === item._id;
      const selectedResolver = selectedResolverByTicket[item._id] ?? "";
      const noteValue = assignmentNotes[item._id] ?? "";
      const statusColors = getTicketStatusColors(item.status);

      return (
        <View style={styles.card}>
          <Pressable onPress={() => openTicketDetails(item)} style={styles.detailsPreviewArea}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.category}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.background }]}>
                <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                  {getTicketStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.metaText}>{item.location}</Text>
            {item.imageUrl ? (
              <TicketImagePreview
                uri={item.imageUrl}
                style={styles.ticketImage}
                onPress={(event) => {
                  event.stopPropagation();
                  setLightboxImageUri(item.imageUrl);
                }}
              />
            ) : null}
            <Text style={styles.bodyText}>{truncateText(item.description, 130)}</Text>
          </Pressable>

          <Text style={styles.smallLabel}>Assign Resolver</Text>
          <View style={styles.resolverChipRow}>
            {(activeResolvers ?? []).map((resolver) => (
              <Pressable
                key={resolver._id}
                style={[
                  styles.resolverChip,
                  selectedResolver === resolver._id ? styles.resolverChipActive : null,
                ]}
                onPress={() =>
                  setSelectedResolverByTicket((previous) => ({
                    ...previous,
                    [item._id]: resolver._id,
                  }))
                }
              >
                <Text
                  style={[
                    styles.resolverChipText,
                    selectedResolver === resolver._id ? styles.resolverChipTextActive : null,
                  ]}
                >
                  {resolver.fullName}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            value={noteValue}
            onChangeText={(value) =>
              setAssignmentNotes((previous) => ({ ...previous, [item._id]: value }))
            }
            style={styles.input}
            placeholder="Optional assignment note"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Pressable
            disabled={isProcessing}
            onPress={() => void onAssignResolver(item)}
            style={[styles.primaryButton, isProcessing ? styles.disabled : null]}
          >
            <Text style={styles.primaryButtonText}>
              {isProcessing ? "Assigning..." : "Assign Ticket"}
            </Text>
          </Pressable>
        </View>
      );
    },
    [
      activeResolvers,
      assignmentNotes,
      onAssignResolver,
      openTicketDetails,
      processingId,
      selectedResolverByTicket,
    ],
  );

  const renderResolvedTicket = useCallback(
    ({ item }: { item: Ticket }) => {
      const isProcessing = processingId === item._id;
      const noteValue = closureNotes[item._id] ?? "";
      const statusColors = getTicketStatusColors(item.status);

      return (
        <View style={styles.card}>
          <Pressable onPress={() => openTicketDetails(item)} style={styles.detailsPreviewArea}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{item.category}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.background }]}>
                <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                  {getTicketStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <Text style={styles.metaText}>{item.location}</Text>
            {item.imageUrl ? (
              <TicketImagePreview
                uri={item.imageUrl}
                style={styles.ticketImage}
                onPress={(event) => {
                  event.stopPropagation();
                  setLightboxImageUri(item.imageUrl);
                }}
              />
            ) : null}
            <Text style={styles.bodyText}>{truncateText(item.description, 130)}</Text>
            <Text style={styles.bodyText}>Resolver note: {item.resolutionNote ?? "No note."}</Text>
            {item.resolutionImageUrl ? (
              <TicketImagePreview
                uri={item.resolutionImageUrl}
                style={styles.ticketImage}
                onPress={(event) => {
                  event.stopPropagation();
                  setLightboxImageUri(item.resolutionImageUrl);
                }}
              />
            ) : null}
          </Pressable>

          <TextInput
            value={noteValue}
            onChangeText={(value) =>
              setClosureNotes((previous) => ({ ...previous, [item._id]: value }))
            }
            style={styles.input}
            placeholder="Optional closure note"
            placeholderTextColor={theme.colors.textMuted}
          />

          <Pressable
            disabled={isProcessing}
            onPress={() => void onCloseTicket(item)}
            style={[styles.primaryButton, isProcessing ? styles.disabled : null]}
          >
            <Text style={styles.primaryButtonText}>{isProcessing ? "Closing..." : "Close Ticket"}</Text>
          </Pressable>
        </View>
      );
    },
    [closureNotes, onCloseTicket, openTicketDetails, processingId],
  );

  const activeLoadStatus = activeTab === "resolver_requests"
    ? resolverRequestsQuery.status
    : activeTab === "assign_tickets"
      ? openTicketsQuery.status
      : resolvedTicketsQuery.status;

  const onLoadMore = useCallback(() => {
    if (activeTab === "resolver_requests") {
      resolverRequestsQuery.loadMore(10);
      return;
    }
    if (activeTab === "assign_tickets") {
      openTicketsQuery.loadMore(10);
      return;
    }
    resolvedTicketsQuery.loadMore(10);
  }, [activeTab, openTicketsQuery, resolvedTicketsQuery, resolverRequestsQuery]);

  const listHeader = (
    <View style={styles.listHeader}>
      <View style={styles.heroCard}>
        <View style={styles.rowBetween}>
          <View style={styles.heroMeta}>
            <Text style={styles.eyebrow}>Manager Workspace</Text>
            <Text style={styles.title}>Operate CampusCare Queue</Text>
            <Text style={styles.subtitle}>
              Approve resolver access, assign open tickets, and finalize closure.
            </Text>
            <Text style={styles.metaText}>{props.email}</Text>
          </View>
          <Pressable onPress={props.onSignOut} style={styles.signOutButton}>
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        </View>
      </View>

      <NotificationCenter />

      <View style={styles.tabsRow}>
        <Pressable
          onPress={() => setActiveTab("resolver_requests")}
          style={[
            styles.tabButton,
            activeTab === "resolver_requests" ? styles.tabButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "resolver_requests" ? styles.tabTextActive : null,
            ]}
          >
            Resolver Requests
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("assign_tickets")}
          style={[
            styles.tabButton,
            activeTab === "assign_tickets" ? styles.tabButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "assign_tickets" ? styles.tabTextActive : null,
            ]}
          >
            Assign Open Tickets
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("close_tickets")}
          style={[
            styles.tabButton,
            activeTab === "close_tickets" ? styles.tabButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "close_tickets" ? styles.tabTextActive : null,
            ]}
          >
            Close Resolved
          </Text>
        </Pressable>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );

  const listEmpty = (
    <Text style={styles.emptyText}>
      {activeTab === "resolver_requests"
        ? "No pending resolver requests."
        : activeTab === "assign_tickets"
          ? "No open tickets awaiting assignment."
          : "No resolved tickets awaiting closure."}
    </Text>
  );

  const listFooter = (
    <View style={styles.footerSpace}>
      {activeLoadStatus === "CanLoadMore" ? (
        <Pressable onPress={onLoadMore} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Load More</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <AppScreen>
      {activeTab === "resolver_requests" ? (
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderResolverRequest}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      ) : null}

      {activeTab === "assign_tickets" ? (
        <FlatList
          data={openTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderOpenTicket}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      ) : null}

      {activeTab === "close_tickets" ? (
        <FlatList
          data={resolvedTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderResolvedTicket}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      ) : null}
      <TicketDetailsPanel
        visible={isDetailsVisible}
        ticket={selectedTicketPreview}
        historyEntries={null}
        historyUnavailableText="Status history is not shown in Manager lists yet."
        onClose={closeTicketDetails}
      />
      <ImageLightbox imageUri={lightboxImageUri} onClose={() => setLightboxImageUri(null)} />
    </AppScreen>
  );
}
