import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspaceListSkeleton,
  WorkspaceLoadMoreFooter,
  WorkspaceTicketCard,
} from "../../ui/workspace";
import type { CampusCareIllustrationName } from "../../ui/CampusCareIllustration";
import { formatError } from "../../utils/formatError";
import type { ResolverRequest } from "../auth/types";
import { ImageLightbox } from "../tickets/ImageLightbox";
import { TicketDetailsPanel } from "../tickets/TicketDetailsPanel";
import type {
  ResolverOption,
  Ticket,
  TicketWithHistory,
} from "../tickets/types";
import { ManagerActionHint } from "./components/ManagerActionHint";
import { ManagerActionSheet } from "./components/ManagerActionSheet";
import { ManagerRequestCardSkeleton } from "./components/ManagerRequestCardSkeleton";
import { ManagerResolverRequestCard } from "./components/ManagerResolverRequestCard";
import { ManagerTabBar, type ManagerTab } from "./components/ManagerTabBar";

type Props = {
  email: string;
  onSignOut: () => void;
};

function createAssignResolverArgs(
  ticketId: Id<"tickets">,
  resolverUserId: Id<"users">,
  note: string,
) {
  if (note.length === 0) {
    return { ticketId, resolverUserId };
  }
  return { ticketId, resolverUserId, note };
}

function createCloseTicketArgs(ticketId: Id<"tickets">, note: string) {
  if (note.length === 0) {
    return { ticketId };
  }
  return { ticketId, note };
}

