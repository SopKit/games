import { describe, expect, test } from "bun:test";
import {
  fetchJsonWithRetry,
  normalizeGameFeed,
  persistGameRecords,
} from "../scripts/game-feed";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const valid = (overrides: Record<string, unknown> = {}) => ({
  id: "100",
  title: "Puzzle Hero",
  description: "A puzzle game",
  instructions: "Use the arrow keys",
  category: "Puzzle",
  tags: "Logic, Brain, Logic",
  url: "https://games.example.test/play/100",
  thumb: "https://images.example.test/100.jpg",
  width: "800",
  height: "600",
  ...overrides,
});

describe("normalizeGameFeed", () => {
  test("normalizes valid records and de-duplicates tags", () => {
    const result = normalizeGameFeed([valid()]);
    expect(result.games).toHaveLength(1);
    expect(result.games[0]?.slug).toBe("puzzle-hero");
    expect(result.games[0]?.tags).toEqual(["Logic", "Brain"]);
    expect(result.skipped).toHaveLength(0);
  });

  test("skips malformed records, duplicate IDs, and unsafe URLs", () => {
    const result = normalizeGameFeed([
      null,
      valid(),
      valid({ id: "100", title: "Duplicate" }),
      valid({ id: "bad/id" }),
      valid({ id: "101", url: "javascript:alert(1)" }),
    ]);
    expect(result.games).toHaveLength(1);
    expect(result.skipped).toHaveLength(4);
  });

  test("makes duplicate titles produce stable unique slugs", () => {
    const result = normalizeGameFeed([
      valid({ id: "101", title: "Same Name" }),
      valid({ id: "102", title: "Same Name" }),
    ]);
    expect(result.games.map((game) => game.slug)).toEqual(["same-name", "same-name-102"]);
  });

  test("rejects a non-array feed payload", () => {
    expect(() => normalizeGameFeed({ games: [] })).toThrow("JSON array");
  });
});

describe("fetchJsonWithRetry", () => {
  test("retries transient HTTP failures and returns the successful response", async () => {
    let calls = 0;
    const fakeFetch: typeof fetch = async () => {
      calls += 1;
      return calls === 1
        ? new Response("temporary failure", { status: 503 })
        : new Response(JSON.stringify([valid()]), {
            status: 200,
            headers: { "content-type": "application/json" },
          });
    };

    const payload = await fetchJsonWithRetry("https://feed.example.test", fakeFetch, {
      attempts: 2,
      baseDelayMs: 0,
    });
    expect(calls).toBe(2);
    expect(Array.isArray(payload)).toBe(true);
  });

  test("does not retry permanent client errors", async () => {
    let calls = 0;
    const fakeFetch: typeof fetch = async () => {
      calls += 1;
      return new Response("not found", { status: 404 });
    };
    await expect(fetchJsonWithRetry("https://feed.example.test", fakeFetch, {
      attempts: 3,
      baseDelayMs: 0,
    })).rejects.toThrow("HTTP 404");
    expect(calls).toBe(1);
  });
});

describe("persistGameRecords", () => {
  test("replaces a populated directory only after staging all new records", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-test-"));
    try {
      await writeFile(path.join(root, "sentinel.txt"), "keep root");
      await persistGameRecords(normalizeGameFeed([valid()]).games, root);
      const files = await readdir(path.join(root, "games"));
      expect(files).toEqual(["100.json"]);
      const saved = JSON.parse(await readFile(path.join(root, "games", "100.json"), "utf8"));
      expect(saved.slug).toBe("puzzle-hero");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("keeps existing catalog when the new feed is empty", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-test-"));
    try {
      await import("node:fs/promises").then(({ mkdir }) => mkdir(path.join(root, "games")));
      await writeFile(path.join(root, "games", "old.json"), "{}");
      await expect(persistGameRecords([], root)).rejects.toThrow("empty feed");
      expect(await readdir(path.join(root, "games"))).toEqual(["old.json"]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
