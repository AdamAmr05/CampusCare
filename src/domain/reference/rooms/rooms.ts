import rawRoomRecords from "./giuRooms.json";

export type RoomOption = {
  code: string;
  building: string;
  floor: string | null;
  searchText: string;
};

export type RoomDirectory = {
  rooms: RoomOption[];
  buildings: string[];
  floorsByBuilding: Record<string, string[]>;
};

export type RoomFilter = {
  building: string | null;
  floor: string | null;
  query: string;
  limit?: number;
};

type ParsedRoomCode = {
  code: string;
  building: string;
  floor: string | null;
};

const ROOM_WITH_PREFIX_AND_NUMBER = /^([A-Z]{1,2})(\d*)\.(\d+[A-Z]?)$/;
const ROOM_WITH_BUILDING_DOT = /^([A-Z]{1,2})\.(\d+[A-Z]?)$/;
const ROOM_WITH_BUILDING_ONLY = /^([A-Z]{1,2})(\d+[A-Z]?)$/;
const DEFAULT_RESULT_LIMIT = 250;

function normalizeRoomCode(value: string): string {
  return value.trim().toUpperCase();
}

function toObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null,
  );
}

function toRoomSearchText(parsed: ParsedRoomCode): string {
  return `${parsed.code} ${parsed.building}${parsed.floor ?? ""}`.toUpperCase();
}

function inferFloor(roomNumber: string): string | null {
  const floorMatch = roomNumber.match(/^(\d)/);
  return floorMatch ? floorMatch[1] : null;
}

export function parseRoomCode(roomValue: string): ParsedRoomCode | null {
  const normalized = normalizeRoomCode(roomValue);
  if (normalized.length === 0) {
    return null;
  }

  const withPrefixAndNumber = normalized.match(ROOM_WITH_PREFIX_AND_NUMBER);
  if (withPrefixAndNumber) {
    const [, building, buildingSuffix, roomDigits] = withPrefixAndNumber;
    const normalizedPrefix = `${building}${buildingSuffix}`;
    return {
      code: `${normalizedPrefix}.${roomDigits}`,
      building,
      floor: inferFloor(roomDigits),
    };
  }

  const withDot = normalized.match(ROOM_WITH_BUILDING_DOT);
  if (withDot) {
    const [, building, roomDigits] = withDot;
    return {
      code: `${building}.${roomDigits}`,
      building,
      floor: inferFloor(roomDigits),
    };
  }

  const withoutDot = normalized.match(ROOM_WITH_BUILDING_ONLY);
  if (withoutDot) {
    const [, building, roomDigits] = withoutDot;
    return {
      code: `${building}${roomDigits}`,
      building,
      floor: inferFloor(roomDigits),
    };
  }

  return null;
}

export function createRoomDirectory(rawData: unknown): RoomDirectory {
  const rawRows = toObjectArray(rawData);
  const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  const roomsByCode = new Map<string, RoomOption>();
  const floorsByBuildingMap = new Map<string, Set<string>>();

  for (const row of rawRows) {
    const roomValue = row.room;
    if (typeof roomValue !== "string") {
      continue;
    }

    const parsed = parseRoomCode(roomValue);
    if (!parsed) {
      continue;
    }

    if (!roomsByCode.has(parsed.code)) {
      roomsByCode.set(parsed.code, {
        code: parsed.code,
        building: parsed.building,
        floor: parsed.floor,
        searchText: toRoomSearchText(parsed),
      });
    }

    if (!parsed.floor) {
      continue;
    }

    const knownFloors = floorsByBuildingMap.get(parsed.building) ?? new Set<string>();
    knownFloors.add(parsed.floor);
    floorsByBuildingMap.set(parsed.building, knownFloors);
  }

  const buildings = Array.from(
    new Set(Array.from(roomsByCode.values(), (room) => room.building)),
  ).sort((left, right) => collator.compare(left, right));

  const rooms = Array.from(roomsByCode.values()).sort((left, right) => {
    const byBuilding = collator.compare(left.building, right.building);
    if (byBuilding !== 0) {
      return byBuilding;
    }

    if (left.floor === right.floor) {
      return collator.compare(left.code, right.code);
    }

    if (left.floor === null) {
      return 1;
    }

    if (right.floor === null) {
      return -1;
    }

    const byFloor = collator.compare(left.floor, right.floor);
    if (byFloor !== 0) {
      return byFloor;
    }

    return collator.compare(left.code, right.code);
  });

  const floorsByBuilding: Record<string, string[]> = {};
  for (const building of buildings) {
    const buildingFloors = floorsByBuildingMap.get(building);
    floorsByBuilding[building] = buildingFloors
      ? Array.from(buildingFloors).sort((left, right) => collator.compare(left, right))
      : [];
  }

  return {
    rooms,
    buildings,
    floorsByBuilding,
  };
}

export function filterRoomOptions(
  rooms: readonly RoomOption[],
  filters: RoomFilter,
): RoomOption[] {
  const normalizedQuery = filters.query.trim().toUpperCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 0);
  const limit = filters.limit ?? DEFAULT_RESULT_LIMIT;

  return rooms
    .filter((room) => {
      if (filters.building && room.building !== filters.building) {
        return false;
      }

      if (filters.floor && room.floor !== filters.floor) {
        return false;
      }

      if (queryTokens.length === 0) {
        return true;
      }

      return queryTokens.every((token) => room.searchText.includes(token));
    })
    .slice(0, limit);
}

export const roomDirectory = createRoomDirectory(rawRoomRecords);
