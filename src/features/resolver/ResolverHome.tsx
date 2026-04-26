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
  WorkspaceLoadMoreFooter,
  WorkspaceTicketCard,
} from "../../ui/workspace";
import { formatError } from "../../utils/formatError";
import { ImageLightbox } from "../tickets/ImageLightbox";
import { TicketDetailsPanel } from "../tickets/TicketDetailsPanel";
import type { Ticket, TicketWithHistory } from "../tickets/types";
import {
  selectTicketImage,
  type TicketImageAsset,
  type TicketImageSource,
} from "../tickets/ticketImageSelection";
import { uploadTicketImage } from "../tickets/uploadTicketImage";
import { ResolverActionHint } from "./components/ResolverActionHint";
import { ResolverActionSheet } from "./components/ResolverActionSheet";

type Props = {
  email: string;
  onSignOut: () => void;
  onSwitchToReporter?: () => void;
};

type ImageSelectionTarget = {
  ticketId: string;
  source: TicketImageSource;
};

function createInProgressArgs(ticketId: Id<"tickets">, note: string) {
  return note.length > 0 ? { ticketId, note } : { ticketId };
}

function createMarkResolvedArgs(
  ticketId: Id<"tickets">,
  resolutionNote: string,
  resolutionImageStorageId: Id<"_storage"> | null,
) {
  if (resolutionImageStorageId === null) {
    return { ticketId, resolutionNote };
  }
  return { ticketId, resolutionNote, resolutionImageStorageId };
}

function buildSwitchTo(
  onSwitchToReporter: (() => void) | undefined,
): { label: string; onPress: () => void } | undefined {
  if (!onSwitchToReporter) return undefined;
  return {
    label: "Switch to Reporter (dev)",
    onPress: onSwitchToReporter,
  };
}

