import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { Ticket } from "../tickets/types";
import { AppScreen } from "../../ui/AppScreen";
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
import { formatTimestamp, getTicketStatusColors, getTicketStatusLabel } from "../tickets/utils";
import { styles } from "./ResolverHome.styles";

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
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [resolutionImages, setResolutionImages] = useState<Record<string, TicketImageAsset | null>>({});
  const [imageSelectionTarget, setImageSelectionTarget] = useState<{
    ticketId: string;
    source: TicketImageSource;
  } | null>(null);
  const [processingTicketId, setProcessingTicketId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);
  const [selectedTicketPreview, setSelectedTicketPreview] = useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const onSelectResolutionImage = useCallback(async (args: {
    ticketId: string;
    source: TicketImageSource;
  }) => {
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
  }, []);

  const onStartWork = useCallback(
    async (ticket: Ticket) => {
      setProcessingTicketId(ticket._id);
      setErrorMessage("");
      try {
        const note = (progressNotes[ticket._id] ?? "").trim();
        if (note.length > 0) {
          await setInProgress({ ticketId: ticket._id, note });
        } else {
          await setInProgress({ ticketId: ticket._id });
        }
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

      setProcessingTicketId(ticket._id);
      setErrorMessage("");
      let uploadedStorageId: Id<"_storage"> | null = null;
      try {
        if (resolutionImage) {
          uploadedStorageId = await uploadTicketImage({
            image: resolutionImage,
            generateUploadUrl,
          });
        }

        await markResolved({
          ticketId: ticket._id,
          resolutionNote,
          resolutionImageStorageId: uploadedStorageId ?? undefined,
        });
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
    [deleteUnusedUpload, generateUploadUrl, markResolved, resolutionImages, resolutionNotes],
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

  const renderTicket = useCallback(
    ({ item }: { item: Ticket }) => {
      const statusColors = getTicketStatusColors(item.status);
      const isProcessing = processingTicketId === item._id;
      const progressNoteValue = progressNotes[item._id] ?? "";
      const resolutionNoteValue = resolutionNotes[item._id] ?? "";
      const resolutionImage = resolutionImages[item._id] ?? null;
      const isImageSelectionInFlight = imageSelectionTarget?.ticketId === item._id;
      const imageActionDisabled = isProcessing || isImageSelectionInFlight;

      return (
        <View style={styles.ticketCard}>
          <Pressable onPress={() => openTicketDetails(item)} style={styles.detailsPreviewArea}>
            <View style={styles.ticketHeaderRow}>
              <Text style={styles.ticketTitle}>{item.category}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors.background }]}>
                <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                  {getTicketStatusLabel(item.status)}
                </Text>
              </View>
            </View>

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
              <Text style={styles.ticketMeta}>{item.location}</Text>
            </View>
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
            <Text style={styles.ticketDescription}>{item.description}</Text>
            <Text style={styles.ticketMeta}>Updated {formatTimestamp(item.updatedAt)}</Text>
          </Pressable>

          {item.status === "assigned" ? (
            <>
              <TextInput
                value={progressNoteValue}
                onChangeText={(value) =>
                  setProgressNotes((previous) => ({ ...previous, [item._id]: value }))
                }
                style={styles.input}
                placeholder="Optional progress note"
                placeholderTextColor={theme.colors.textMuted}
              />
              <Pressable
                disabled={isProcessing}
                onPress={() => void onStartWork(item)}
                style={[styles.primaryButton, isProcessing ? styles.buttonDisabled : null]}
              >
                <Text style={styles.primaryButtonText}>
                  {isProcessing ? "Updating..." : "Set In Progress"}
                </Text>
              </Pressable>
            </>
          ) : null}

          {item.status === "in_progress" ? (
            <>
              <TextInput
                value={resolutionNoteValue}
                onChangeText={(value) =>
                  setResolutionNotes((previous) => ({ ...previous, [item._id]: value }))
                }
                style={[styles.input, styles.multilineInput]}
                placeholder="Resolution note (required)"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
              <View style={styles.imageActionRow}>
                <Pressable
                  onPress={() => void onSelectResolutionImage({ ticketId: item._id, source: "camera" })}
                  disabled={imageActionDisabled}
                  style={[
                    styles.secondaryButton,
                    styles.imageActionButton,
                    imageActionDisabled ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {imageSelectionTarget?.ticketId === item._id &&
                      imageSelectionTarget.source === "camera"
                      ? "Opening..."
                      : "Take Photo"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void onSelectResolutionImage({ ticketId: item._id, source: "library" })}
                  disabled={imageActionDisabled}
                  style={[
                    styles.secondaryButton,
                    styles.imageActionButton,
                    imageActionDisabled ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {imageSelectionTarget?.ticketId === item._id &&
                      imageSelectionTarget.source === "library"
                      ? "Opening..."
                      : "Choose Library"}
                  </Text>
                </Pressable>
              </View>
              {resolutionImage ? (
                <>
                  <TicketImagePreview
                    uri={resolutionImage.uri}
                    style={styles.resolutionPreviewImage}
                    onPress={() => setLightboxImageUri(resolutionImage.uri)}
                  />
                  <Pressable
                    onPress={() =>
                      setResolutionImages((previous) => ({
                        ...previous,
                        [item._id]: null,
                      }))
                    }
                    disabled={isProcessing}
                    style={[styles.secondaryButton, isProcessing ? styles.buttonDisabled : null]}
                  >
                    <Text style={styles.secondaryButtonText}>Remove Attached Resolution Photo</Text>
                  </Pressable>
                </>
              ) : null}
              <Pressable
                disabled={isProcessing}
                onPress={() => void onResolve(item)}
                style={[styles.primaryButton, isProcessing ? styles.buttonDisabled : null]}
              >
                <Text style={styles.primaryButtonText}>
                  {isProcessing ? "Submitting..." : "Mark Resolved"}
                </Text>
              </Pressable>
            </>
          ) : null}

          {item.status === "resolved" ? (
            <>
              {item.resolutionImageUrl ? (
                <TicketImagePreview
                  uri={item.resolutionImageUrl}
                  style={styles.resolutionPreviewImage}
                  onPress={() => setLightboxImageUri(item.resolutionImageUrl)}
                />
              ) : null}
              <Text style={styles.awaitingText}>Awaiting manager closure.</Text>
            </>
          ) : null}
        </View>
      );
    },
    [
      imageSelectionTarget,
      onResolve,
      onSelectResolutionImage,
      onStartWork,
      openTicketDetails,
      processingTicketId,
      progressNotes,
      resolutionImages,
      resolutionNotes,
    ],
  );

  return (
    <AppScreen>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        renderItem={renderTicket}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.heroCard}>
              <View style={styles.headerRow}>
                <View style={styles.headerMeta}>
                  <Text style={styles.eyebrow}>Resolver Workspace</Text>
                  <Text style={styles.title}>Assigned Ticket Queue</Text>
                  <Text style={styles.subtitle}>
                    Move tickets to in-progress, then resolve with a final note for manager review.
                  </Text>
                  <Text style={styles.signedInText}>{props.email}</Text>
                </View>
                <View style={styles.headerActions}>
                  {props.onSwitchToReporter ? (
                    <Pressable onPress={props.onSwitchToReporter} style={styles.workspaceButton}>
                      <Text style={styles.workspaceButtonText}>Go Reporter</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={props.onSignOut} style={styles.signOutButton}>
                    <Text style={styles.signOutText}>Sign out</Text>
                  </Pressable>
                </View>
              </View>
            </View>
            <NotificationCenter />
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No tickets are assigned to you yet.</Text>}
        ListFooterComponent={
          <View style={styles.footerSpace}>
            {status === "CanLoadMore" ? (
              <Pressable onPress={() => loadMore(10)} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Load More</Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
      <TicketDetailsPanel
        visible={isDetailsVisible}
        ticket={selectedTicketPreview}
        historyEntries={null}
        historyUnavailableText="Status history is not shown in Resolver lists yet."
        onClose={closeTicketDetails}
      />
      <ImageLightbox imageUri={lightboxImageUri} onClose={() => setLightboxImageUri(null)} />
    </AppScreen>
  );
}
