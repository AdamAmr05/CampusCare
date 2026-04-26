import React from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  GlassPressable,
  getActiveGlassTint,
} from "../../../ui/GlassSurface";
import { theme } from "../../../ui/theme";
import { roomDirectory, type RoomOption } from "../../../domain/reference/rooms/rooms";

type Props = {
  availableFloors: string[];
  filteredRoomOptions: RoomOption[];
  onClose: () => void;
  onSearchQueryChange: (value: string) => void;
  onSelectBuilding: (building: string | null) => void;
  onSelectFloor: (floor: string | null) => void;
  onSelectRoom: (room: RoomOption) => void;
  roomSearchQuery: string;
  selectedBuilding: string | null;
  selectedFloor: string | null;
  selectedRoomCode: string;
  visible: boolean;
};

export function ReporterRoomSelector({
  availableFloors,
  filteredRoomOptions,
  onClose,
  onSearchQueryChange,
  onSelectBuilding,
  onSelectFloor,
  onSelectRoom,
  roomSearchQuery,
  selectedBuilding,
  selectedFloor,
  selectedRoomCode,
  visible,
}: Props): React.JSX.Element {
  const isAndroid = Platform.OS === "android";
  const sheet = (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Select room</Text>
        <GlassPressable
          onPress={onClose}
          surfaceStyle={styles.closeButton}
          pressedSurfaceStyle={styles.controlPressed}
        >
          <Text style={styles.closeButtonText}>Close</Text>
        </GlassPressable>
      </View>

      <View style={styles.content}>
        <TextInput
          value={roomSearchQuery}
          onChangeText={onSearchQueryChange}
          style={styles.input}
          placeholder="Search room code (e.g. S2.015)"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
        />

        <Text style={styles.filterLabel}>Building</Text>
        <View style={styles.chipGrid}>
          <FilterChip
            label="All"
            active={selectedBuilding === null}
            onPress={() => onSelectBuilding(null)}
          />
          {roomDirectory.buildings.map((building) => (
            <FilterChip
              key={building}
              label={building}
              active={selectedBuilding === building}
              onPress={() => onSelectBuilding(building)}
            />
          ))}
        </View>

        {selectedBuilding ? (
          <>
            <Text style={styles.filterLabel}>Floor (optional)</Text>
            <View style={styles.chipGrid}>
              <FilterChip
                label="All Floors"
                active={selectedFloor === null}
                wide
                onPress={() => onSelectFloor(null)}
              />
              {availableFloors.map((floor) => (
                <FilterChip
                  key={floor}
                  label={`Floor ${floor}`}
                  active={selectedFloor === floor}
                  onPress={() => onSelectFloor(floor)}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.resultsText}>
          Showing {filteredRoomOptions.length} room
          {filteredRoomOptions.length === 1 ? "" : "s"}
        </Text>

        <FlatList
          data={filteredRoomOptions}
          keyExtractor={(item) => item.code}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectRoom(item)}
              style={[
                styles.listItem,
                selectedRoomCode === item.code ? styles.listItemActive : null,
              ]}
            >
              <Text style={styles.roomCode}>{item.code}</Text>
              <Text style={styles.roomMeta}>
                Building {item.building}
                {item.floor ? ` · Floor ${item.floor}` : ""}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No rooms match this filter. Change building/floor or search text.
            </Text>
          }
        />
      </View>
    </View>
  );

  return (
    <Modal
      animationType={isAndroid ? "fade" : "slide"}
      visible={visible}
      onRequestClose={onClose}
      presentationStyle={isAndroid ? "fullScreen" : "pageSheet"}
      transparent={isAndroid}
      statusBarTranslucent={isAndroid}
    >
      {isAndroid ? (
        <View style={styles.androidOverlay}>
          <Pressable style={styles.androidBackdrop} onPress={onClose} />
          <View style={styles.androidCard}>{sheet}</View>
        </View>
      ) : (
        sheet
      )}
    </Modal>
  );
}

function FilterChip({
  label,
  active,
  wide,
  onPress,
}: {
  label: string;
  active: boolean;
  wide?: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <GlassPressable
      onPress={onPress}
      surfaceStyle={[
        styles.chip,
        wide ? styles.chipWide : null,
        active ? styles.chipActive : null,
      ]}
      pressedSurfaceStyle={styles.controlPressed}
      tintColor={getActiveGlassTint(active)}
    >
      <Text
        maxFontSizeMultiplier={1.2}
        style={[styles.chipText, active ? styles.chipTextActive : null]}
      >
        {label}
      </Text>
    </GlassPressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  androidOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  androidBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  androidCard: {
    maxHeight: "92%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceMuted,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.textPrimary,
    letterSpacing: -0.3,
  },
  closeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.glassFallbackMuted,
  },
  closeButtonText: {
    color: theme.colors.red,
    fontWeight: "700",
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 10,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: "#fffdf6",
    color: theme.colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    minHeight: 44,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.45,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.glassFallbackMuted,
    minHeight: 42,
    minWidth: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipWide: {
    minWidth: 104,
  },
  chipActive: {
    borderColor: theme.colors.black,
    backgroundColor: theme.colors.glassFallbackActive,
  },
  chipText: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
    color: theme.colors.textPrimary,
  },
  chipTextActive: {
    fontWeight: "700",
  },
  resultsText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
    marginTop: 2,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 28,
    gap: 8,
  },
  listItem: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    backgroundColor: "#fffdf6",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 2,
  },
  listItemActive: {
    borderColor: theme.colors.black,
    backgroundColor: "#fff2b8",
  },
  roomCode: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.textPrimary,
  },
  roomMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: "500",
  },
  empty: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
  },
  controlPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
});