export function ResolverHome({
  email,
  onSignOut,
  onSwitchToReporter,
}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const generateUploadUrl = useMutation(api.ticketsReporter.generateUploadUrl);
  const deleteUnusedUpload = useMutation(api.ticketsReporter.deleteUnusedUpload);
  const setInProgress = useMutation(api.ticketsResolver.setInProgress);
  const markResolved = useMutation(api.ticketsResolver.markResolved);

  const { results, status, loadMore } = usePaginatedQuery(
    api.ticketsResolver.listAssignedToMe,
    {},
    { initialNumItems: 12 },
  );
  const tickets = useMemo(() => results as Ticket[], [results]);

  const state = useResolverState();
  useSyncActionTicketWithList(tickets, state.actionTicket, state.setActionTicket);

  const navigation = useResolverNavigation({
    isDetailsVisible: state.isDetailsVisible,
    setActionTicket: state.setActionTicket,
    setDetailsTicketId: state.setDetailsTicketId,
    setDetailsTicketPreview: state.setDetailsTicketPreview,
    setErrorMessage: state.setErrorMessage,
    setIsActionSheetVisible: state.setIsActionSheetVisible,
    setIsDetailsVisible: state.setIsDetailsVisible,
    setLightboxImageUri: state.setLightboxImageUri,
  });

  const { onSelectResolutionImage, onStartWork } = useResolverMutations({
    progressNotes: state.progressNotes,
    setErrorMessage: state.setErrorMessage,
    setImageSelectionTarget: state.setImageSelectionTarget,
    setInProgress,
    setProcessingTicketId: state.setProcessingTicketId,
    setResolutionImages: state.setResolutionImages,
  });

  const onResolve = useResolverResolveAction({
    deleteUnusedUpload,
    generateUploadUrl,
    markResolved,
    resolutionImages: state.resolutionImages,
    resolutionNotes: state.resolutionNotes,
    setErrorMessage: state.setErrorMessage,
    setProcessingTicketId: state.setProcessingTicketId,
    setResolutionImages: state.setResolutionImages,
    setResolutionNotes: state.setResolutionNotes,
  });

  const detailsView = useResolverTicketDetails(
    state.isDetailsVisible,
    state.detailsTicketId,
    state.detailsTicketPreview,
  );

  const activeSlice = useActiveTicketSlice({
    actionTicket: state.actionTicket,
    imageSelectionTarget: state.imageSelectionTarget,
    processingTicketId: state.processingTicketId,
  });

  const renderTicket = useCallback(
    ({ item }: { item: Ticket }) => (
      <WorkspaceTicketCard
        ticket={item}
        onOpenDetails={navigation.onCardPress}
        onOpenImage={navigation.openLightbox}
        trailing={<ResolverActionHint ticket={item} />}
      />
    ),
    [navigation.onCardPress, navigation.openLightbox],
  );

  const keyExtractor = useCallback((item: Ticket) => item._id, []);

  return (
    <AppScreen>
      <FlatList
        data={tickets}
        keyExtractor={keyExtractor}
        renderItem={renderTicket}
        ListHeaderComponent={
          <ResolverListHeader
            email={email}
            onSignOut={onSignOut}
            switchTo={buildSwitchTo(onSwitchToReporter)}
          />
        }
        ListEmptyComponent={
          <WorkspaceEmptyState
            illustration="managerAssignment"
            title="Queue is clear"
            body="No tickets are assigned to you yet. Hang tight."
          />
        }
        ListFooterComponent={
          <WorkspaceLoadMoreFooter
            canLoadMore={status === "CanLoadMore"}
            onLoadMore={() => loadMore(10)}
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

      <ResolverActionSheetContainer
        activeSlice={activeSlice}
        errorMessage={state.errorMessage}
        isActionSheetVisible={state.isActionSheetVisible}
        progressNotes={state.progressNotes}
        resolutionImages={state.resolutionImages}
        resolutionNotes={state.resolutionNotes}
        setProgressNotes={state.setProgressNotes}
        setResolutionImages={state.setResolutionImages}
        setResolutionNotes={state.setResolutionNotes}
        closeActionSheet={navigation.closeActionSheet}
        openLightbox={navigation.openLightbox}
        onResolve={(ticket) => void onResolve(ticket)}
        onSelectResolutionImage={(target) =>
          void onSelectResolutionImage(target)
        }
        onStartWork={(ticket) => void onStartWork(ticket)}
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

function ResolverListHeader({
  email,
  onSignOut,
  switchTo,
}: {
  email: string;
  onSignOut: () => void;
  switchTo: { label: string; onPress: () => void } | undefined;
}): React.JSX.Element {
  return (
    <View style={listHeaderStyles.container}>
      <WorkspaceHero
        email={email}
        role="Resolver"
        illustration="resolverProgress"
        onSignOut={onSignOut}
        switchTo={switchTo}
      />
      <Text style={listHeaderStyles.sectionTitle}>Assigned to me</Text>
    </View>
  );
}

type ActiveTicketSlice = {
  ticket: Ticket | null;
  ticketId: string | null;
  isProcessing: boolean;
  imageSelectionSource: TicketImageSource | null;
};

function useActiveTicketSlice({
  actionTicket,
  imageSelectionTarget,
  processingTicketId,
}: {
  actionTicket: Ticket | null;
  imageSelectionTarget: ImageSelectionTarget | null;
  processingTicketId: string | null;
}): ActiveTicketSlice {
  return useMemo(() => {
    const ticketId = actionTicket?._id ?? null;
    const isProcessing =
      ticketId !== null && processingTicketId === ticketId;
    const imageSelectionSource =
      ticketId !== null && imageSelectionTarget?.ticketId === ticketId
        ? imageSelectionTarget.source
        : null;
    return {
      ticket: actionTicket,
      ticketId,
      isProcessing,
      imageSelectionSource,
    };
  }, [actionTicket, imageSelectionTarget, processingTicketId]);
}

type DetailsView = {
  ticket: Ticket | null;
  history: TicketWithHistory["history"] | null | undefined;
};

function useResolverTicketDetails(
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

function useSyncActionTicketWithList(
  tickets: Ticket[],
  actionTicket: Ticket | null,
  setActionTicket: React.Dispatch<React.SetStateAction<Ticket | null>>,
): void {
  useEffect(() => {
    if (!actionTicket) return;
    const refreshed = tickets.find((t) => t._id === actionTicket._id);
    if (refreshed && refreshed.status !== actionTicket.status) {
      setActionTicket(refreshed);
    }
  }, [actionTicket, setActionTicket, tickets]);
}

type ResolverActionSheetContainerProps = {
  activeSlice: ActiveTicketSlice;
  errorMessage: string;
  isActionSheetVisible: boolean;
  progressNotes: Record<string, string>;
  resolutionImages: Record<string, TicketImageAsset | null>;
  resolutionNotes: Record<string, string>;
  setProgressNotes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  setResolutionImages: React.Dispatch<
    React.SetStateAction<Record<string, TicketImageAsset | null>>
  >;
  setResolutionNotes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  closeActionSheet: () => void;
  openLightbox: (uri: string) => void;
  onResolve: (ticket: Ticket) => void;
  onSelectResolutionImage: (target: ImageSelectionTarget) => void;
  onStartWork: (ticket: Ticket) => void;
};

function ResolverActionSheetContainer({
  activeSlice,
  errorMessage,
  isActionSheetVisible,
  progressNotes,
  resolutionImages,
  resolutionNotes,
  setProgressNotes,
  setResolutionImages,
  setResolutionNotes,
  closeActionSheet,
  openLightbox,
  onResolve,
  onSelectResolutionImage,
  onStartWork,
}: ResolverActionSheetContainerProps): React.JSX.Element {
  const { ticket: activeTicket, ticketId: activeTicketId } = activeSlice;

  const updateProgressNote = useCallback(
    (value: string) => {
      if (!activeTicketId) return;
      setProgressNotes((prev) => ({ ...prev, [activeTicketId]: value }));
    },
    [activeTicketId, setProgressNotes],
  );

  const updateResolutionNote = useCallback(
    (value: string) => {
      if (!activeTicketId) return;
      setResolutionNotes((prev) => ({ ...prev, [activeTicketId]: value }));
    },
    [activeTicketId, setResolutionNotes],
  );

  const handleSelectResolutionImage = useCallback(
    (source: TicketImageSource) => {
      if (!activeTicketId) return;
      onSelectResolutionImage({ ticketId: activeTicketId, source });
    },
    [activeTicketId, onSelectResolutionImage],
  );

  const handleRemoveResolutionImage = useCallback(() => {
    if (!activeTicketId) return;
    setResolutionImages((prev) => ({ ...prev, [activeTicketId]: null }));
  }, [activeTicketId, setResolutionImages]);

  const handleStartWork = useCallback(() => {
    if (!activeTicket) return;
    onStartWork(activeTicket);
  }, [activeTicket, onStartWork]);

  const handleResolve = useCallback(() => {
    if (!activeTicket) return;
    onResolve(activeTicket);
  }, [activeTicket, onResolve]);

  const progressNote = activeTicketId
    ? progressNotes[activeTicketId] ?? ""
    : "";
  const resolutionNote = activeTicketId
    ? resolutionNotes[activeTicketId] ?? ""
    : "";
  const resolutionImage = activeTicketId
    ? resolutionImages[activeTicketId] ?? null
    : null;

  return (
    <ResolverActionSheet
      ticket={activeTicket}
      visible={isActionSheetVisible}
      isProcessing={activeSlice.isProcessing}
      progressNote={progressNote}
      resolutionNote={resolutionNote}
      resolutionImage={resolutionImage}
      imageSelectionSource={activeSlice.imageSelectionSource}
      errorMessage={errorMessage}
      onClose={closeActionSheet}
      onProgressNoteChange={updateProgressNote}
      onResolutionNoteChange={updateResolutionNote}
      onSelectResolutionImage={handleSelectResolutionImage}
      onRemoveResolutionImage={handleRemoveResolutionImage}
      onOpenImage={openLightbox}
      onStartWork={handleStartWork}
      onResolve={handleResolve}
    />
  );
}

type ResolveActionDeps = {
  deleteUnusedUpload: ReturnType<
    typeof useMutation<typeof api.ticketsReporter.deleteUnusedUpload>
  >;
  generateUploadUrl: ReturnType<
    typeof useMutation<typeof api.ticketsReporter.generateUploadUrl>
  >;
  markResolved: ReturnType<typeof useMutation<typeof api.ticketsResolver.markResolved>>;
  resolutionImages: Record<string, TicketImageAsset | null>;
  resolutionNotes: Record<string, string>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setProcessingTicketId: React.Dispatch<React.SetStateAction<string | null>>;
  setResolutionImages: React.Dispatch<
    React.SetStateAction<Record<string, TicketImageAsset | null>>
  >;
  setResolutionNotes: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
};

function useResolverResolveAction(deps: ResolveActionDeps) {
  const {
    deleteUnusedUpload,
    generateUploadUrl,
    markResolved,
    resolutionImages,
    resolutionNotes,
    setErrorMessage,
    setProcessingTicketId,
    setResolutionImages,
    setResolutionNotes,
  } = deps;

  return useCallback(
    async (ticket: Ticket) => {
      const resolutionNote = (resolutionNotes[ticket._id] ?? "").trim();
      if (!resolutionNote) {
        setErrorMessage("Resolution note is required.");
        return;
      }
      const resolutionImage = resolutionImages[ticket._id] ?? null;
      let uploadedStorageId: Id<"_storage"> | null = null;

      setProcessingTicketId(ticket._id);
      setErrorMessage("");
      try {
        if (resolutionImage) {
          uploadedStorageId = await uploadTicketImage({
            image: resolutionImage,
            generateUploadUrl,
          });
        }
        await markResolved(
          createMarkResolvedArgs(
            ticket._id,
            resolutionNote,
            uploadedStorageId,
          ),
        );
        setResolutionNotes((prev) => ({ ...prev, [ticket._id]: "" }));
        setResolutionImages((prev) => ({ ...prev, [ticket._id]: null }));
      } catch (error) {
        if (uploadedStorageId) {
          try {
            await deleteUnusedUpload({ storageId: uploadedStorageId });
          } catch {
            // Keep the user-facing error focused.
          }
        }
        setErrorMessage(formatError(error));
      } finally {
        setProcessingTicketId(null);
      }
    },
    [
      deleteUnusedUpload,
      generateUploadUrl,
      markResolved,
      resolutionImages,
      resolutionNotes,
      setErrorMessage,
      setProcessingTicketId,
      setResolutionImages,
      setResolutionNotes,
    ],
  );
}

type ResolverMutationsDeps = {
  progressNotes: Record<string, string>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setImageSelectionTarget: React.Dispatch<
    React.SetStateAction<ImageSelectionTarget | null>
  >;
  setInProgress: ReturnType<typeof useMutation<typeof api.ticketsResolver.setInProgress>>;
  setProcessingTicketId: React.Dispatch<React.SetStateAction<string | null>>;
  setResolutionImages: React.Dispatch<
    React.SetStateAction<Record<string, TicketImageAsset | null>>
  >;
};

function useResolverMutations(deps: ResolverMutationsDeps) {
  const {
    progressNotes,
    setErrorMessage,
    setImageSelectionTarget,
    setInProgress,
    setProcessingTicketId,
    setResolutionImages,
  } = deps;

  const onSelectResolutionImage = useCallback(
    async (target: ImageSelectionTarget) => {
      setErrorMessage("");
      setImageSelectionTarget(target);
      try {
        const selection = await selectTicketImage(target.source);
        if (selection.kind === "cancelled") return;
        if (selection.kind === "error") {
          setErrorMessage(selection.message);
          return;
        }
        setResolutionImages((prev) => ({
          ...prev,
          [target.ticketId]: selection.asset,
        }));
      } finally {
        setImageSelectionTarget(null);
      }
    },
    [setErrorMessage, setImageSelectionTarget, setResolutionImages],
  );

  const onStartWork = useCallback(
    async (ticket: Ticket) => {
      setProcessingTicketId(ticket._id);
      setErrorMessage("");
      try {
        const note = (progressNotes[ticket._id] ?? "").trim();
        await setInProgress(createInProgressArgs(ticket._id, note));
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingTicketId(null);
      }
    },
    [progressNotes, setErrorMessage, setInProgress, setProcessingTicketId],
  );

  return { onSelectResolutionImage, onStartWork };
}

type ResolverNavigationDeps = {
  isDetailsVisible: boolean;
  setActionTicket: React.Dispatch<React.SetStateAction<Ticket | null>>;
  setDetailsTicketId: React.Dispatch<React.SetStateAction<Id<"tickets"> | null>>;
  setDetailsTicketPreview: React.Dispatch<React.SetStateAction<Ticket | null>>;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  setIsActionSheetVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setIsDetailsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  setLightboxImageUri: React.Dispatch<React.SetStateAction<string | null>>;
};

function useResolverNavigation(deps: ResolverNavigationDeps) {
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
      if (ticket.status === "closed") {
        openDetails(ticket);
      } else {
        openActionSheet(ticket);
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

function useResolverState() {
  const [progressNotes, setProgressNotes] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<
    Record<string, string>
  >({});
  const [resolutionImages, setResolutionImages] = useState<
    Record<string, TicketImageAsset | null>
  >({});
  const [imageSelectionTarget, setImageSelectionTarget] =
    useState<ImageSelectionTarget | null>(null);
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);
  const [actionTicket, setActionTicket] = useState<Ticket | null>(null);
  const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);
  const [detailsTicketId, setDetailsTicketId] =
    useState<Id<"tickets"> | null>(null);
  const [detailsTicketPreview, setDetailsTicketPreview] =
    useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  return {
    progressNotes,
    setProgressNotes,
    resolutionNotes,
    setResolutionNotes,
    resolutionImages,
    setResolutionImages,
    imageSelectionTarget,
    setImageSelectionTarget,
    processingTicketId,
    setProcessingTicketId,
    errorMessage,
    setErrorMessage,
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
  listContent: {
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 2,
  },
});
