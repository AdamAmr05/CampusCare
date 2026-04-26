import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  type StyleProp,
  type ViewStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { ResolverRequest } from "../auth/types";
import { ImageLightbox } from "../tickets/ImageLightbox";
import { TicketDetailsPanel } from "../tickets/TicketDetailsPanel";
import { TicketImagePreview } from "../tickets/TicketImagePreview";
import type {
  ResolverOption,
  Ticket,
  TicketWithHistory,
} from "../tickets/types";
import {
  formatTimestamp,
  getTicketStatusColors,
  getTicketStatusLabel,
  truncateText,
} from "../tickets/utils";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { AppScreen } from "../../ui/AppScreen";
import {
  CampusCareIllustration,
  type CampusCareIllustrationName,
} from "../../ui/CampusCareIllustration";
import { GlassPressable, getActiveGlassTint } from "../../ui/GlassSurface";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { styles } from "./ManagerHome.styles";

type ManagerTab = "resolver_requests" | "assign_tickets" | "close_tickets";

type ManagerHeaderProps = {
  activeTab: ManagerTab;
  email: string;
  errorMessage: string;
  onSelectTab: (tab: ManagerTab) => void;
  onSignOut: () => void;
};

type ResolverRequestCardProps = {
  isProcessing: boolean;
  note: string;
  request: ResolverRequest;
  onApprove: () => void;
  onNoteChange: (value: string) => void;
  onReject: () => void;
};

type OpenTicketAssignmentCardProps = {
  activeResolvers: ResolverOption[];
  isProcessing: boolean;
  note: string;
  selectedResolverId: string;
  ticket: Ticket;
  onNoteChange: (value: string) => void;
  onOpenDetails: () => void;
  onOpenImage: (imageUri: string) => void;
  onSelectResolver: (resolverId: string) => void;
  onSubmit: () => void;
};

type ResolvedTicketClosureCardProps = {
  isProcessing: boolean;
  note: string;
  ticket: Ticket;
  onNoteChange: (value: string) => void;
  onOpenDetails: () => void;
  onOpenImage: (imageUri: string) => void;
  onSubmit: () => void;
};

type ManagerTabPanelProps = {
  activeTab: ManagerTab;
  contentContainerStyle: StyleProp<ViewStyle>;
  header: React.JSX.Element;
  onLoadMore: () => void;
  openTickets: Ticket[];
  pendingRequests: ResolverRequest[];
  renderOpenTicket: ({ item }: { item: Ticket }) => React.JSX.Element;
  renderResolvedTicket: ({ item }: { item: Ticket }) => React.JSX.Element;
  renderResolverRequest: ({
    item,
  }: {
    item: ResolverRequest;
  }) => React.JSX.Element;
  resolvedTickets: Ticket[];
  showLoadMore: boolean;
};

function createAssignResolverArgs(
  ticketId: Id<"tickets">,
  resolverUserId: Id<"users">,
  note: string,
) {
  if (note.length === 0) {
    return {
      ticketId,
      resolverUserId,
    };
  }

  return {
    ticketId,
    resolverUserId,
    note,
  };
}

function createCloseTicketArgs(ticketId: Id<"tickets">, note: string) {
  if (note.length === 0) {
    return { ticketId };
  }

  return {
    ticketId,
    note,
  };
}

function getManagerEmptyMessage(activeTab: ManagerTab): string {
  switch (activeTab) {
    case "resolver_requests":
      return "No pending resolver requests.";
    case "assign_tickets":
      return "No open tickets awaiting assignment.";
    case "close_tickets":
      return "No resolved tickets awaiting closure.";
  }
}

function getManagerEmptyIllustration(
  activeTab: ManagerTab,
): CampusCareIllustrationName {
  switch (activeTab) {
    case "resolver_requests":
      return "managerAssignment";
    case "assign_tickets":
      return "campusLocation";
    case "close_tickets":
      return "ticketClosed";
  }
}

