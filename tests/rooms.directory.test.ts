import { describe, expect, it } from "vitest";
import {
  createRoomDirectory,
  filterRoomOptions,
  parseRoomCode,
  roomDirectory,
} from "../src/domain/reference/rooms/rooms";

describe("rooms directory utilities", () => {
  it("parses supported room code formats", () => {
    expect(parseRoomCode("a1.101")).toEqual({
      code: "A1.101",
      building: "A",
      floor: "1",
    });
    expect(parseRoomCode("A1.201")).toEqual({
      code: "A1.201",
      building: "A",
      floor: "2",
    });
    expect(parseRoomCode("A.020")).toEqual({
      code: "A.020",
      building: "A",
      floor: "0",
    });
    expect(parseRoomCode("TC11")).toEqual({
      code: "TC11",
      building: "TC",
      floor: "1",
    });
    expect(parseRoomCode("test2")).toBeNull();
    expect(parseRoomCode("Reserved Area")).toBeNull();
  });

  it("builds a deduplicated directory and drops invalid rows", () => {
    const directory = createRoomDirectory([
      { room: "A1.101" },
      { room: "A1.101" },
      { room: "A2.006" },
      { room: "Panorama" },
      { name: "Missing room code" },
      null,
    ]);

    expect(directory.rooms.map((room) => room.code)).toEqual(["A2.006", "A1.101"]);
    expect(directory.buildings).toEqual(["A"]);
    expect(directory.floorsByBuilding.A).toEqual(["0", "1"]);
  });

  it("filters by building, floor, and search text tokens", () => {
    const directory = createRoomDirectory([
      { room: "A1.101" },
      { room: "A1.201" },
      { room: "M2.014" },
      { room: "S3.334" },
    ]);

    const filteredByBuilding = filterRoomOptions(directory.rooms, {
      building: "A",
      floor: null,
      query: "",
    });
    expect(filteredByBuilding.map((room) => room.code)).toEqual(["A1.101", "A1.201"]);

    const filteredByFloor = filterRoomOptions(directory.rooms, {
      building: "A",
      floor: "1",
      query: "",
    });
    expect(filteredByFloor.map((room) => room.code)).toEqual(["A1.101"]);

    const filteredByQuery = filterRoomOptions(directory.rooms, {
      building: null,
      floor: null,
      query: "s3 334",
    });
    expect(filteredByQuery.map((room) => room.code)).toEqual(["S3.334"]);
  });

  it("loads bundled GIU rooms for selector use", () => {
    expect(roomDirectory.rooms.length).toBeGreaterThan(150);
    expect(roomDirectory.buildings).toEqual(expect.arrayContaining(["A", "M", "S"]));

    const specificResult = filterRoomOptions(roomDirectory.rooms, {
      building: "S",
      floor: "0",
      query: "015A",
    });
    expect(specificResult.some((room) => room.code === "S2.015A")).toBe(true);
  });
});
