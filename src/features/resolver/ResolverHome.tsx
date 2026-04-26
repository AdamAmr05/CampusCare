import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Ticket, TicketWithHistory } from "../tickets/types";
import { AppScreen } from "../../ui/AppScreen";
import { CampusCareIllustration } from "../../ui/CampusCareIllustration";
import { GlassPressable } from "../../ui/GlassSurface";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { ImageLightbox } from "../tickets/ImageLightbox";
import { TicketDetailsPanel } from "../tickets/TicketDetailsPanel";
import { TicketImagePreview } from "../tickets/TicketImagePreview";
import { NotificationCenter } from "../notifications/NotificationCenter";
import {
  selectTicketImage,
  type TicketImageAsset,
  type TicketImageSource,
} from "../tickets/ticketImageSelection";
import { uploadTicketImage } from "../tickets/uploadTicketImage";
import {
  formatTimestamp,
  getTicketStatusColors,
  getTicketStatusLabel,
} from "../tickets/utils";
import { styles } from "./ResolverHome.styles";

type ResolutionImageSelectionTarget = {
  ticketId: string;
  source: TicketImageSource;
};

type ResolverHomeHeaderProps = {
  email: string;
  errorMessage: string;
  onSignOut: () => void;
  onSwitchToReporter?: () => void;
};

type ResolverListFooterProps = {
  canLoadMore: boolean;
  onLoadMore: () => void;
};

type AssignedTicketActionsProps = {
  isProcessing: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onStartWork: () => void;
};

type InProgressTicketActionsProps = {
  imageSelectionSource: TicketImageSource | null;
  isProcessing: boolean;
  note: string;
  resolutionImage: TicketImageAsset | null;
  onNoteChange: (value: string) => void;
  onOpenImage: (imageUri: string) => void;
  onPickImage: (source: TicketImageSource) => void;
  onRemoveImage: () => void;
  onResolve: () => void;
};

type ResolvedTicketActionsProps = {
  resolutionImageUrl: string | null;
  onOpenImage: (imageUri: string) => void;
};

type ResolverTicketCardProps = {
  imageSelectionSource: TicketImageSource | null;
  isProcessing: boolean;
  progressNote: string;
  resolutionImage: TicketImageAsset | null;
  resolutionNote: string;
  ticket: Ticket;
  onOpenDetails: (ticket: Ticket) => void;
  onOpenLightbox: (imageUri: string) => void;
  onProgressNoteChange: (value: string) => void;
  onResolutionNoteChange: (value: string) => void;
  onSelectResolutionImage: (source: TicketImageSource) => void;
  onRemoveResolutionImage: () => void;
  onResolve: () => void;
  onStartWork: () => void;
};

function createInProgressMutationArgs(
  ticketId: Id<"tickets">,
  note: string,
) {
  return note.length > 0 ? { ticketId, note } : { ticketId };
}

function createMarkResolvedArgs(
  ticketId: Id<"tickets">,
  resolutionNote: string,
  resolutionImageStorageId: Id<"_storage"> | null,
) {
  if (resolutionImageStorageId === null) {
    return {
      ticketId,
      resolutionNote,
    };
  }

  return {
    ticketId,
    resolutionNote,
    resolutionImageStorageId,
  };
}