function ManagerHeader({
  activeTab,
  email,
  errorMessage,
  onSelectTab,
  onSignOut,
}: ManagerHeaderProps): React.JSX.Element {
  return (
    <View style={styles.listHeader}>
      <View style={styles.heroCard}>
        <View style={styles.rowBetween}>
          <View style={styles.heroMeta}>
            <Text style={styles.eyebrow}>Manager Workspace</Text>
            <Text style={styles.title}>Operate CampusCare Queue</Text>
            <Text style={styles.subtitle}>
              Approve resolver access, assign open tickets, and finalize closure.
            </Text>
            <Text style={styles.metaText}>{email}</Text>
          </View>
          <View style={styles.headerVisualColumn}>
            <CampusCareIllustration
              accessibilityLabel="Manager assignment illustration"
              name="managerAssignment"
              style={styles.heroIllustration}
            />
            <GlassPressable
              onPress={onSignOut}
              surfaceStyle={styles.signOutButton}
              pressedSurfaceStyle={styles.controlPressed}
            >
              <Text style={styles.signOutText}>Sign out</Text>
            </GlassPressable>
          </View>
        </View>
      </View>

      <NotificationCenter variant="row" />

      <View style={styles.tabsRow}>
        <GlassPressable
          onPress={() => onSelectTab("resolver_requests")}
          surfaceStyle={[
            styles.tabButton,
            activeTab === "resolver_requests" ? styles.tabButtonActive : null,
          ]}
          pressedSurfaceStyle={styles.controlPressed}
          tintColor={getActiveGlassTint(activeTab === "resolver_requests")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "resolver_requests" ? styles.tabTextActive : null,
            ]}
          >
            Resolver Requests
          </Text>
        </GlassPressable>
        <GlassPressable
          onPress={() => onSelectTab("assign_tickets")}
          surfaceStyle={[
            styles.tabButton,
            activeTab === "assign_tickets" ? styles.tabButtonActive : null,
          ]}
          pressedSurfaceStyle={styles.controlPressed}
          tintColor={getActiveGlassTint(activeTab === "assign_tickets")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "assign_tickets" ? styles.tabTextActive : null,
            ]}
          >
            Assign Open Tickets
          </Text>
        </GlassPressable>
        <GlassPressable
          onPress={() => onSelectTab("close_tickets")}
          surfaceStyle={[
            styles.tabButton,
            activeTab === "close_tickets" ? styles.tabButtonActive : null,
          ]}
          pressedSurfaceStyle={styles.controlPressed}
          tintColor={getActiveGlassTint(activeTab === "close_tickets")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "close_tickets" ? styles.tabTextActive : null,
            ]}
          >
            Close Resolved
          </Text>
        </GlassPressable>
      </View>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

function ResolverRequestCard({
  isProcessing,
  note,
  request,
  onApprove,
  onNoteChange,
  onReject,
}: ResolverRequestCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{request.requesterName}</Text>
      <Text style={styles.metaText}>{request.requesterEmail}</Text>
      <Text style={styles.metaText}>
        Submitted {formatTimestamp(request.submittedAt)}
      </Text>
      <Text style={styles.bodyText}>
        Reason: {request.reason ?? "No reason provided."}
      </Text>

      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={styles.input}
        placeholder="Required note for rejection"
        placeholderTextColor={theme.colors.textMuted}
      />

      <View style={styles.row}>
        <Pressable
          disabled={isProcessing}
          onPress={onApprove}
          style={[
            styles.primaryButton,
            styles.halfButton,
            isProcessing ? styles.disabled : null,
          ]}
        >
          <Text style={styles.primaryButtonText}>Approve</Text>
        </Pressable>
        <GlassPressable
          disabled={isProcessing}
          onPress={onReject}
          containerStyle={styles.halfButton}
          surfaceStyle={[
            styles.secondaryButton,
            styles.halfButton,
          ]}
          pressedSurfaceStyle={styles.controlPressed}
          disabledSurfaceStyle={styles.controlDisabled}
        >
          <Text style={styles.secondaryButtonText}>Reject</Text>
        </GlassPressable>
      </View>
    </View>
  );
}

