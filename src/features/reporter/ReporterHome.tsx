import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppScreen } from "../../ui/AppScreen";
import { theme } from "../../ui/theme";
import { formatError } from "../../utils/formatError";
import { ImageLightbox } from "../tickets/ImageLightbox";
import { TicketImagePreview } from "../tickets/TicketImagePreview";
import type { Ticket } from "../tickets/types";
import { NotificationCenter } from "../notifications/NotificationCenter";
import {
  selectTicketImage,
  type TicketImageAsset,
  type TicketImageSource,
} from "../tickets/ticketImageSelection";
import { uploadTicketImage } from "../tickets/uploadTicketImage";
import { ReporterTicketCard } from "./ReporterTicketCard";
import { ReporterTicketDetailsModal } from "./ReporterTicketDetailsModal";
import { styles } from "./ReporterHome.styles";

export function ReporterHome(props: {
  email: string;
  onSignOut: () => void;
  onSwitchToResolver?: () => void;
}): React.JSX.Element {
  const insets = useSafeAreaInsets();
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
  const [selectedTicketPreview, setSelectedTicketPreview] = useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const imageSelectionDisabled = imageSelectionSource !== null || submitting;

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

  const closeLightbox = useCallback(() => {
    setLightboxImageUri(null);
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
    ({ item }: { item: Ticket }) => (
      <ReporterTicketCard ticket={item} onOpenDetails={openTicketDetails} onOpenImage={openLightbox} />
    ),
    [openLightbox, openTicketDetails],
  );

  const keyExtractor = useCallback((item: Ticket) => item._id, []);

  const listHeader = useMemo(
    () => (
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

        <NotificationCenter />

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
            <TicketImagePreview
              uri={selectedImage.uri}
              style={styles.imagePreview}
              onPress={() => openLightbox(selectedImage.uri)}
            />
          ) : null}

          <Pressable
            onPress={() => void submitTicket()}
            disabled={submitting}
            style={[styles.primaryButton, submitting ? styles.buttonDisabled : null]}
          >
            <Text style={styles.primaryButtonText}>{submitting ? "Submitting..." : "Submit Ticket"}</Text>
          </Pressable>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>My Tickets</Text>
      </View>
    ),
    [
      category,
      description,
      errorMessage,
      imageSelectionDisabled,
      imageSelectionSource,
      location,
      onSelectImageSource,
      openLightbox,
      props.email,
      props.onSignOut,
      props.onSwitchToResolver,
      selectedImage,
      submitTicket,
      submitting,
    ],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footerSpace}>
        {status === "CanLoadMore" ? (
          <Pressable onPress={() => loadMore(10)} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Load More</Text>
          </Pressable>
        ) : null}
      </View>
    ),
    [loadMore, status],
  );

  return (
    <AppScreen>
      <FlatList
        data={tickets}
        keyExtractor={keyExtractor}
        renderItem={renderTicket}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<Text style={styles.emptyText}>No tickets yet. Submit your first issue.</Text>}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(24, insets.bottom + 16) }]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={listFooter}
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
      />

      <ReporterTicketDetailsModal
        visible={isDetailsVisible}
        selectedTicketId={selectedTicketId}
        previewTicket={selectedTicketPreview}
        onClose={closeTicketDetails}
      />
      <ImageLightbox imageUri={lightboxImageUri} onClose={closeLightbox} />
    </AppScreen>
  );
}