function ResolverHomeHeader({
  email,
  errorMessage,
  onSignOut,
  onSwitchToReporter,
}: ResolverHomeHeaderProps): React.JSX.Element {
  return (
    <View style={styles.listHeader}>
      <View style={styles.heroCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerMeta}>
            <Text style={styles.eyebrow}>Resolver Workspace</Text>
            <Text style={styles.title}>Assigned Ticket Queue</Text>
            <Text style={styles.subtitle}>
              Move tickets to in-progress, then resolve with a final note for
              manager review.
            </Text>
            <Text style={styles.signedInText}>{email}</Text>
          </View>
          <View style={styles.headerVisualColumn}>
            <CampusCareIllustration
              accessibilityLabel="Resolver progress illustration"
              name="resolverProgress"
              style={styles.heroIllustration}
            />
            {onSwitchToReporter ? (
              <GlassPressable
                onPress={onSwitchToReporter}
                surfaceStyle={styles.workspaceButton}
                pressedSurfaceStyle={styles.controlPressed}
              >
                <Text style={styles.workspaceButtonText}>Go Reporter</Text>
              </GlassPressable>
            ) : null}
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
      <NotificationCenter />
      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

function ResolverEmptyState(): React.JSX.Element {
  return (
    <View style={styles.emptyState}>
      <CampusCareIllustration
        accessibilityLabel="Assignment queue illustration"
        name="managerAssignment"
        style={styles.emptyIllustration}
      />
      <Text style={styles.emptyText}>No tickets are assigned to you yet.</Text>
    </View>
  );
}

function ResolverListFooter({
  canLoadMore,
  onLoadMore,
}: ResolverListFooterProps): React.JSX.Element {
  return (
    <View style={styles.footerSpace}>
      {canLoadMore ? (
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
}

function AssignedTicketActions({
  isProcessing,
  note,
  onNoteChange,
  onStartWork,
}: AssignedTicketActionsProps): React.JSX.Element {
  return (
    <>
      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={styles.input}
        placeholder="Optional progress note"
        placeholderTextColor={theme.colors.textMuted}
      />
      <Pressable
        disabled={isProcessing}
        onPress={onStartWork}
        style={[styles.primaryButton, isProcessing ? styles.buttonDisabled : null]}
      >
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Updating..." : "Set In Progress"}
        </Text>
      </Pressable>
    </>
  );
}

function InProgressTicketActions({
  imageSelectionSource,
  isProcessing,
  note,
  resolutionImage,
  onNoteChange,
  onOpenImage,
  onPickImage,
  onRemoveImage,
  onResolve,
}: InProgressTicketActionsProps): React.JSX.Element {
  const imageActionDisabled = isProcessing || imageSelectionSource !== null;

  return (
    <>
      <TextInput
        value={note}
        onChangeText={onNoteChange}
        style={[styles.input, styles.multilineInput]}
        placeholder="Resolution note (required)"
        placeholderTextColor={theme.colors.textMuted}
        multiline
      />
      <View style={styles.imageActionRow}>
        <GlassPressable
          onPress={() => onPickImage("camera")}
          disabled={imageActionDisabled}
          containerStyle={styles.imageActionButton}
          surfaceStyle={[
            styles.secondaryButton,
            styles.imageActionButton,
          ]}
          pressedSurfaceStyle={styles.controlPressed}
          disabledSurfaceStyle={styles.controlDisabled}
        >
          <Text style={styles.secondaryButtonText}>
            {imageSelectionSource === "camera" ? "Opening..." : "Take Photo"}
          </Text>
        </GlassPressable>
        <GlassPressable
          onPress={() => onPickImage("library")}
          disabled={imageActionDisabled}
          containerStyle={styles.imageActionButton}
          surfaceStyle={[
            styles.secondaryButton,
            styles.imageActionButton,
          ]}
          pressedSurfaceStyle={styles.controlPressed}
          disabledSurfaceStyle={styles.controlDisabled}
        >
          <Text style={styles.secondaryButtonText}>
            {imageSelectionSource === "library" ? "Opening..." : "Choose Library"}
          </Text>
        </GlassPressable>
      </View>
      {resolutionImage ? (
        <>
          <TicketImagePreview
            uri={resolutionImage.uri}
            style={styles.resolutionPreviewImage}
            onPress={() => onOpenImage(resolutionImage.uri)}
          />
          <GlassPressable
            onPress={onRemoveImage}
            disabled={isProcessing}
            surfaceStyle={styles.secondaryButton}
            pressedSurfaceStyle={styles.controlPressed}
            disabledSurfaceStyle={styles.controlDisabled}
          >
            <Text style={styles.secondaryButtonText}>
              Remove Attached Resolution Photo
            </Text>
          </GlassPressable>
        </>
      ) : null}
      <Pressable
        disabled={isProcessing}
        onPress={onResolve}
        style={[styles.primaryButton, isProcessing ? styles.buttonDisabled : null]}
      >
        <Text style={styles.primaryButtonText}>
          {isProcessing ? "Submitting..." : "Mark Resolved"}
        </Text>
      </Pressable>
    </>
  );
}

function ResolvedTicketActions({
  resolutionImageUrl,
  onOpenImage,
}: ResolvedTicketActionsProps): React.JSX.Element {
  return (
    <>
      {resolutionImageUrl ? (
        <TicketImagePreview
          uri={resolutionImageUrl}
          style={styles.resolutionPreviewImage}
          onPress={() => onOpenImage(resolutionImageUrl)}
        />
      ) : null}
      <Text style={styles.awaitingText}>Awaiting manager closure.</Text>
    </>
  );
}

function ResolverTicketCard({
  imageSelectionSource,
  isProcessing,
  progressNote,
  resolutionImage,
  resolutionNote,
  ticket,
  onOpenDetails,
  onOpenLightbox,
  onProgressNoteChange,
  onResolutionNoteChange,
  onSelectResolutionImage,
  onRemoveResolutionImage,
  onResolve,
  onStartWork,
}: ResolverTicketCardProps): React.JSX.Element {
  const statusColors = getTicketStatusColors(ticket.status);

  let actions: React.JSX.Element | null = null;

  if (ticket.status === "assigned") {
    actions = (
      <AssignedTicketActions
        isProcessing={isProcessing}
        note={progressNote}
        onNoteChange={onProgressNoteChange}
        onStartWork={onStartWork}
      />
    );
  } else if (ticket.status === "in_progress") {
    actions = (
      <InProgressTicketActions
        imageSelectionSource={imageSelectionSource}
        isProcessing={isProcessing}
        note={resolutionNote}
        resolutionImage={resolutionImage}
        onNoteChange={onResolutionNoteChange}
        onOpenImage={onOpenLightbox}
        onPickImage={onSelectResolutionImage}
        onRemoveImage={onRemoveResolutionImage}
        onResolve={onResolve}
      />
    );
  } else if (ticket.status === "resolved") {
    actions = (
      <ResolvedTicketActions
        resolutionImageUrl={ticket.resolutionImageUrl}
        onOpenImage={onOpenLightbox}
      />
    );
  }

  return (
    <View style={styles.ticketCard}>
      <Pressable
        onPress={() => onOpenDetails(ticket)}
        style={styles.detailsPreviewArea}
      >
        <View style={styles.ticketHeaderRow}>
          <Text style={styles.ticketTitle}>{ticket.category}</Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColors.background },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
              {getTicketStatusLabel(ticket.status)}
            </Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <Ionicons
            name="location-outline"
            size={14}
            color={theme.colors.textMuted}
          />
          <Text style={styles.ticketMeta}>{ticket.location}</Text>
        </View>
        {ticket.imageUrl ? (
          <TicketImagePreview
            uri={ticket.imageUrl}
            style={styles.ticketImage}
            onPress={(event) => {
              event.stopPropagation();
              onOpenLightbox(ticket.imageUrl!);
            }}
          />
        ) : null}
        <Text style={styles.ticketDescription}>{ticket.description}</Text>
        <Text style={styles.ticketMeta}>
          Updated {formatTimestamp(ticket.updatedAt)}
        </Text>
      </Pressable>

      {actions}
    </View>
  );
}

export function ResolverHome(props: {
  email: string;
  onSignOut: () => void;
  onSwitchToReporter?: () => void;
}): React.JSX.Element {
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

  const [progressNotes, setProgressNotes] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>(
    {},
  );
  const [resolutionImages, setResolutionImages] = useState<
    Record<string, TicketImageAsset | null>
  >({});
  const [imageSelectionTarget, setImageSelectionTarget] =
    useState<ResolutionImageSelectionTarget | null>(null);
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
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

  const onSelectResolutionImage = useCallback(
    async (args: ResolutionImageSelectionTarget) => {
      setErrorMessage("");
      setImageSelectionTarget(args);

      try {
        const selection = await selectTicketImage(args.source);

        if (selection.kind === "cancelled") {
          return;
        }

        if (selection.kind === "error") {
          setErrorMessage(selection.message);
          return;
        }

        setResolutionImages((previous) => ({
          ...previous,
          [args.ticketId]: selection.asset,
        }));
      } finally {
        setImageSelectionTarget(null);
      }
    },
    [],
  );

  const onStartWork = useCallback(
    async (ticket: Ticket) => {
      setProcessingTicketId(ticket._id);
      setErrorMessage("");

      try {
        const note = (progressNotes[ticket._id] ?? "").trim();
        await setInProgress(createInProgressMutationArgs(ticket._id, note));
      } catch (error) {
        setErrorMessage(formatError(error));
      } finally {
        setProcessingTicketId(null);
      }
    },
    [progressNotes, setInProgress],
  );

  const onResolve = useCallback(
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
        setResolutionNotes((previous) => ({ ...previous, [ticket._id]: "" }));
        setResolutionImages((previous) => ({ ...previous, [ticket._id]: null }));
      } catch (error) {
        if (uploadedStorageId) {
          try {
            await deleteUnusedUpload({ storageId: uploadedStorageId });
          } catch {
            // Keep the user-facing error focused on the original failure.
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
    ],
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

  const renderTicket = useCallback(
    ({ item }: { item: Ticket }) => {
      const imageSelectionSource =
        imageSelectionTarget?.ticketId === item._id
          ? imageSelectionTarget.source
          : null;

      return (
        <ResolverTicketCard
          imageSelectionSource={imageSelectionSource}
          isProcessing={processingTicketId === item._id}
          progressNote={progressNotes[item._id] ?? ""}
          resolutionImage={resolutionImages[item._id] ?? null}
          resolutionNote={resolutionNotes[item._id] ?? ""}
          ticket={item}
          onOpenDetails={openTicketDetails}
          onOpenLightbox={openLightbox}
          onProgressNoteChange={(value) => {
            setProgressNotes((previous) => ({ ...previous, [item._id]: value }));
          }}
          onResolutionNoteChange={(value) => {
            setResolutionNotes((previous) => ({
              ...previous,
              [item._id]: value,
            }));
          }}
          onSelectResolutionImage={(source) => {
            void onSelectResolutionImage({ ticketId: item._id, source });
          }}
          onRemoveResolutionImage={() => {
            setResolutionImages((previous) => ({ ...previous, [item._id]: null }));
          }}
          onResolve={() => {
            void onResolve(item);
          }}
          onStartWork={() => {
            void onStartWork(item);
          }}
        />
      );
    },
    [
      imageSelectionTarget,
      onResolve,
      onSelectResolutionImage,
      onStartWork,
      openLightbox,
      openTicketDetails,
      processingTicketId,
      progressNotes,
      resolutionImages,
      resolutionNotes,
    ],
  );

  const keyExtractor = useCallback((item: Ticket) => item._id, []);

  return (
    <AppScreen>
      <FlatList
        data={tickets}
        keyExtractor={keyExtractor}
        renderItem={renderTicket}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(24, insets.bottom + 16) },
        ]}
        ListHeaderComponent={
          <ResolverHomeHeader
            email={props.email}
            errorMessage={errorMessage}
            onSignOut={props.onSignOut}
            onSwitchToReporter={props.onSwitchToReporter}
          />
        }
        ListEmptyComponent={<ResolverEmptyState />}
        ListFooterComponent={
          <ResolverListFooter
            canLoadMore={status === "CanLoadMore"}
            onLoadMore={() => loadMore(10)}
          />
        }
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