function TicketSummaryPreview(props: {
  bodyText?: React.JSX.Element;
  onOpenDetails: () => void;
  onOpenImage: (imageUri: string) => void;
  ticket: Ticket;
}): React.JSX.Element {
  const statusColors = getTicketStatusColors(props.ticket.status);

  return (
    <Pressable onPress={props.onOpenDetails} style={styles.detailsPreviewArea}>
      <View style={styles.rowBetween}>
        <Text style={styles.cardTitle}>{props.ticket.category}</Text>
        <View
          style={[styles.statusBadge, { backgroundColor: statusColors.background }]}
        >
          <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
            {getTicketStatusLabel(props.ticket.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.metaText}>{props.ticket.location}</Text>
      {props.ticket.imageUrl ? (
        <TicketImagePreview
          uri={props.ticket.imageUrl}
          style={styles.ticketImage}
          onPress={(event) => {
            event.stopPropagation();
            props.onOpenImage(props.ticket.imageUrl!);
          }}
        />
      ) : null}
      <Text style={styles.bodyText}>
        {truncateText(props.ticket.description, 130)}
      </Text>
      {props.bodyText}
    </Pressable>
  );
}

function OpenTicketAssignmentCard({
  activeResolvers,
  isProcessing,
  note,
  selectedResolverId,
  ticket,
  onNoteChange,
  onOpenDetails,
  onOpenImage,
  onSelectResolver,
  onSubmit,
}: OpenTicketAssignmentCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <TicketSummaryPreview
        ticket={ticket}
        onOpenDetails={onOpenDetails}
        onOpenImage={onOpenImage}
      />

      <Text style={styles.smallLabel}>Assign Resolver</Text>
      <View style={styles.resolverChipRow}>
        {activeResolvers.map((resolver) => (
          <GlassPressable
            key={resolver._id}
            surfaceStyle={[
              styles.resolverChip,
              selectedResolverId === resolver._id ? styles.resolverChipActive : null,
            ]}
            onPress={() => onSelectResolver(resolver._id)}
            pressedSurfaceStyle={styles.controlPressed}
            tintColor={getActiveGlassTint(selectedResolverId === resolver._id)}
          >
            <Text
              style={[
                styles.resolverChipText,
                selectedResolverId === resolver._id
                  ? styles.resolverChipTextActive
                  : null,
              ]}
            >
              {resolver.fullName}
            </Text>
          </GlassPressable>
        ))}
      </View>

      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={styles.input}
        placeholder="Optional assignment note"
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable
        disabled={isProcessing}
        onPress={onSubmit}
        style={[styles.primaryButton, isProcessing ? styles.disabled : null]}
      >
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Assigning..." : "Assign Ticket"}
        </Text>
      </Pressable>
    </View>
  );
}

function ResolvedTicketClosureCard({
  isProcessing,
  note,
  ticket,
  onNoteChange,
  onOpenDetails,
  onOpenImage,
  onSubmit,
}: ResolvedTicketClosureCardProps): React.JSX.Element {
  return (
    <View style={styles.card}>
      <TicketSummaryPreview
        ticket={ticket}
        onOpenDetails={onOpenDetails}
        onOpenImage={onOpenImage}
        bodyText={
          <>
            <Text style={styles.bodyText}>
              Resolver note: {ticket.resolutionNote ?? "No note."}
            </Text>
            {ticket.resolutionImageUrl ? (
              <TicketImagePreview
                uri={ticket.resolutionImageUrl}
                style={styles.ticketImage}
                onPress={(event) => {
                  event.stopPropagation();
                  onOpenImage(ticket.resolutionImageUrl!);
                }}
              />
            ) : null}
          </>
        }
      />

      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={styles.input}
        placeholder="Optional closure note"
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable
        disabled={isProcessing}
        onPress={onSubmit}
        style={[styles.primaryButton, isProcessing ? styles.disabled : null]}
      >
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Closing..." : "Close Ticket"}
        </Text>
      </Pressable>
    </View>
  );
}

