import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, usePaginatedQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  filterRoomOptions,
  roomDirectory,
  type RoomOption,
} from "../../domain/reference/rooms/rooms";
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
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [description, setDescription] = useState("");
  const [isRoomSelectorVisible, setIsRoomSelectorVisible] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<TicketImageAsset | null>(null);
  const [imageSelectionSource, setImageSelectionSource] = useState<TicketImageSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);

  const [selectedTicketId, setSelectedTicketId] = useState<Id<"tickets"> | null>(null);
  const [selectedTicketPreview, setSelectedTicketPreview] = useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const imageSelectionDisabled = imageSelectionSource !== null || submitting;
  const roomByCode = useMemo(
    () => new Map(roomDirectory.rooms.map((room) => [room.code, room])),
    [],
  );
  const selectedRoom = selectedRoomCode ? roomByCode.get(selectedRoomCode) ?? null : null;
  const availableFloors = useMemo(
    () => (selectedBuilding ? roomDirectory.floorsByBuilding[selectedBuilding] ?? [] : []),
    [selectedBuilding],
  );
  const filteredRoomOptions = useMemo(
    () =>
      filterRoomOptions(roomDirectory.rooms, {
        building: selectedBuilding,
        floor: selectedFloor,
        query: roomSearchQuery,
      }),
    [roomSearchQuery, selectedBuilding, selectedFloor],
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

  const closeLightbox = useCallback(() => {
    setLightboxImageUri(null);
  }, []);

  const resetRoomSelectorFilters = useCallback(() => {
    setRoomSearchQuery("");
    setSelectedBuilding(null);
    setSelectedFloor(null);
  }, []);

  const openRoomSelector = useCallback(() => {
    setIsRoomSelectorVisible(true);
  }, []);

  const closeRoomSelector = useCallback(() => {
    setIsRoomSelectorVisible(false);
    resetRoomSelectorFilters();
  }, [resetRoomSelectorFilters]);

  const selectBuilding = useCallback((building: string | null) => {
    setSelectedBuilding(building);
    setSelectedFloor(null);
  }, []);

  const selectFloor = useCallback((floor: string | null) => {
    setSelectedFloor(floor);
  }, []);

  const handleSelectRoom = useCallback((room: RoomOption) => {
    setSelectedRoomCode(room.code);
    setErrorMessage("");
    setIsRoomSelectorVisible(false);
    resetRoomSelectorFilters();
  }, [resetRoomSelectorFilters]);

  const clearRoomSelection = useCallback(() => {
    setSelectedRoomCode("");
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

  useEffect(() => {
    if (!selectedFloor) {
      return;
    }

    if (!availableFloors.includes(selectedFloor)) {
      setSelectedFloor(null);
    }
  }, [availableFloors, selectedFloor]);

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
    const normalizedLocation = selectedRoomCode.trim();
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
      setSelectedRoomCode("");
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
    selectedRoomCode,
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
          <Pressable onPress={openRoomSelector} style={styles.selectorInput}>
            <View style={styles.selectorInputRow}>
              <Text
                style={selectedRoom ? styles.selectorValueText : styles.selectorPlaceholderText}
                numberOfLines={1}
              >
                {selectedRoom ? selectedRoom.code : "Select room (building -> floor -> room)"}
              </Text>
              <Text style={styles.selectorActionText}>Open</Text>
            </View>
          </Pressable>
          {selectedRoom ? (
            <View style={styles.selectedRoomMetaRow}>
              <Text style={styles.selectedRoomMetaText}>
                Building {selectedRoom.building}
                {selectedRoom.floor ? ` • Floor ${selectedRoom.floor}` : ""}
              </Text>
              <Pressable onPress={clearRoomSelection} hitSlop={6}>
                <Text style={styles.clearRoomText}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
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
      clearRoomSelection,
      description,
      errorMessage,
      imageSelectionDisabled,
      imageSelectionSource,
      onSelectImageSource,
      openLightbox,
      openRoomSelector,
      props.email,
      props.onSignOut,
      props.onSwitchToResolver,
      selectedImage,
      selectedRoom,
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

  const isAndroid = Platform.OS === "android";
  const roomSelectorSheet = (
    <View style={styles.roomSelectorScreen}>
      <View style={styles.roomSelectorHeader}>
        <Text style={styles.modalTitle}>Select Room</Text>
        <Pressable onPress={closeRoomSelector} style={styles.modalCloseButton}>
          <Text style={styles.modalCloseButtonText}>Close</Text>
        </Pressable>
      </View>

      <View style={styles.roomSelectorContent}>
        <TextInput
          value={roomSearchQuery}
          onChangeText={setRoomSearchQuery}
          style={styles.input}
          placeholder="Search room code (e.g. S2.015)"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.filterLabel}>Building</Text>
        <View style={styles.chipGrid}>
          <Pressable
            onPress={() => selectBuilding(null)}
            style={[styles.filterChip, selectedBuilding === null ? styles.filterChipActive : null]}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              style={[
                styles.filterChipText,
                selectedBuilding === null ? styles.filterChipTextActive : null,
              ]}
            >
              All
            </Text>
          </Pressable>
          {roomDirectory.buildings.map((building) => (
            <Pressable
              key={building}
              onPress={() => selectBuilding(building)}
              style={[styles.filterChip, selectedBuilding === building ? styles.filterChipActive : null]}
            >
              <Text
                maxFontSizeMultiplier={1.2}
                style={[
                  styles.filterChipText,
                  selectedBuilding === building ? styles.filterChipTextActive : null,
                ]}
              >
                {building}
              </Text>
            </Pressable>
          ))}
        </View>

        {selectedBuilding ? (
          <>
            <Text style={styles.filterLabel}>Floor (optional)</Text>
            <View style={styles.chipGrid}>
              <Pressable
                onPress={() => selectFloor(null)}
                style={[
                  styles.filterChip,
                  styles.filterChipWide,
                  selectedFloor === null ? styles.filterChipActive : null,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={1.2}
                  style={[
                    styles.filterChipText,
                    selectedFloor === null ? styles.filterChipTextActive : null,
                  ]}
                >
                  All Floors
                </Text>
              </Pressable>
              {availableFloors.map((floor) => (
                <Pressable
                  key={floor}
                  onPress={() => selectFloor(floor)}
                  style={[styles.filterChip, selectedFloor === floor ? styles.filterChipActive : null]}
                >
                  <Text
                    maxFontSizeMultiplier={1.2}
                    style={[
                      styles.filterChipText,
                      selectedFloor === floor ? styles.filterChipTextActive : null,
                    ]}
                  >
                    Floor {floor}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.selectorResultsText}>
          Showing {filteredRoomOptions.length} room{filteredRoomOptions.length === 1 ? "" : "s"}
        </Text>

        <FlatList
          data={filteredRoomOptions}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.roomList}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectRoom(item)}
              style={[
                styles.roomListItem,
                selectedRoomCode === item.code ? styles.roomListItemActive : null,
              ]}
            >
              <Text style={styles.roomCodeText}>{item.code}</Text>
              <Text style={styles.roomMetaText}>
                Building {item.building}
                {item.floor ? ` • Floor ${item.floor}` : ""}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No rooms match this filter. Change building/floor or search text.
            </Text>
          }
        />
      </View>
    </View>
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

      <Modal
        animationType={isAndroid ? "fade" : "slide"}
        visible={isRoomSelectorVisible}
        onRequestClose={closeRoomSelector}
        presentationStyle={isAndroid ? "fullScreen" : "pageSheet"}
        transparent={isAndroid}
        statusBarTranslucent={isAndroid}
      >
        {isAndroid ? (
          <View style={styles.androidSheetOverlay}>
            <Pressable style={styles.androidSheetBackdrop} onPress={closeRoomSelector} />
            <View style={styles.androidSheetCard}>{roomSelectorSheet}</View>
          </View>
        ) : (
          roomSelectorSheet
        )}
      </Modal>

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
