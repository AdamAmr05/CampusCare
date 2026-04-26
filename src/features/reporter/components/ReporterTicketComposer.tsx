import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassPressable, GlassSurface } from "../../../ui/GlassSurface";
import { CampusCareIllustration } from "../../../ui/CampusCareIllustration";
import { theme } from "../../../ui/theme";
import { TicketImagePreview } from "../../tickets/TicketImagePreview";
import type { RoomOption } from "../../../domain/reference/rooms/rooms";
import type {
  TicketImageAsset,
  TicketImageSource,
} from "../../tickets/ticketImageSelection";
import { styles } from "./ReporterTicketComposer.styles";

type Props = {
  category: string;
  description: string;
  errorMessage: string;
  imageSelectionDisabled: boolean;
  imageSelectionSource: TicketImageSource | null;
  selectedImage: TicketImageAsset | null;
  selectedRoom: RoomOption | null;
  submitting: boolean;
  onCategoryChange: (value: string) => void;
  onClearImage: () => void;
  onClearRoomSelection: () => void;
  onDescriptionChange: (value: string) => void;
  onOpenImage: (imageUri: string) => void;
  onOpenRoomSelector: () => void;
  onSelectImageSource: (source: TicketImageSource) => void;
  onSubmit: () => void;
};

export function ReporterTicketComposer({
  category,
  description,
  errorMessage,
  imageSelectionDisabled,
  imageSelectionSource,
  selectedImage,
  selectedRoom,
  submitting,
  onCategoryChange,
  onClearImage,
  onClearRoomSelection,
  onDescriptionChange,
  onOpenImage,
  onOpenRoomSelector,
  onSelectImageSource,
  onSubmit,
}: Props): React.JSX.Element {
  return (
    <GlassSurface style={styles.surface} fallbackStyle={styles.surfaceFallback}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title} maxFontSizeMultiplier={1.4}>
            New ticket
          </Text>
          <Text style={styles.subtitle} maxFontSizeMultiplier={1.4}>
            Photo, category, room, and a short description.
          </Text>
        </View>
        <CampusCareIllustration
          accessibilityLabel="Maintenance tools illustration"
          name="maintenanceTools"
          style={styles.illustration}
        />
      </View>

      <TextInput
        value={category}
        onChangeText={onCategoryChange}
        style={styles.input}
        placeholder="Category (e.g. Electrical)"
        placeholderTextColor={theme.colors.textMuted}
        accessibilityLabel="Issue category"
      />

      <Pressable
        onPress={onOpenRoomSelector}
        style={({ pressed }) => [
          styles.roomField,
          pressed ? styles.controlPressed : null,
        ]}
        accessibilityLabel={
          selectedRoom
            ? `Room selected: ${selectedRoom.code}. Tap to change.`
            : "Select a room"
        }
        accessibilityRole="button"
      >
        <View style={styles.roomFieldRow}>
          <Ionicons
            name="location-outline"
            size={16}
            color={
              selectedRoom ? theme.colors.textPrimary : theme.colors.textMuted
            }
          />
          <View style={styles.roomFieldText}>
            {selectedRoom ? (
              <>
                <Text style={styles.roomFieldValue} numberOfLines={1}>
                  {selectedRoom.code}
                </Text>
                <Text style={styles.roomFieldMeta} numberOfLines={1}>
                  Building {selectedRoom.building}
                  {selectedRoom.floor ? ` · Floor ${selectedRoom.floor}` : ""}
                </Text>
              </>
            ) : (
              <Text style={styles.roomFieldPlaceholder} numberOfLines={1}>
                Select room
              </Text>
            )}
          </View>
          {selectedRoom ? (
            <Pressable
              onPress={onClearRoomSelection}
              hitSlop={8}
              accessibilityLabel="Clear room selection"
            >
              <Text style={styles.roomFieldChange}>Change</Text>
            </Pressable>
          ) : (
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.textMuted}
            />
          )}
        </View>
      </Pressable>

      <TextInput
        value={description}
        onChangeText={onDescriptionChange}
        style={[styles.input, styles.descriptionInput]}
        placeholder="Describe the issue briefly"
        placeholderTextColor={theme.colors.textMuted}
        multiline
        accessibilityLabel="Issue description"
      />

      <PhotoSection
        imageSelectionDisabled={imageSelectionDisabled}
        imageSelectionSource={imageSelectionSource}
        selectedImage={selectedImage}
        onClearImage={onClearImage}
        onOpenImage={onOpenImage}
        onSelectImageSource={onSelectImageSource}
      />

      <Pressable
        onPress={onSubmit}
        disabled={submitting}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.primaryButton,
          submitting ? styles.buttonDisabled : null,
          pressed && !submitting ? styles.controlPressed : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>
          {submitting ? "Submitting…" : "Submit ticket"}
        </Text>
      </Pressable>

      {errorMessage ? (
        <View style={styles.errorRow}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={theme.colors.red}
          />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}
    </GlassSurface>
  );
}

