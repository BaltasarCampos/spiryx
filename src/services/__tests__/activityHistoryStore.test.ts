/**
 * ActivityHistoryStore contract cases: empty storage, replace-in-place for
 * an existing activity type, 3 distinct activities retained, corrupt JSON
 * fallback, and localStorage throwing (private mode) without crashing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearActivityHistory,
  readActivityHistory,
  recordActivityCheck,
} from "../activityHistoryStore";

const STORAGE_KEY = "spiryx.activityHistory";

describe("activityHistoryStore", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array when nothing has been stored", () => {
    expect(readActivityHistory()).toEqual([]);
  });

  it("records a check and reads it back", () => {
    recordActivityCheck("run", "2026-07-16T10:00:00.000Z");
    expect(readActivityHistory()).toEqual([
      { activityType: "run", lastCheckedIso: "2026-07-16T10:00:00.000Z" },
    ]);
  });

  it("replaces the existing entry for the same activity type instead of appending", () => {
    recordActivityCheck("run", "2026-07-16T10:00:00.000Z");
    recordActivityCheck("run", "2026-07-16T11:00:00.000Z");
    expect(readActivityHistory()).toEqual([
      { activityType: "run", lastCheckedIso: "2026-07-16T11:00:00.000Z" },
    ]);
  });

  it("retains all 3 distinct activity types, most recent first", () => {
    recordActivityCheck("run", "2026-07-16T10:00:00.000Z");
    recordActivityCheck("cycle", "2026-07-16T11:00:00.000Z");
    recordActivityCheck("kids", "2026-07-16T09:00:00.000Z");
    expect(readActivityHistory()).toEqual([
      { activityType: "cycle", lastCheckedIso: "2026-07-16T11:00:00.000Z" },
      { activityType: "run", lastCheckedIso: "2026-07-16T10:00:00.000Z" },
      { activityType: "kids", lastCheckedIso: "2026-07-16T09:00:00.000Z" },
    ]);
  });

  it("returns the updated list from recordActivityCheck", () => {
    const entries = recordActivityCheck("kids", "2026-07-16T10:00:00.000Z");
    expect(entries).toEqual([
      { activityType: "kids", lastCheckedIso: "2026-07-16T10:00:00.000Z" },
    ]);
  });

  it("defaults the timestamp to now when none is given", () => {
    const before = Date.now();
    const [entry] = recordActivityCheck("run");
    expect(Date.parse(entry.lastCheckedIso)).toBeGreaterThanOrEqual(before);
    expect(Date.parse(entry.lastCheckedIso)).toBeLessThanOrEqual(Date.now());
  });

  it("falls back to an empty array on corrupt JSON", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(readActivityHistory()).toEqual([]);
  });

  it("falls back to an empty array when the stored value is not an entry array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activityType: "run" }));
    expect(readActivityHistory()).toEqual([]);
  });

  it("drops stored entries with an unknown activity type", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        { activityType: "swim", lastCheckedIso: "2026-07-16T10:00:00.000Z" },
        { activityType: "run", lastCheckedIso: "2026-07-16T09:00:00.000Z" },
      ]),
    );
    expect(readActivityHistory()).toEqual([
      { activityType: "run", lastCheckedIso: "2026-07-16T09:00:00.000Z" },
    ]);
  });

  it("returns an empty array without throwing when localStorage reads throw", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(readActivityHistory()).toEqual([]);
  });

  it("still returns the updated list when localStorage writes throw", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const entries = recordActivityCheck("run", "2026-07-16T10:00:00.000Z");
    expect(entries).toEqual([
      { activityType: "run", lastCheckedIso: "2026-07-16T10:00:00.000Z" },
    ]);
  });

  it("clearActivityHistory removes the stored key", () => {
    recordActivityCheck("run", "2026-07-16T10:00:00.000Z");
    clearActivityHistory();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(readActivityHistory()).toEqual([]);
  });

  it("clearActivityHistory does not throw when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("private mode");
    });
    expect(() => clearActivityHistory()).not.toThrow();
  });
});