function ManagerTabPanel({
  activeTab,
  contentContainerStyle,
  header,
  onLoadMore,
  openTickets,
  pendingRequests,
  renderOpenTicket,
  renderResolvedTicket,
  renderResolverRequest,
  resolvedTickets,
  showLoadMore,
}: ManagerTabPanelProps): React.JSX.Element {
  const listFooter = (
    <View style={styles.footerSpace}>
      {showLoadMore ? (
        <GlassPressable
          onPress={onLoadMore}
          surfaceStyle={styles.secondaryButton}
          pressedSurfaceStyle={styles.controlPressed}
        >
          <Text style={styles.secondaryButtonText}>Load More</Text>
        </GlassPressable>
      ) : null}
    </View>
  );

  const listEmpty = (
    <View style={styles.emptyState}>
      <CampusCareIllustration
        accessibilityLabel="Empty queue illustration"
        name={getManagerEmptyIllustration(activeTab)}
        style={styles.emptyIllustration}
      />
      <Text style={styles.emptyText}>{getManagerEmptyMessage(activeTab)}</Text>
    </View>
  );

  switch (activeTab) {
    case "resolver_requests":
      return (
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item._id}
          renderItem={renderResolverRequest}
          contentContainerStyle={contentContainerStyle}
          ListHeaderComponent={header}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      );
    case "assign_tickets":
      return (
        <FlatList
          data={openTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderOpenTicket}
          contentContainerStyle={contentContainerStyle}
          ListHeaderComponent={header}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      );
    case "close_tickets":
      return (
        <FlatList
          data={resolvedTickets}
          keyExtractor={(item) => item._id}
          renderItem={renderResolvedTicket}
          contentContainerStyle={contentContainerStyle}
          ListHeaderComponent={header}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      );
  }
}