export function ManagerHome({
  email,
  onSignOut,
}: Props): React.JSX.Element {
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
    { initialNumItems: 12 },
  );
  const resolvedTicketsQuery = usePaginatedQuery(
    api.ticketsManager.listResolvedAwaitingClose,
    {},
    { initialNumItems: 12 },
  );

  const activeResolversRaw = useQuery(
    api.ticketsManager.listActiveResolvers,
    {},
  ) as ResolverOption[] | undefined;
  const activeResolvers = useMemo(
    () => activeResolversRaw ?? [],
    [activeResolversRaw],
  );

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

  const state = useManagerState();
  useSyncActionTicketWithLists(
    openTickets,
    resolvedTickets,
    state.actionTicket,
    state.setActionTicket,
  );

  const navigation = useManagerNavigation({
    isDetailsVisible: state.isDetailsVisible,
    setActionTicket: state.setActionTicket,
    setDetailsTicketId: state.setDetailsTicketId,
    setDetailsTicketPreview: state.setDetailsTicketPreview,
    setErrorMessage: state.setErrorMessage,
    setIsActionSheetVisible: state.setIsActionSheetVisible,
    setIsDetailsVisible: state.setIsDetailsVisible,
    setLightboxImageUri: state.setLightboxImageUri,
  });

  const requestActions = useManagerRequestActions({
    approveRequest,
    decisionNotes: state.decisionNotes,
    rejectRequest,
    setDecisionNotes: state.setDecisionNotes,
    setErrorMessage: state.setErrorMessage,
    setProcessingId: state.setProcessingId,
  });

  const ticketActions = useManagerTicketActions({
    activeResolvers,
    assignResolver,
    assignmentNotes: state.assignmentNotes,
    closeTicket,
    closureNotes: state.closureNotes,
    onActionCompleted: navigation.closeActionSheet,
    selectedResolverByTicket: state.selectedResolverByTicket,
    setErrorMessage: state.setErrorMessage,
    setProcessingId: state.setProcessingId,
  });

  const detailsView = useManagerTicketDetails(
    state.isDetailsVisible,
    state.detailsTicketId,
    state.detailsTicketPreview,
  );

  const tabs = useMemo(
    () => buildTabs(pendingRequests.length, openTickets.length, resolvedTickets.length),
    [openTickets.length, pendingRequests.length, resolvedTickets.length],
  );

  const renderResolverRequest = useCallback(
    ({ item }: { item: ResolverRequest }) => (
      <ManagerResolverRequestCard
        request={item}
        isProcessing={state.processingId === item._id}
        note={state.decisionNotes[item._id] ?? ""}
        onApprove={() => void requestActions.onApprove(item._id)}
        onReject={() => void requestActions.onReject(item._id)}
        onNoteChange={(value) => {
          state.setDecisionNotes((prev) => ({ ...prev, [item._id]: value }));
        }}
      />
    ),
    [requestActions, state],
  );

  const renderTicket = useCallback(
    ({ item }: { item: Ticket }) => (
      <WorkspaceTicketCard
        ticket={item}
        onOpenDetails={navigation.onCardPress}
        onOpenImage={navigation.openLightbox}
        trailing={<ManagerActionHint ticket={item} />}
      />
    ),
    [navigation.onCardPress, navigation.openLightbox],
  );

  const keyExtractor = useCallback(
    (item: { _id: string }) => item._id,
    [],
  );

  const activeData = pickActiveData({
    activeTab: state.activeTab,
    openTickets,
    pendingRequests,
    resolvedTickets,
  });

  const renderItem = pickRenderItem({
    activeTab: state.activeTab,
    renderResolverRequest,
    renderTicket,
  });

  const onLoadMore = useCallback(() => {
    if (state.activeTab === "approvals") {
      resolverRequestsQuery.loadMore(10);
      return;
    }
    if (state.activeTab === "assign") {
      openTicketsQuery.loadMore(10);
      return;
    }
    resolvedTicketsQuery.loadMore(10);
  }, [
    openTicketsQuery,
    resolvedTicketsQuery,
    resolverRequestsQuery,
    state.activeTab,
  ]);

  const activeStatus = pickActiveStatus({
    activeTab: state.activeTab,
    openStatus: openTicketsQuery.status,
    requestsStatus: resolverRequestsQuery.status,
    resolvedStatus: resolvedTicketsQuery.status,
  });

  return (
    <AppScreen>
      <FlatList
        data={activeData as ReadonlyArray<{ _id: string }>}
        keyExtractor={keyExtractor}
        renderItem={renderItem as never}
        ListHeaderComponent={
          <ManagerListHeader
            email={email}
            onSignOut={onSignOut}
            tabs={tabs}
            activeTab={state.activeTab}
            onSelectTab={state.setActiveTab}
            errorMessage={state.errorMessage}
          />
        }
        ListEmptyComponent={
          activeStatus === "LoadingFirstPage" ? (
            <WorkspaceListSkeleton
              renderRow={
                state.activeTab === "approvals"
                  ? (key, progress) => (
                      <ManagerRequestCardSkeleton
                        key={key}
                        progress={progress}
                      />
                    )
                  : undefined
              }
            />
          ) : (
            <WorkspaceEmptyState
              illustration={getEmptyIllustration(state.activeTab)}
              title={getEmptyTitle(state.activeTab)}
              body={getEmptyBody(state.activeTab)}
            />
          )
        }
        ListFooterComponent={
          <WorkspaceLoadMoreFooter
            canLoadMore={activeStatus === "CanLoadMore"}
            onLoadMore={onLoadMore}
          />
        }
        contentContainerStyle={[
          listHeaderStyles.listContent,
          { paddingBottom: Math.max(24, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
      />

      <ManagerActionSheetContainer
        actionTicket={state.actionTicket}
        isActionSheetVisible={state.isActionSheetVisible}
        isProcessing={
          state.actionTicket !== null &&
          state.processingId === state.actionTicket._id
        }
        resolvers={activeResolvers}
        selectedResolverByTicket={state.selectedResolverByTicket}
        assignmentNotes={state.assignmentNotes}
        closureNotes={state.closureNotes}
        errorMessage={state.errorMessage}
        setSelectedResolverByTicket={state.setSelectedResolverByTicket}
        setAssignmentNotes={state.setAssignmentNotes}
        setClosureNotes={state.setClosureNotes}
        closeActionSheet={navigation.closeActionSheet}
        openLightbox={navigation.openLightbox}
        onAssign={(ticket) => void ticketActions.onAssignResolver(ticket)}
        onCloseTicket={(ticket) => void ticketActions.onCloseTicket(ticket)}
      />

      <TicketDetailsPanel
        visible={state.isDetailsVisible}
        ticket={detailsView.ticket}
        historyEntries={detailsView.history}
        historyUnavailableText="Status history is unavailable for this ticket."
        onClose={navigation.closeDetails}
      />

      <ImageLightbox
        imageUri={state.lightboxImageUri}
        onClose={navigation.closeLightbox}
      />
    </AppScreen>
  );
}

// ── List header ────────────────────────────────────────────────────────────

function ManagerListHeader({
  email,
  onSignOut,
  tabs,
  activeTab,
  onSelectTab,
  errorMessage,
}: {
  email: string;
  onSignOut: () => void;
  tabs: ReadonlyArray<{ key: ManagerTab; label: string; count: number }>;
  activeTab: ManagerTab;
  onSelectTab: (tab: ManagerTab) => void;
  errorMessage: string;
}): React.JSX.Element {
  return (
    <View style={listHeaderStyles.container}>
      <WorkspaceHero
        email={email}
        role="Manager"
        illustration="managerAssignment"
        onSignOut={onSignOut}
      />
      <ManagerTabBar
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
      />
      <Text style={listHeaderStyles.sectionTitle}>
        {getSectionTitle(activeTab)}
      </Text>
      {errorMessage ? (
        <Text style={listHeaderStyles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

// ── Action sheet container ─────────────────────────────────────────────────

type ActionSheetContainerProps = {
  actionTicket: Ticket | null;
  isActionSheetVisible: boolean;
  isProcessing: boolean;
  resolvers: ResolverOption[];
  selectedResolverByTicket: Record<string, string>;
  assignmentNotes: Record<string, string>;
  closureNotes: Record<string, string>;
  errorMessage: string;
  setSelectedResolverByTicket: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setAssignmentNotes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setClosureNotes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  closeActionSheet: () => void;
  openLightbox: (uri: string) => void;
  onAssign: (ticket: Ticket) => void;
  onCloseTicket: (ticket: Ticket) => void;
};

function ManagerActionSheetContainer({
  actionTicket,
  isActionSheetVisible,
  isProcessing,
  resolvers,
  selectedResolverByTicket,
  assignmentNotes,
  closureNotes,
  errorMessage,
  setSelectedResolverByTicket,
  setAssignmentNotes,
  setClosureNotes,
  closeActionSheet,
  openLightbox,
  onAssign,
  onCloseTicket,
}: ActionSheetContainerProps): React.JSX.Element {
  const ticketId = actionTicket?._id ?? null;

  const updateSelectedResolver = useCallback(
    (resolverId: string) => {
      if (!ticketId) return;
      setSelectedResolverByTicket((prev) => ({
        ...prev,
        [ticketId]: resolverId,
      }));
    },
    [setSelectedResolverByTicket, ticketId],
  );

  const updateAssignmentNote = useCallback(
    (value: string) => {
      if (!ticketId) return;
      setAssignmentNotes((prev) => ({ ...prev, [ticketId]: value }));
    },
    [setAssignmentNotes, ticketId],
  );

  const updateClosureNote = useCallback(
    (value: string) => {
      if (!ticketId) return;
      setClosureNotes((prev) => ({ ...prev, [ticketId]: value }));
    },
    [setClosureNotes, ticketId],
  );

  const handleAssign = useCallback(() => {
    if (!actionTicket) return;
    onAssign(actionTicket);
  }, [actionTicket, onAssign]);

  const handleCloseTicket = useCallback(() => {
    if (!actionTicket) return;
    onCloseTicket(actionTicket);
  }, [actionTicket, onCloseTicket]);

  const selectedResolverId = lookupNullable(
    ticketId,
    selectedResolverByTicket,
  );
  const assignmentNote = lookupString(ticketId, assignmentNotes);
  const closureNote = lookupString(ticketId, closureNotes);

  return (
    <ManagerActionSheet
      ticket={actionTicket}
      visible={isActionSheetVisible}
      isProcessing={isProcessing}
      resolvers={resolvers}
      selectedResolverId={selectedResolverId}
      assignmentNote={assignmentNote}
      closureNote={closureNote}
      errorMessage={errorMessage}
      onClose={closeActionSheet}
      onSelectResolver={updateSelectedResolver}
      onAssignmentNoteChange={updateAssignmentNote}
      onClosureNoteChange={updateClosureNote}
      onAssign={handleAssign}
      onCloseTicket={handleCloseTicket}
      onOpenImage={openLightbox}
    />
  );
}

function lookupNullable(
  key: string | null,
  map: Record<string, string>,
): string | null {
  if (key === null) return null;
  return map[key] ?? null;
}

function lookupString(key: string | null, map: Record<string, string>): string {
  if (key === null) return "";
  return map[key] ?? "";
}

// ── Hooks ───────────────────────────────────────────────────────────────────

function useManagerState() {
  const [activeTab, setActiveTab] = useState<ManagerTab>("approvals");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [selectedResolverByTicket, setSelectedResolverByTicket] = useState<
    Record<string, string>
  >({});
  const [assignmentNotes, setAssignmentNotes] = useState<
    Record<string, string>
  >({});
  const [closureNotes, setClosureNotes] = useState<Record<string, string>>({});
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);
  const [actionTicket, setActionTicket] = useState<Ticket | null>(null);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [detailsTicketId, setDetailsTicketId] =
    useState<Id<"tickets"> | null>(null);
  const [detailsTicketPreview, setDetailsTicketPreview] =
    useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  return {
    activeTab,
    setActiveTab,
    processingId,
    setProcessingId,
    errorMessage,
    setErrorMessage,
    decisionNotes,
    setDecisionNotes,
    selectedResolverByTicket,
    setSelectedResolverByTicket,
    assignmentNotes,
    setAssignmentNotes,
    closureNotes,
    setClosureNotes,
    lightboxImageUri,
    setLightboxImageUri,
    actionTicket,
    setActionTicket,
    isActionSheetVisible,
    setIsActionSheetVisible,
    detailsTicketId,
    setDetailsTicketId,
    detailsTicketPreview,
    setDetailsTicketPreview,
    isDetailsVisible,
    setIsDetailsVisible,
  };
}

type NavigationDeps = {
  isDetailsVisible: boolean;
  setActionTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
  setDetailsTicketId: React.Dispatch<
    React.SetStateAction<Id<"tickets"> | null>
  >;
  setDetailsTicketPreview: React.Dispatch<React.SetStateAction<Ticket | null>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setIsActionSheetVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDetailsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setLightboxImageUri: React.Dispatch<React.SetStateAction<string | null>>;
};

function useManagerNavigation(deps: NavigationDeps) {
  const {
    isDetailsVisible,
    setActionTicket,
    setDetailsTicketId,
    setDetailsTicketPreview,
    setErrorMessage,
    setIsActionSheetVisible,
    setIsDetailsVisible,
    setLightboxImageUri,
  } = deps;

  const openActionSheet = useCallback(
    (ticket: Ticket) => {
      setErrorMessage("");
      setActionTicket(ticket);
      setIsActionSheetVisible(true);
    },
    [setActionTicket, setErrorMessage, setIsActionSheetVisible],
  );

  const closeActionSheet = useCallback(() => {
    setIsActionSheetVisible(false);
    setTimeout(() => setActionTicket(null), 260);
  }, [setActionTicket, setIsActionSheetVisible]);

  const openDetails = useCallback(
    (ticket: Ticket) => {
      setDetailsTicketId(ticket._id);
      setDetailsTicketPreview(ticket);
      setIsDetailsVisible(true);
    },
    [setDetailsTicketId, setDetailsTicketPreview, setIsDetailsVisible],
  );

  const closeDetails = useCallback(() => {
    setIsDetailsVisible(false);
  }, [setIsDetailsVisible]);

  useEffect(() => {
    if (isDetailsVisible) return;
    const timeoutId = setTimeout(() => {
      setDetailsTicketId(null);
      setDetailsTicketPreview(null);
    }, 260);
    return () => clearTimeout(timeoutId);
  }, [isDetailsVisible, setDetailsTicketId, setDetailsTicketPreview]);

  const openLightbox = useCallback(
    (uri: string) => {
      setLightboxImageUri(uri);
    },
    [setLightboxImageUri],
  );

  const closeLightbox = useCallback(() => {
    setLightboxImageUri(null);
  }, [setLightboxImageUri]);

  const onCardPress = useCallback(
    (ticket: Ticket) => {
      if (ticket.status === "open" || ticket.status === "resolved") {
        openActionSheet(ticket);
      } else {
        openDetails(ticket);
      }
    },
    [openActionSheet, openDetails],
  );

  return {
    closeActionSheet,
    closeDetails,
    closeLightbox,
    onCardPress,
    openLightbox,
  };
}

type RequestActionsDeps = {
  approveRequest: ReturnType<
    typeof useMutation<typeof api.resolverRequests.approve>
  >;
  decisionNotes: Record<string, string>;
  rejectRequest: ReturnType<
    typeof useMutation<typeof api.resolverRequests.reject>
  >;
  setDecisionNotes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setProcessingId: React.Dispatch<React.SetStateAction<string | null>>;
};

function useManagerRequestActions(deps: RequestActionsDeps) {
  const {
    approveRequest,
    decisionNotes,
    rejectRequest,
    setDecisionNotes,
    setErrorMessage,
    setProcessingId,
  } = deps;

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
    [approveRequest, setErrorMessage, setProcessingId],
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
        setDecisionNotes((prev) => ({ ...prev, [requestId]: "" }));
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [
      decisionNotes,
      rejectRequest,
      setDecisionNotes,
      setErrorMessage,
      setProcessingId,
    ],
  );

  return { onApprove, onReject };
}

type TicketActionsDeps = {
  activeResolvers: ResolverOption[];
  assignResolver: ReturnType<
    typeof useMutation<typeof api.ticketsManager.assignResolver>
  >;
  assignmentNotes: Record<string, string>;
  closeTicket: ReturnType<
    typeof useMutation<typeof api.ticketsManager.close>
  >;
  closureNotes: Record<string, string>;
  onActionCompleted: () => void;
  selectedResolverByTicket: Record<string, string>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setProcessingId: React.Dispatch<React.SetStateAction<string | null>>;
};

function useManagerTicketActions(deps: TicketActionsDeps) {
  const {
    activeResolvers,
    assignResolver,
    assignmentNotes,
    closeTicket,
    closureNotes,
    onActionCompleted,
    selectedResolverByTicket,
    setErrorMessage,
    setProcessingId,
  } = deps;

  const onAssignResolver = useCallback(
    async (ticket: Ticket) => {
      const selectedResolverId =
        selectedResolverByTicket[ticket._id] ??
        activeResolvers[0]?._id ??
        null;
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
        onActionCompleted();
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [
      activeResolvers,
      assignResolver,
      assignmentNotes,
      onActionCompleted,
      selectedResolverByTicket,
      setErrorMessage,
      setProcessingId,
    ],
  );

  const onCloseTicket = useCallback(
    async (ticket: Ticket) => {
      const note = (closureNotes[ticket._id] ?? "").trim();
      setProcessingId(ticket._id);
      setErrorMessage("");
      try {
        await closeTicket(createCloseTicketArgs(ticket._id, note));
        onActionCompleted();
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [
      closeTicket,
      closureNotes,
      onActionCompleted,
      setErrorMessage,
      setProcessingId,
    ],
  );

  return { onAssignResolver, onCloseTicket };
}

type DetailsView = {
  ticket: Ticket | null;
  history: TicketWithHistory["history"] | null | undefined;
};

function useManagerTicketDetails(
  isDetailsVisible: boolean,
  detailsTicketId: Id<"tickets"> | null,
  detailsTicketPreview: Ticket | null,
): DetailsView {
  const detailsTicket = useQuery(
    api.ticketsShared.getById,
    isDetailsVisible && detailsTicketId
      ? { ticketId: detailsTicketId }
      : "skip",
  ) as TicketWithHistory | null | undefined;

  return useMemo(() => {
    const ticket = detailsTicket?.ticket ?? detailsTicketPreview;
    const history =
      detailsTicket === undefined ? undefined : detailsTicket?.history ?? null;
    return { ticket, history };
  }, [detailsTicket, detailsTicketPreview]);
}

function useSyncActionTicketWithLists(
  openTickets: Ticket[],
  resolvedTickets: Ticket[],
  actionTicket: Ticket | null,
  setActionTicket: React.Dispatch<React.SetStateAction<Ticket | null>>,
): void {
  useEffect(() => {
    if (!actionTicket) return;
    const refreshed =
      openTickets.find((t) => t._id === actionTicket._id) ??
      resolvedTickets.find((t) => t._id === actionTicket._id) ??
      null;
    if (refreshed && refreshed.status !== actionTicket.status) {
      setActionTicket(refreshed);
    }
  }, [actionTicket, openTickets, resolvedTickets, setActionTicket]);
}

// ── Pure helpers ────────────────────────────────────────────────────────────

function buildTabs(
  approvalsCount: number,
  assignCount: number,
  closeCount: number,
): ReadonlyArray<{ key: ManagerTab; label: string; count: number }> {
  return [
    { key: "approvals", label: "Approvals", count: approvalsCount },
    { key: "assign", label: "Assign", count: assignCount },
    { key: "close", label: "Close", count: closeCount },
  ];
}

function pickActiveData({
  activeTab,
  openTickets,
  pendingRequests,
  resolvedTickets,
}: {
  activeTab: ManagerTab;
  openTickets: Ticket[];
  pendingRequests: ResolverRequest[];
  resolvedTickets: Ticket[];
}): ReadonlyArray<{ _id: string }> {
  if (activeTab === "approvals") return pendingRequests;
  if (activeTab === "assign") return openTickets;
  return resolvedTickets;
}

function pickRenderItem({
  activeTab,
  renderResolverRequest,
  renderTicket,
}: {
  activeTab: ManagerTab;
  renderResolverRequest: ({
    item,
  }: {
    item: ResolverRequest;
  }) => React.JSX.Element;
  renderTicket: ({ item }: { item: Ticket }) => React.JSX.Element;
}) {
  if (activeTab === "approvals") return renderResolverRequest;
  return renderTicket;
}

function pickActiveStatus({
  activeTab,
  openStatus,
  requestsStatus,
  resolvedStatus,
}: {
  activeTab: ManagerTab;
  openStatus: string;
  requestsStatus: string;
  resolvedStatus: string;
}): string {
  if (activeTab === "approvals") return requestsStatus;
  if (activeTab === "assign") return openStatus;
  return resolvedStatus;
}

function getEmptyIllustration(tab: ManagerTab): CampusCareIllustrationName {
  if (tab === "approvals") return "managerAssignment";
  if (tab === "assign") return "campusLocation";
  return "ticketClosed";
}

function getEmptyTitle(tab: ManagerTab): string {
  if (tab === "approvals") return "No pending requests";
  if (tab === "assign") return "Inbox empty";
  return "Nothing to close";
}

function getEmptyBody(tab: ManagerTab): string {
  if (tab === "approvals") {
    return "No resolvers waiting for approval right now.";
  }
  if (tab === "assign") {
    return "No open tickets are waiting for an assignment.";
  }
  return "No resolved tickets are awaiting your closure.";
}

function getSectionTitle(tab: ManagerTab): string {
  if (tab === "approvals") return "Resolver requests";
  if (tab === "assign") return "Open & unassigned";
  return "Awaiting closure";
}

const listHeaderStyles = StyleSheet.create({
  container: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.textPrimary,
    letterSpacing: -0.2,
    marginTop: 4,
    marginBottom: 2,
  },
  errorText: {
    color: theme.colors.red,
    fontSize: 13,
    fontWeight: "500",
  },
  listContent: {
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 2,
  },
});
