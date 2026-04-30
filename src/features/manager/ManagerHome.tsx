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
import {
  ManagerBottomNav,
  type ManagerSection,
} from "./components/ManagerBottomNav";
import {
  ManagerPeopleFilter,
  type PeopleCount,
  type PeopleFilter,
} from "./components/ManagerPeopleFilter";
import { ManagerRequestCardSkeleton } from "./components/ManagerRequestCardSkeleton";
import { ManagerResolverRequestCard } from "./components/ManagerResolverRequestCard";
import {
  ManagerStatusFilter,
  type MonitorCount,
  type MonitorStatusFilter,
} from "./components/ManagerStatusFilter";
import { ManagerTabBar, type ManagerTab } from "./components/ManagerTabBar";
import {
  ManagerUserCard,
  type DirectoryUser,
  type UserCardAction,
} from "./components/ManagerUserCard";

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
  const deactivateResolver = useMutation(api.usersManager.deactivateResolver);
  const reactivateResolver = useMutation(api.usersManager.reactivateResolver);

  const state = useManagerState();

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

  const directoryQueryArgs = pickDirectoryQueryArgs(
    state.activeSection,
    state.peopleFilter,
  );
  const directoryQuery = usePaginatedQuery(
    api.usersManager.listDirectory,
    directoryQueryArgs,
    { initialNumItems: 12 },
  );

  const inactiveDirectoryQuery = usePaginatedQuery(
    api.usersManager.listInactiveResolvers,
    pickInactiveQueryArgs(state.activeSection, state.peopleFilter),
    { initialNumItems: 12 },
  );

  // Always query so the bottom-nav People badge (pending approvals) stays live
  // outside the People section. The query is a few indexed `take(201)` reads,
  // and the manager experience needs the cross-section signal.
  const directoryCountsRaw = useQuery(api.usersManager.directoryCounts, {});
  const directoryCounts = useMemo(
    () =>
      directoryCountsRaw ?? {
        approvals: createEmptyPeopleCount(),
        resolvers: createEmptyPeopleCount(),
        managers: createEmptyPeopleCount(),
        inactive: createEmptyPeopleCount(),
      },
    [directoryCountsRaw],
  );

  const directoryUsers = useMemo(
    () => directoryQuery.results as DirectoryUser[],
    [directoryQuery.results],
  );
  const inactiveUsers = useMemo(
    () => inactiveDirectoryQuery.results as DirectoryUser[],
    [inactiveDirectoryQuery.results],
  );

  const monitorTicketsQuery = usePaginatedQuery(
    api.ticketsManager.listMonitor,
    state.activeSection === "monitor"
      ? { statusFilter: state.monitorFilter }
      : "skip",
    { initialNumItems: 12 },
  );

  const monitorCountsRaw = useQuery(
    api.ticketsManager.monitorCounts,
    state.activeSection === "monitor" ? {} : "skip",
  );
  const monitorCounts = useMemo(
    () =>
      monitorCountsRaw ?? {
        open: createEmptyMonitorCount(),
        assigned: createEmptyMonitorCount(),
        in_progress: createEmptyMonitorCount(),
        resolved: createEmptyMonitorCount(),
        closed: createEmptyMonitorCount(),
      },
    [monitorCountsRaw],
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
  const monitorTickets = useMemo(
    () => monitorTicketsQuery.results as Ticket[],
    [monitorTicketsQuery.results],
  );

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
    () => buildTabs(openTickets.length, resolvedTickets.length),
    [openTickets.length, resolvedTickets.length],
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
        onOpenDetails={
          state.activeSection === "monitor"
            ? navigation.openDetails
            : navigation.onCardPress
        }
        onOpenImage={navigation.openLightbox}
        trailing={
          state.activeSection === "monitor" ? null : (
            <ManagerActionHint ticket={item} />
          )
        }
      />
    ),
    [
      navigation.onCardPress,
      navigation.openDetails,
      navigation.openLightbox,
      state.activeSection,
    ],
  );

  const directoryActions = useDirectoryActions({
    deactivateResolver,
    reactivateResolver,
    setErrorMessage: state.setErrorMessage,
    setProcessingId: state.setProcessingId,
  });

  const renderDirectoryUser = useCallback(
    ({ item }: { item: DirectoryUser }) => (
      <ManagerUserCard
        user={item}
        isProcessing={state.processingId === item._id}
        action={pickUserCardAction(item, state.peopleFilter)}
        isInactive={state.peopleFilter === "inactive"}
        onDeactivate={(userId) => void directoryActions.deactivate(userId)}
        onReactivate={(userId) => void directoryActions.reactivate(userId)}
      />
    ),
    [directoryActions, state.peopleFilter, state.processingId],
  );

  const keyExtractor = useCallback(
    (item: { _id: string }) => item._id,
    [],
  );

  const activeData = pickActiveData({
    activeSection: state.activeSection,
    activeTab: state.activeTab,
    peopleFilter: state.peopleFilter,
    directoryUsers,
    inactiveUsers,
    monitorTickets,
    openTickets,
    pendingRequests,
    resolvedTickets,
  });

  const renderItem = pickRenderItem({
    activeSection: state.activeSection,
    activeTab: state.activeTab,
    peopleFilter: state.peopleFilter,
    renderResolverRequest,
    renderTicket,
    renderDirectoryUser,
  });

  const onLoadMore = useCallback(() => {
    const loader = pickActiveLoader({
      activeSection: state.activeSection,
      activeTab: state.activeTab,
      peopleFilter: state.peopleFilter,
      directoryQuery,
      inactiveDirectoryQuery,
      monitorTicketsQuery,
      openTicketsQuery,
      resolvedTicketsQuery,
      resolverRequestsQuery,
    });
    loader.loadMore(10);
  }, [
    directoryQuery,
    inactiveDirectoryQuery,
    monitorTicketsQuery,
    openTicketsQuery,
    resolvedTicketsQuery,
    resolverRequestsQuery,
    state.activeSection,
    state.activeTab,
    state.peopleFilter,
  ]);

  const activeStatus = pickActiveStatus({
    activeSection: state.activeSection,
    activeTab: state.activeTab,
    peopleFilter: state.peopleFilter,
    directoryStatus: directoryQuery.status,
    inactiveStatus: inactiveDirectoryQuery.status,
    monitorStatus: monitorTicketsQuery.status,
    openStatus: openTicketsQuery.status,
    requestsStatus: resolverRequestsQuery.status,
    resolvedStatus: resolvedTicketsQuery.status,
  });

  const actionBadgeCount = openTickets.length + resolvedTickets.length;
  const peopleBadgeCount = directoryCounts.approvals.value;

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
            activeSection={state.activeSection}
            tabs={tabs}
            activeTab={state.activeTab}
            onSelectTab={state.setActiveTab}
            monitorFilter={state.monitorFilter}
            onSelectMonitorFilter={state.setMonitorFilter}
            monitorCounts={monitorCounts}
            peopleFilter={state.peopleFilter}
            onSelectPeopleFilter={state.setPeopleFilter}
            peopleCounts={directoryCounts}
            errorMessage={state.errorMessage}
          />
        }
        ListEmptyComponent={
          activeStatus === "LoadingFirstPage" ? (
            <WorkspaceListSkeleton
              renderRow={
                state.activeSection === "people" &&
                state.peopleFilter === "approvals"
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
              illustration={getEmptyIllustration({
                activeSection: state.activeSection,
                activeTab: state.activeTab,
                monitorFilter: state.monitorFilter,
                peopleFilter: state.peopleFilter,
              })}
              title={getEmptyTitle({
                activeSection: state.activeSection,
                activeTab: state.activeTab,
                monitorFilter: state.monitorFilter,
                peopleFilter: state.peopleFilter,
              })}
              body={getEmptyBody({
                activeSection: state.activeSection,
                activeTab: state.activeTab,
                monitorFilter: state.monitorFilter,
                peopleFilter: state.peopleFilter,
              })}
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
          { paddingBottom: Math.max(96, insets.bottom + 88) },
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
        onViewHistory={(ticket) => {
          navigation.closeActionSheet();
          navigation.openDetails(ticket);
        }}
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

      <View style={listHeaderStyles.bottomNavWrapper} pointerEvents="box-none">
        <ManagerBottomNav
          activeSection={state.activeSection}
          onSelect={state.setActiveSection}
          actionBadgeCount={actionBadgeCount}
          peopleBadgeCount={peopleBadgeCount}
        />
      </View>
    </AppScreen>
  );
}

// ── List header ────────────────────────────────────────────────────────────

function ManagerListHeader({
  email,
  onSignOut,
  activeSection,
  tabs,
  activeTab,
  onSelectTab,
  monitorFilter,
  onSelectMonitorFilter,
  monitorCounts,
  peopleFilter,
  onSelectPeopleFilter,
  peopleCounts,
  errorMessage,
}: {
  email: string;
  onSignOut: () => void;
  activeSection: ManagerSection;
  tabs: ReadonlyArray<{ key: ManagerTab; label: string; count: number }>;
  activeTab: ManagerTab;
  onSelectTab: (tab: ManagerTab) => void;
  monitorFilter: MonitorStatusFilter;
  onSelectMonitorFilter: (filter: MonitorStatusFilter) => void;
  monitorCounts: {
    open: MonitorCount;
    assigned: MonitorCount;
    in_progress: MonitorCount;
    resolved: MonitorCount;
    closed: MonitorCount;
  };
  peopleFilter: PeopleFilter;
  onSelectPeopleFilter: (filter: PeopleFilter) => void;
  peopleCounts: {
    approvals: PeopleCount;
    resolvers: PeopleCount;
    managers: PeopleCount;
    inactive: PeopleCount;
  };
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
      <ManagerListHeaderControls
        activeSection={activeSection}
        tabs={tabs}
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        monitorFilter={monitorFilter}
        onSelectMonitorFilter={onSelectMonitorFilter}
        monitorCounts={monitorCounts}
        peopleFilter={peopleFilter}
        onSelectPeopleFilter={onSelectPeopleFilter}
        peopleCounts={peopleCounts}
      />
      {errorMessage ? (
        <Text style={listHeaderStyles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

function ManagerListHeaderControls({
  activeSection,
  tabs,
  activeTab,
  onSelectTab,
  monitorFilter,
  onSelectMonitorFilter,
  monitorCounts,
  peopleFilter,
  onSelectPeopleFilter,
  peopleCounts,
}: {
  activeSection: ManagerSection;
  tabs: ReadonlyArray<{ key: ManagerTab; label: string; count: number }>;
  activeTab: ManagerTab;
  onSelectTab: (tab: ManagerTab) => void;
  monitorFilter: MonitorStatusFilter;
  onSelectMonitorFilter: (filter: MonitorStatusFilter) => void;
  monitorCounts: {
    open: MonitorCount;
    assigned: MonitorCount;
    in_progress: MonitorCount;
    resolved: MonitorCount;
    closed: MonitorCount;
  };
  peopleFilter: PeopleFilter;
  onSelectPeopleFilter: (filter: PeopleFilter) => void;
  peopleCounts: {
    approvals: PeopleCount;
    resolvers: PeopleCount;
    managers: PeopleCount;
    inactive: PeopleCount;
  };
}): React.JSX.Element {
  if (activeSection === "action") {
    return (
      <>
        <ManagerTabBar
          tabs={tabs}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
        />
        <Text style={listHeaderStyles.sectionTitle}>
          {getSectionTitle(activeTab)}
        </Text>
      </>
    );
  }
  if (activeSection === "monitor") {
    return (
      <>
        <ManagerStatusFilter
          active={monitorFilter}
          onSelect={onSelectMonitorFilter}
          counts={monitorCounts}
        />
        <Text style={listHeaderStyles.sectionTitle}>
          {getMonitorSectionTitle(monitorFilter)}
        </Text>
      </>
    );
  }
  return (
    <>
      <ManagerPeopleFilter
        active={peopleFilter}
        onSelect={onSelectPeopleFilter}
        counts={peopleCounts}
      />
      <Text style={listHeaderStyles.sectionTitle}>
        {getPeopleSectionTitle(peopleFilter)}
      </Text>
    </>
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
  onViewHistory: (ticket: Ticket) => void;
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
  onViewHistory,
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

  const handleViewHistory = useCallback(() => {
    if (!actionTicket) return;
    onViewHistory(actionTicket);
  }, [actionTicket, onViewHistory]);

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
      onViewHistory={handleViewHistory}
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
  const [activeSection, setActiveSection] =
    useState<ManagerSection>("action");
  const [activeTab, setActiveTab] = useState<ManagerTab>("assign");
  const [monitorFilter, setMonitorFilter] =
    useState<MonitorStatusFilter>("all");
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("approvals");
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
    activeSection,
    setActiveSection,
    activeTab,
    setActiveTab,
    monitorFilter,
    setMonitorFilter,
    peopleFilter,
    setPeopleFilter,
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
    openDetails,
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

type DirectoryActionsDeps = {
  deactivateResolver: ReturnType<
    typeof useMutation<typeof api.usersManager.deactivateResolver>
  >;
  reactivateResolver: ReturnType<
    typeof useMutation<typeof api.usersManager.reactivateResolver>
  >;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setProcessingId: React.Dispatch<React.SetStateAction<string | null>>;
};

function useDirectoryActions(deps: DirectoryActionsDeps) {
  const {
    deactivateResolver,
    reactivateResolver,
    setErrorMessage,
    setProcessingId,
  } = deps;

  const runDirectoryMutation = useCallback(
    async (
      userId: Id<"users">,
      mutate: (args: { userId: Id<"users"> }) => Promise<unknown>,
    ) => {
      setProcessingId(userId);
      setErrorMessage("");
      try {
        await mutate({ userId });
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingId(null);
      }
    },
    [setErrorMessage, setProcessingId],
  );

  const deactivate = useCallback(
    (userId: Id<"users">) => runDirectoryMutation(userId, deactivateResolver),
    [deactivateResolver, runDirectoryMutation],
  );

  const reactivate = useCallback(
    (userId: Id<"users">) => runDirectoryMutation(userId, reactivateResolver),
    [reactivateResolver, runDirectoryMutation],
  );

  return { deactivate, reactivate };
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
  assignCount: number,
  closeCount: number,
): ReadonlyArray<{ key: ManagerTab; label: string; count: number }> {
  return [
    { key: "assign", label: "Assign", count: assignCount },
    { key: "close", label: "Close", count: closeCount },
  ];
}

function pickActiveData({
  activeSection,
  activeTab,
  peopleFilter,
  directoryUsers,
  inactiveUsers,
  monitorTickets,
  openTickets,
  pendingRequests,
  resolvedTickets,
}: {
  activeSection: ManagerSection;
  activeTab: ManagerTab;
  peopleFilter: PeopleFilter;
  directoryUsers: DirectoryUser[];
  inactiveUsers: DirectoryUser[];
  monitorTickets: Ticket[];
  openTickets: Ticket[];
  pendingRequests: ResolverRequest[];
  resolvedTickets: Ticket[];
}): ReadonlyArray<{ _id: string }> {
  if (activeSection === "people") {
    if (peopleFilter === "approvals") return pendingRequests;
    if (peopleFilter === "inactive") return inactiveUsers;
    return directoryUsers;
  }
  if (activeSection === "monitor") return monitorTickets;
  if (activeTab === "assign") return openTickets;
  return resolvedTickets;
}

function pickRenderItem({
  activeSection,
  activeTab,
  peopleFilter,
  renderResolverRequest,
  renderTicket,
  renderDirectoryUser,
}: {
  activeSection: ManagerSection;
  activeTab: ManagerTab;
  peopleFilter: PeopleFilter;
  renderResolverRequest: ({
    item,
  }: {
    item: ResolverRequest;
  }) => React.JSX.Element;
  renderTicket: ({ item }: { item: Ticket }) => React.JSX.Element;
  renderDirectoryUser: ({
    item,
  }: {
    item: DirectoryUser;
  }) => React.JSX.Element;
}) {
  if (activeSection === "people") {
    if (peopleFilter === "approvals") return renderResolverRequest;
    return renderDirectoryUser;
  }
  if (activeSection === "monitor") return renderTicket;
  return renderTicket;
}

function pickActiveStatus({
  activeSection,
  activeTab,
  peopleFilter,
  directoryStatus,
  inactiveStatus,
  monitorStatus,
  openStatus,
  requestsStatus,
  resolvedStatus,
}: {
  activeSection: ManagerSection;
  activeTab: ManagerTab;
  peopleFilter: PeopleFilter;
  directoryStatus: string;
  inactiveStatus: string;
  monitorStatus: string;
  openStatus: string;
  requestsStatus: string;
  resolvedStatus: string;
}): string {
  if (activeSection === "people") {
    if (peopleFilter === "approvals") return requestsStatus;
    if (peopleFilter === "inactive") return inactiveStatus;
    return directoryStatus;
  }
  if (activeSection === "monitor") return monitorStatus;
  if (activeTab === "assign") return openStatus;
  return resolvedStatus;
}

type EmptyContext = {
  activeSection: ManagerSection;
  activeTab: ManagerTab;
  monitorFilter: MonitorStatusFilter;
  peopleFilter: PeopleFilter;
};

const MONITOR_EMPTY_ILLUSTRATION: Record<
  MonitorStatusFilter,
  CampusCareIllustrationName
> = {
  all: "managerAssignment",
  open: "campusLocation",
  assigned: "resolverProgress",
  in_progress: "resolverProgress",
  resolved: "ticketClosed",
  closed: "ticketClosed",
};

const PEOPLE_EMPTY_ILLUSTRATION: Record<
  PeopleFilter,
  CampusCareIllustrationName
> = {
  approvals: "managerAssignment",
  resolvers: "resolverProgress",
  managers: "managerAssignment",
  inactive: "ticketClosed",
};

function getEmptyIllustration(
  context: EmptyContext,
): CampusCareIllustrationName {
  if (context.activeSection === "people") {
    return PEOPLE_EMPTY_ILLUSTRATION[context.peopleFilter];
  }
  if (context.activeSection === "monitor") {
    return MONITOR_EMPTY_ILLUSTRATION[context.monitorFilter];
  }
  if (context.activeTab === "assign") return "campusLocation";
  return "ticketClosed";
}

function getEmptyTitle(context: EmptyContext): string {
  if (context.activeSection === "people") {
    return getPeopleEmptyTitle(context.peopleFilter);
  }
  if (context.activeSection === "monitor") {
    if (context.monitorFilter === "all") return "No tickets yet";
    return `No ${getMonitorFilterLabel(context.monitorFilter).toLowerCase()} tickets`;
  }
  if (context.activeTab === "assign") return "Inbox empty";
  return "Nothing to close";
}

function getEmptyBody(context: EmptyContext): string {
  if (context.activeSection === "people") {
    return getPeopleEmptyBody(context.peopleFilter);
  }
  if (context.activeSection === "monitor") {
    if (context.monitorFilter === "all") {
      return "Submitted tickets will appear here as they come in.";
    }
    return `Tickets with the "${getMonitorFilterLabel(
      context.monitorFilter,
    ).toLowerCase()}" status will appear here.`;
  }
  if (context.activeTab === "assign") {
    return "No open tickets are waiting for an assignment.";
  }
  return "No resolved tickets are awaiting your closure.";
}

function getPeopleEmptyTitle(filter: PeopleFilter): string {
  if (filter === "approvals") return "No pending requests";
  if (filter === "resolvers") return "No active resolvers";
  if (filter === "inactive") return "No deactivated resolvers";
  return "No managers yet";
}

function getPeopleEmptyBody(filter: PeopleFilter): string {
  if (filter === "approvals") {
    return "No resolvers waiting for approval right now.";
  }
  if (filter === "resolvers") {
    return "Approved resolvers will appear here once requests are accepted.";
  }
  if (filter === "inactive") {
    return "Resolvers you deactivate will appear here and can be reactivated.";
  }
  return "Manager accounts will appear here as they are added.";
}

function getSectionTitle(tab: ManagerTab): string {
  if (tab === "assign") return "Open & unassigned";
  return "Awaiting closure";
}

function getMonitorSectionTitle(filter: MonitorStatusFilter): string {
  if (filter === "all") return "All submitted tickets";
  return `${getMonitorFilterLabel(filter)} tickets`;
}

function getPeopleSectionTitle(filter: PeopleFilter): string {
  if (filter === "approvals") return "Resolver requests";
  if (filter === "resolvers") return "Active resolvers";
  if (filter === "inactive") return "Deactivated resolvers";
  return "Managers";
}

function getMonitorFilterLabel(filter: MonitorStatusFilter): string {
  switch (filter) {
    case "all":
      return "All";
    case "open":
      return "Open";
    case "assigned":
      return "Assigned";
    case "in_progress":
      return "In progress";
    case "resolved":
      return "Resolved";
    case "closed":
      return "Closed";
    default:
      return filter;
  }
}

function createEmptyMonitorCount(): MonitorCount {
  return {
    value: 0,
    isCapped: false,
  };
}

function createEmptyPeopleCount(): PeopleCount {
  return {
    value: 0,
    isCapped: false,
  };
}

function pickDirectoryQueryArgs(
  activeSection: ManagerSection,
  peopleFilter: PeopleFilter,
): { filter: "resolvers" | "managers" } | "skip" {
  if (activeSection !== "people") return "skip";
  if (peopleFilter === "resolvers") return { filter: "resolvers" };
  if (peopleFilter === "managers") return { filter: "managers" };
  return "skip";
}

function pickInactiveQueryArgs(
  activeSection: ManagerSection,
  peopleFilter: PeopleFilter,
): Record<string, never> | "skip" {
  if (activeSection === "people" && peopleFilter === "inactive") return {};
  return "skip";
}

function pickUserCardAction(
  user: DirectoryUser,
  peopleFilter: PeopleFilter,
): UserCardAction {
  if (peopleFilter === "inactive") return "reactivate";
  if (peopleFilter === "resolvers" && user.role === "resolver") {
    return "deactivate";
  }
  return "none";
}

type Loader = { loadMore: (n: number) => void };

function pickActiveLoader({
  activeSection,
  activeTab,
  peopleFilter,
  directoryQuery,
  inactiveDirectoryQuery,
  monitorTicketsQuery,
  openTicketsQuery,
  resolvedTicketsQuery,
  resolverRequestsQuery,
}: {
  activeSection: ManagerSection;
  activeTab: ManagerTab;
  peopleFilter: PeopleFilter;
  directoryQuery: Loader;
  inactiveDirectoryQuery: Loader;
  monitorTicketsQuery: Loader;
  openTicketsQuery: Loader;
  resolvedTicketsQuery: Loader;
  resolverRequestsQuery: Loader;
}): Loader {
  if (activeSection === "people") {
    if (peopleFilter === "approvals") return resolverRequestsQuery;
    if (peopleFilter === "inactive") return inactiveDirectoryQuery;
    return directoryQuery;
  }
  if (activeSection === "monitor") return monitorTicketsQuery;
  if (activeTab === "assign") return openTicketsQuery;
  return resolvedTicketsQuery;
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
  bottomNavWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
});