export function ManagerHome(props: {
  email: string;
  onSignOut: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
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

  const [activeTab, setActiveTab] =
    useState<ManagerTab>("resolver_requests");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [selectedResolverByTicket, setSelectedResolverByTicket] = useState<
    Record<string, string>
  >({});
  const [assignmentNotes, setAssignmentNotes] = useState<Record<string, string>>(
    {},
  );
  const [closureNotes, setClosureNotes] = useState<Record<string, string>>({});
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] =
    useState<Id<"tickets"> | null>(null);
  const [selectedTicketPreview, setSelectedTicketPreview] =
    useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const selectedTicket = useQuery(
    api.ticketsShared.getById,
    isDetailsVisible && selectedTicketId ? { ticketId: selectedTicketId } : "skip",
  ) as TicketWithHistory | null | undefined;

  const pendingRequests = useMemo(
    () => resolverRequestsQuery.results as ResolverRequest[],
    [resolverRequestsQuery.results],
  );
  const openTickets = useMemo(
    () => openTicketsQuery.results as Ticket[],
    [openTicketsQuery.results],
  );
  const resolvedTickets = useMemo(
    () => resolvedTicketsQuery.results as Ticket[],
    [resolvedTicketsQuery.results],
  );

  const onApprove = useCallback(
    async (requestId: Id<"resolver_requests">) => {
      setProcessingId(requestId);
      setErrorMessage("");

      try {
        await approveRequest({ requestId });
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [approveRequest],
  );

  const onReject = useCallback(
    async (requestId: Id<"resolver_requests">) => {
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
    },
    [decisionNotes, rejectRequest],
  );

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
        await assignResolver(
          createAssignResolverArgs(
            ticket._id,
            selectedResolverId as Id<"users">,
            note,
          ),
        );
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
        await closeTicket(createCloseTicketArgs(ticket._id, note));
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [closeTicket, closureNotes],
  );

  const openTicketDetails = useCallback((ticket: Ticket) => {
    setSelectedTicketId(ticket._id);
    setSelectedTicketPreview(ticket);
    setIsDetailsVisible(true);
  }, []);

  const closeTicketDetails = useCallback(() => {
    setIsDetailsVisible(false);
  }, []);

  const openLightbox = useCallback((imageUri: string) => {
    setLightboxImageUri(imageUri);
  }, []);

  useEffect(() => {
    if (isDetailsVisible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setSelectedTicketId(null);
      setSelectedTicketPreview(null);
    }, 260);

    return () => clearTimeout(timeoutId);
  }, [isDetailsVisible]);

  const renderResolverRequest = useCallback(
    ({ item }: { item: ResolverRequest }) => (
      <ResolverRequestCard
        isProcessing={processingId === item._id}
        note={decisionNotes[item._id] ?? ""}
        request={item}
        onApprove={() => {
          void onApprove(item._id);
        }}
        onNoteChange={(value) => {
          setDecisionNotes((previous) => ({ ...previous, [item._id]: value }));
        }}
        onReject={() => {
          void onReject(item._id);
        }}
      />
    ),
    [decisionNotes, onApprove, onReject, processingId],
  );

  const renderOpenTicket = useCallback(
    ({ item }: { item: Ticket }) => (
      <OpenTicketAssignmentCard
        activeResolvers={activeResolvers ?? []}
        isProcessing={processingId === item._id}
        note={assignmentNotes[item._id] ?? ""}
        selectedResolverId={selectedResolverByTicket[item._id] ?? ""}
        ticket={item}
        onNoteChange={(value) => {
          setAssignmentNotes((previous) => ({ ...previous, [item._id]: value }));
        }}
        onOpenDetails={() => openTicketDetails(item)}
        onOpenImage={openLightbox}
        onSelectResolver={(resolverId) => {
          setSelectedResolverByTicket((previous) => ({
            ...previous,
            [item._id]: resolverId,
          }));
        }}
        onSubmit={() => {
          void onAssignResolver(item);
        }}
      />
    ),
    [
      activeResolvers,
      assignmentNotes,
      onAssignResolver,
      openLightbox,
      openTicketDetails,
      processingId,
      selectedResolverByTicket,
    ],
  );

  const renderResolvedTicket = useCallback(
    ({ item }: { item: Ticket }) => (
      <ResolvedTicketClosureCard
        isProcessing={processingId === item._id}
        note={closureNotes[item._id] ?? ""}
        ticket={item}
        onNoteChange={(value) => {
          setClosureNotes((previous) => ({ ...previous, [item._id]: value }));
        }}
        onOpenDetails={() => openTicketDetails(item)}
        onOpenImage={openLightbox}
        onSubmit={() => {
          void onCloseTicket(item);
        }}
      />
    ),
    [closureNotes, onCloseTicket, openLightbox, openTicketDetails, processingId],
  );

  const activeLoadStatus =
    activeTab === "resolver_requests"
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
    <ManagerHeader
      activeTab={activeTab}
      email={props.email}
      errorMessage={errorMessage}
      onSelectTab={setActiveTab}
      onSignOut={props.onSignOut}
    />
  );
  const listContentStyle = useMemo(
    () => [styles.listContent, { paddingBottom: Math.max(24, insets.bottom + 16) }],
    [insets.bottom],
  );

  return (
    <AppScreen>
      <ManagerTabPanel
        activeTab={activeTab}
        contentContainerStyle={listContentStyle}
        header={listHeader}
        onLoadMore={onLoadMore}
        openTickets={openTickets}
        pendingRequests={pendingRequests}
        renderOpenTicket={renderOpenTicket}
        renderResolvedTicket={renderResolvedTicket}
        renderResolverRequest={renderResolverRequest}
        resolvedTickets={resolvedTickets}
        showLoadMore={activeLoadStatus === "CanLoadMore"}
      />
      <TicketDetailsPanel
        visible={isDetailsVisible}
        ticket={selectedTicket?.ticket ?? selectedTicketPreview}
        historyEntries={
          selectedTicket === undefined ? undefined : selectedTicket?.history ?? null
        }
        historyUnavailableText="Status history is unavailable for this ticket."
        onClose={closeTicketDetails}
      />
      <ImageLightbox imageUri={lightboxImageUri} onClose={() => setLightboxImageUri(null)} />
    </AppScreen>
  );
}
