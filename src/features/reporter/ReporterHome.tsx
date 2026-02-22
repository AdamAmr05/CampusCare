import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { ImageLightbox } from "../tickets/ImageLightbox";
import type { Ticket, TicketWithHistory } from "../tickets/types";
import { formatTimestamp, getTicketStatusColors, getTicketStatusLabel, truncateText } from "../tickets/utils";
import {
  selectTicketImage,
  type TicketImageAsset,
  type TicketImageSource,
} from "../tickets/ticketImageSelection";
import { uploadTicketImage } from "../tickets/uploadTicketImage";
import { styles } from "./ReporterHome.styles";

export function ReporterHome(props: {
  email: string;
  onSignOut: () => void;
  onSwitchToResolver?: () => void;
}): React.JSX.Element {
  const createTicket = useMutation(api.ticketsReporter.create);
  const generateUploadUrl = useMutation(api.ticketsReporter.generateUploadUrl);
  const deleteUnusedUpload = useMutation(api.ticketsReporter.deleteUnusedUpload);

  const { results, status, loadMore } = usePaginatedQuery(
    api.ticketsReporter.listMine,
    {},
    { initialNumItems: 10 },
  );

  const tickets = useMemo(() => results as Ticket[], [results]);

  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<TicketImageAsset | null>(null);
  const [imageSelectionSource, setImageSelectionSource] = useState<TicketImageSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);

  const [selectedTicketId, setSelectedTicketId] = useState<Id<"tickets"> | null>(null);

  const selectedTicket = useQuery(
    api.ticketsReporter.getMineById,
    selectedTicketId ? { ticketId: selectedTicketId } : "skip",
  ) as TicketWithHistory | null | undefined;
  const imageSelectionDisabled = imageSelectionSource !== null || submitting;

  const onSelectImageSource = useCallback(async (source: TicketImageSource) => {
    setErrorMessage("");
    setImageSelectionSource(source);
    try {
      const selection = await selectTicketImage(source);
      if (selection.kind === "cancelled") {
        return;
      }
      if (selection.kind === "error") {
        setErrorMessage(selection.message);
        return;
      }

      setSelectedImage(selection.asset);
    } finally {
      setImageSelectionSource(null);
    }
  }, []);

  const submitTicket = useCallback(async () => {
    const normalizedCategory = category.trim();
    const normalizedLocation = location.trim();
    const normalizedDescription = description.trim();

    if (!normalizedCategory || !normalizedLocation || !normalizedDescription) {
      setErrorMessage("Category, location, and description are required.");
      return;
    }

    if (!selectedImage) {
      setErrorMessage("A photo is required before submitting the ticket.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    let uploadedStorageId: Id<"_storage"> | null = null;

    try {
      uploadedStorageId = await uploadTicketImage({
        image: selectedImage,
        generateUploadUrl,
      });

      await createTicket({
        category: normalizedCategory,
        location: normalizedLocation,
        description: normalizedDescription,
        imageStorageId: uploadedStorageId,
      });

      setCategory("");
      setLocation("");
      setDescription("");
      setSelectedImage(null);
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
      setSubmitting(false);
    }
  }, [
    category,
    createTicket,
    description,
    deleteUnusedUpload,
    generateUploadUrl,
    location,
    selectedImage,
  ]);

  const renderTicket = useCallback(
    ({ item }: { item: Ticket }) => {
      const statusColors = getTicketStatusColors(item.status);

      return (
        <Pressable style={styles.ticketCard} onPress={() => setSelectedTicketId(item._id)}>
          <View style={styles.ticketHeaderRow}>
            <Text style={styles.ticketTitle}>{item.category}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColors.background }]}>
              <Text style={[styles.statusBadgeText, { color: statusColors.text }]}>
                {getTicketStatusLabel(item.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.ticketMeta}>{item.location}</Text>
          {item.imageUrl ? (
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                setLightboxImageUri(item.imageUrl);
              }}
            >
              <Image source={{ uri: item.imageUrl }} style={styles.ticketCardImage} />
            </Pressable>
          ) : null}
          <Text style={styles.ticketDescription}>{truncateText(item.description, 110)}</Text>
          <Text style={styles.ticketMeta}>Updated {formatTimestamp(item.updatedAt)}</Text>
        </Pressable>
      );
    },
    [],
  );

  return (
    <AppScreen>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item._id}
        renderItem={renderTicket}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.heroCard}>
              <View style={styles.headerRow}>
                <View style={styles.headerMeta}>
                  <Text style={styles.eyebrow}>Reporter Workspace</Text>
                  <Text style={styles.title}>Create and Track Tickets</Text>
                  <Text style={styles.subtitle}>
                    White mode with German palette: bold black primary, yellow secondary, red accents.
                  </Text>
                  <Text style={styles.signedInText}>{props.email}</Text>
                </View>
                <View style={styles.headerActions}>
                  {props.onSwitchToResolver ? (
                    <Pressable onPress={props.onSwitchToResolver} style={styles.workspaceButton}>
                      <Text style={styles.workspaceButtonText}>Go Resolver</Text>
                    </Pressable>
                  ) : null}
                  <Pressable onPress={props.onSignOut} style={styles.signOutButton}>
                    <Text style={styles.signOutText}>Sign out</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.sectionTitle}>New Ticket</Text>
              <TextInput
                value={category}
                onChangeText={setCategory}
                style={styles.input}
                placeholder="Category (e.g. Electrical)"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TextInput
                value={location}
                onChangeText={setLocation}
                style={styles.input}
                placeholder="Location (e.g. Building B - Floor 2)"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TextInput
                value={description}
                onChangeText={setDescription}
                style={[styles.input, styles.descriptionInput]}
                placeholder="Describe the issue briefly"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />

              <View style={styles.imageActionRow}>
                <Pressable
                  onPress={() => void onSelectImageSource("camera")}
                  disabled={imageSelectionDisabled}
                  style={[
                    styles.secondaryButton,
                    styles.imageActionButton,
                    imageSelectionDisabled ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {imageSelectionSource === "camera" ? "Opening..." : "Take Photo"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => void onSelectImageSource("library")}
                  disabled={imageSelectionDisabled}
                  style={[
                    styles.secondaryButton,
                    styles.imageActionButton,
                    imageSelectionDisabled ? styles.buttonDisabled : null,
                  ]}
                >
                  <Text style={styles.secondaryButtonText}>
                    {imageSelectionSource === "library" ? "Opening..." : "Choose Library"}
                  </Text>
                </Pressable>
              </View>

              {selectedImage ? (
                <Pressable onPress={() => setLightboxImageUri(selectedImage.uri)}>
                  <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => void submitTicket()}
                disabled={submitting}
                style={[styles.primaryButton, submitting ? styles.buttonDisabled : null]}
              >
                <Text style={styles.primaryButtonText}>
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </Text>
              </Pressable>

              {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
            </View>

            <Text style={styles.sectionTitle}>My Tickets</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.emptyText}>No tickets yet. Submit your first issue.</Text>}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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

      <Modal visible={selectedTicketId !== null} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Details</Text>
              <Pressable onPress={() => setSelectedTicketId(null)}>
                <Text style={styles.modalClose}>Close</Text>
              </Pressable>
            </View>

            {selectedTicket === undefined ? (
              <Text style={styles.ticketMeta}>Loading...</Text>
            ) : selectedTicket === null ? (
              <Text style={styles.ticketMeta}>Ticket not found.</Text>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.ticketTitle}>{selectedTicket.ticket.category}</Text>
                <Text style={styles.ticketMeta}>{selectedTicket.ticket.location}</Text>
                {selectedTicket.ticket.imageUrl ? (
                  <Pressable onPress={() => setLightboxImageUri(selectedTicket.ticket.imageUrl)}>
                    <Image source={{ uri: selectedTicket.ticket.imageUrl }} style={styles.modalImage} />
                  </Pressable>
                ) : null}
                <Text style={styles.modalDescription}>{selectedTicket.ticket.description}</Text>
                <Text style={styles.ticketMeta}>
                  Current status: {getTicketStatusLabel(selectedTicket.ticket.status)}
                </Text>
                {selectedTicket.ticket.resolutionNote ? (
                  <Text style={styles.modalDescription}>
                    Resolution note: {selectedTicket.ticket.resolutionNote}
                  </Text>
                ) : null}
                {selectedTicket.ticket.resolutionImageUrl ? (
                  <Pressable onPress={() => setLightboxImageUri(selectedTicket.ticket.resolutionImageUrl)}>
                    <Image
                      source={{ uri: selectedTicket.ticket.resolutionImageUrl }}
                      style={styles.modalImage}
                    />
                  </Pressable>
                ) : null}

                <Text style={styles.modalSection}>Status History</Text>
                {selectedTicket.history.map((entry) => (
                  <View key={entry._id} style={styles.historyCard}>
                    <Text style={styles.historyLine}>
                      {`${entry.fromStatus ?? "none"} -> ${entry.toStatus}`}
                    </Text>
                    <Text style={styles.ticketMeta}>{formatTimestamp(entry.changedAt)}</Text>
                    {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <ImageLightbox imageUri={lightboxImageUri} onClose={() => setLightboxImageUri(null)} />
    </AppScreen>
  );
}