type PhotoSectionProps = {
  imageSelectionDisabled: boolean;
  imageSelectionSource: TicketImageSource | null;
  selectedImage: TicketImageAsset | null;
  onClearImage: () => void;
  onOpenImage: (imageUri: string) => void;
  onSelectImageSource: (source: TicketImageSource) => void;
};

function PhotoSection({
  imageSelectionDisabled,
  imageSelectionSource,
  selectedImage,
  onClearImage,
  onOpenImage,
  onSelectImageSource,
}: PhotoSectionProps): React.JSX.Element {
  if (selectedImage) {
    return (
      <View style={styles.thumbRow}>
        <TicketImagePreview
          uri={selectedImage.uri}
          style={styles.thumb}
          onPress={() => onOpenImage(selectedImage.uri)}
        />
        <View style={styles.thumbActions}>
          <GlassPressable
            onPress={() => onSelectImageSource("library")}
            disabled={imageSelectionDisabled}
            surfaceStyle={styles.thumbActionButton}
            pressedSurfaceStyle={styles.controlPressed}
          >
            <Ionicons
              name="refresh-outline"
              size={14}
              color={theme.colors.textPrimary}
            />
            <Text style={styles.thumbActionText}>Replace</Text>
          </GlassPressable>
          <Pressable
            onPress={onClearImage}
            style={({ pressed }) => [
              styles.thumbRemoveButton,
              pressed ? styles.controlPressed : null,
            ]}
            accessibilityLabel="Remove photo"
          >
            <Ionicons name="close" size={14} color={theme.colors.red} />
            <Text style={styles.thumbRemoveText}>Remove</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.photoZone}>
      <View style={styles.photoZoneTitleRow}>
        <Ionicons
          name="image-outline"
          size={18}
          color={theme.colors.textPrimary}
        />
        <Text style={styles.photoZoneTitle}>Add a photo</Text>
      </View>
      <View style={styles.photoZoneActions}>
        <PhotoSourceButton
          icon="camera-outline"
          label={imageSelectionSource === "camera" ? "Opening…" : "Camera"}
          disabled={imageSelectionDisabled}
          onPress={() => onSelectImageSource("camera")}
        />
        <PhotoSourceButton
          icon="images-outline"
          label={imageSelectionSource === "library" ? "Opening…" : "Library"}
          disabled={imageSelectionDisabled}
          onPress={() => onSelectImageSource("library")}
        />
      </View>
    </View>
  );
}

function PhotoSourceButton({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  disabled: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <GlassPressable
      onPress={onPress}
      disabled={disabled}
      containerStyle={styles.photoZoneAction}
      surfaceStyle={styles.photoButton}
      pressedSurfaceStyle={styles.controlPressed}
    >
      <Ionicons name={icon} size={16} color={theme.colors.textPrimary} />
      <Text style={styles.photoButtonText}>{label}</Text>
    </GlassPressable>
  );
}
