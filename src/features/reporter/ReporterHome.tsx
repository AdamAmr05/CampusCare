import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Platform, StyleSheet, Text, View } from "react-native";
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
import {
  WorkspaceEmptyState,
  WorkspaceHero,
  WorkspaceListSkeleton,
  WorkspaceLoadMoreFooter,
  WorkspaceTicketCard,
} from "../../ui/workspace";
import { formatError } from "../../utils/formatError";
import { ImageLightbox } from "../tickets/ImageLightbox";
import type { Ticket } from "../tickets/types";
import {
  selectTicketImage,
  type TicketImageAsset,
  type TicketImageSource,
} from "../tickets/ticketImageSelection";
import { uploadTicketImage } from "../tickets/uploadTicketImage";
import { ReporterTicketDetailsModal } from "./ReporterTicketDetailsModal";
import { ReporterRoomSelector } from "./components/ReporterRoomSelector";
import { ReporterTicketComposer } from "./components/ReporterTicketComposer";

type Props = {
  email: string;
  onSignOut: () => void;
  onSwitchToResolver?: () => void;
};

export function ReporterHome({
  email,
  onSignOut,
  onSwitchToResolver,
}: Props): React.JSX.Element {
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

  // Composer state
  const [category, setCategory] = useState("");
  const [selectedRoomCode, setSelectedRoomCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<TicketImageAsset | null>(null);
  const [imageSelectionSource, setImageSelectionSource] =
    useState<TicketImageSource | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Room selector state
  const [isRoomSelectorVisible, setIsRoomSelectorVisible] = useState(false);
  const [roomSearchQuery, setRoomSearchQuery] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<string | null>(null);

  // Modals state
  const [lightboxImageUri, setLightboxImageUri] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<Id<"tickets"> | null>(null);
  const [selectedTicketPreview, setSelectedTicketPreview] = useState<Ticket | null>(null);
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);

  const imageSelectionDisabled = imageSelectionSource !== null || submitting;
  const roomByCode = useMemo(
    () => new Map(roomDirectory.rooms.map((room) => [room.code, room])),
    [],
  );
  const selectedRoom = selectedRoomCode
    ? roomByCode.get(selectedRoomCode) ?? null
    : null;
  const availableFloors = useMemo(
    () =>
      selectedBuilding
        ? roomDirectory.floorsByBuilding[selectedBuilding] ?? []
        : [],
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

  const handleSelectRoom = useCallback(
    (room: RoomOption) => {
      setSelectedRoomCode(room.code);
      setErrorMessage("");
      setIsRoomSelectorVisible(false);
      resetRoomSelectorFilters();
    },
    [resetRoomSelectorFilters],
  );

  const clearRoomSelection = useCallback(() => {
    setSelectedRoomCode("");
  }, []);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
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
      <WorkspaceTicketCard
        ticket={item}
        onOpenDetails={openTicketDetails}
        onOpenImage={openLightbox}
      />
    ),
    [openLightbox, openTicketDetails],
  );

  const keyExtractor = useCallback((item: Ticket) => item._id, []);

  const onSelectImageSourceFire = useCallback(
    (source: TicketImageSource) => {
      void onSelectImageSource(source);
    },
    [onSelectImageSource],
  );

  const onSubmitFire = useCallback(() => {
    void submitTicket();
  }, [submitTicket]);

  const switchTo = onSwitchToResolver
    ? { label: "Switch to Resolver (dev)", onPress: onSwitchToResolver }
    : undefined;

  const listHeader = (
    <View style={listHeaderStyles.container}>
      <WorkspaceHero
        email={email}
        role="Reporter"
        illustration="ticketReport"
        onSignOut={onSignOut}
        switchTo={switchTo}
      />
      <ReporterTicketComposer
        category={category}
        description={description}
        errorMessage={errorMessage}
        imageSelectionDisabled={imageSelectionDisabled}
        imageSelectionSource={imageSelectionSource}
        selectedImage={selectedImage}
        selectedRoom={selectedRoom}
        submitting={submitting}
        onCategoryChange={setCategory}
        onClearImage={clearImage}
        onClearRoomSelection={clearRoomSelection}
        onDescriptionChange={setDescription}
        onOpenImage={openLightbox}
        onOpenRoomSelector={openRoomSelector}
        onSelectImageSource={onSelectImageSourceFire}
        onSubmit={onSubmitFire}
      />
      <Text style={listHeaderStyles.sectionTitle}>My tickets</Text>
    </View>
  );

  return (
    <AppScreen>
      <FlatList
        data={tickets}
        keyExtractor={keyExtractor}
        renderItem={renderTicket}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          status === "LoadingFirstPage" ? (
            <WorkspaceListSkeleton />
          ) : (
            <WorkspaceEmptyState
              illustration="ticketClosed"
              title="No tickets yet"
              body="Submit your first issue when something needs attention."
            />
          )
        }
        contentContainerStyle={[
          listHeaderStyles.listContent,
          { paddingBottom: Math.max(24, insets.bottom + 16) },
        ]}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <WorkspaceLoadMoreFooter
            canLoadMore={status === "CanLoadMore"}
            onLoadMore={() => loadMore(10)}
          />
        }
        removeClippedSubviews={Platform.OS === "android"}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={50}
      />

      <ReporterRoomSelector
        availableFloors={availableFloors}
        filteredRoomOptions={filteredRoomOptions}
        onClose={closeRoomSelector}
        onSearchQueryChange={setRoomSearchQuery}
        onSelectBuilding={selectBuilding}
        onSelectFloor={selectFloor}
        onSelectRoom={handleSelectRoom}
        roomSearchQuery={roomSearchQuery}
        selectedBuilding={selectedBuilding}
        selectedFloor={selectedFloor}
        selectedRoomCode={selectedRoomCode}
        visible={isRoomSelectorVisible}
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
