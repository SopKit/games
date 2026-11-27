import { describe, expect, test } from "bun:test";
import type { Game } from "../src/types";
import {
  getMostPlayed,
  readGameList,
  readJson,
  readPlayCounts,
  recordGamePlay,
  toggleFavorite,
  writeJson,
  type StorageLike,
} from "../src/lib/browser-storage";

class MemoryStorage implements StorageLike {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const game = (slug: string): Game => ({
  id: slug,
  name: slug,
  slug,
  url: `https://games.example.test/${slug}`,
  embedUrl: `https://games.example.test/${slug}`,
  image: `https://images.example.test/${slug}.jpg`,
  rating: "4.5",
});

describe("browser storage helpers", () => {
  test("uses a fallback for missing or malformed JSON", () => {
    const storage = new MemoryStorage();
    storage.setItem("broken", "{not-json");
    expect(readJson(storage, "missing", ["fallback"])).toEqual(["fallback"]);
    expect(readJson(storage, "broken", ["fallback"])).toEqual(["fallback"]);
  });

  test("filters malformed entries from game lists and play counts", () => {
    const storage = new MemoryStorage();
    storage.setItem("favorites", JSON.stringify([game("one"), null, { slug: "bad" }]));
    storage.setItem("most-played", JSON.stringify({
      one: { game: game("one"), playCount: 3 },
      invalid: { game: { slug: "bad" }, playCount: 4 },
      negative: { game: game("negative"), playCount: -1 },
    }));

    expect(readGameList(storage, "favorites").map((item) => item.slug)).toEqual(["one"]);
    expect(Object.keys(readPlayCounts(storage))).toEqual(["one"]);
    expect(getMostPlayed(storage).map((item) => item.slug)).toEqual(["one"]);
  });

  test("records a game once at the front of history and increments its play count", () => {
    const storage = new MemoryStorage();
    const first = game("first");
    const second = game("second");
    recordGamePlay(storage, first);
    recordGamePlay(storage, second);
    recordGamePlay(storage, first);

    expect(readGameList(storage, "recently-played").map((item) => item.slug))
      .toEqual(["first", "second"]);
    expect(readPlayCounts(storage).first?.playCount).toBe(2);
  });

  test("toggles favorites without creating duplicate entries", () => {
    const storage = new MemoryStorage();
    const title = game("favorite");
    expect(toggleFavorite(storage, title)).toBe(true);
    expect(toggleFavorite(storage, title)).toBe(false);
    expect(readGameList(storage, "favorites")).toHaveLength(0);
  });

  test("does not throw when storage is unavailable or quota-limited", () => {
    const unavailable: StorageLike = {
      getItem() { throw new Error("SecurityError"); },
      setItem() { throw new Error("QuotaExceededError"); },
    };
    expect(readGameList(unavailable, "favorites")).toEqual([]);
    expect(writeJson(unavailable, "favorites", [])).toBe(false);
    expect(() => recordGamePlay(unavailable, game("no-storage"))).not.toThrow();
    expect(() => toggleFavorite(unavailable, game("no-storage"))).not.toThrow();
  });
});
