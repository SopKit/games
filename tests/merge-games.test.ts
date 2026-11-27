import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  mergeGameDirectory,
  serializeCatalog,
  validateCatalogGames,
} from "../merge_games";

const game = (id: string, slug = `game-${id}`) => ({
  id,
  name: `Game ${id}`,
  slug,
  url: `https://games.example.test/${id}`,
  embedUrl: `https://games.example.test/${id}`,
  image: `https://images.example.test/${id}.jpg`,
  tags: [],
});

describe("catalog validation", () => {
  test("rejects malformed records and duplicate IDs or slugs", () => {
    expect(() => validateCatalogGames([game("1"), { id: "2" }])).toThrow("Invalid game record");
    expect(() => validateCatalogGames([game("1"), game("1", "other")])).toThrow("Duplicate game ID");
    expect(() => validateCatalogGames([game("1", "same"), game("2", "same")])).toThrow("Duplicate game slug");
  });

  test("serializes a stable JSON representation with a trailing newline", () => {
    const content = serializeCatalog([game("1")]);
    expect(content.endsWith("\n")).toBe(true);
    expect(JSON.parse(content)).toEqual([game("1")]);
  });
});

describe("mergeGameDirectory", () => {
  test("merges files in deterministic filename order into both catalog outputs", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-merge-"));
    try {
      await mkdir(path.join(root, "games"));
      await writeFile(path.join(root, "games", "2.json"), JSON.stringify(game("2")));
      await writeFile(path.join(root, "games", "1.json"), JSON.stringify(game("1")));
      await writeFile(path.join(root, "games", "notes.txt"), "ignored");

      const games = await mergeGameDirectory(root);
      expect(games.map((item) => item.id)).toEqual(["1", "2"]);

      const rootOutput = await readFile(path.join(root, "games.json"), "utf8");
      const webOutput = await readFile(path.join(root, "web", "public", "games.json"), "utf8");
      expect(rootOutput).toBe(webOutput);
      expect(JSON.parse(rootOutput)).toEqual(games);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("leaves both previous outputs untouched if one source file is malformed", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-merge-"));
    try {
      await mkdir(path.join(root, "games"));
      await mkdir(path.join(root, "web", "public"), { recursive: true });
      await writeFile(path.join(root, "games", "1.json"), JSON.stringify(game("1")));
      await writeFile(path.join(root, "games", "2.json"), "{not json");
      await writeFile(path.join(root, "games.json"), "previous-root");
      await writeFile(path.join(root, "web", "public", "games.json"), "previous-web");

      await expect(mergeGameDirectory(root)).rejects.toThrow("refusing to publish an incomplete catalog");
      expect(await readFile(path.join(root, "games.json"), "utf8")).toBe("previous-root");
      expect(await readFile(path.join(root, "web", "public", "games.json"), "utf8")).toBe("previous-web");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("rejects source filenames that do not match the record ID", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-merge-"));
    try {
      await mkdir(path.join(root, "games"));
      await mkdir(path.join(root, "web", "public"), { recursive: true });
      await writeFile(path.join(root, "games", "wrong-name.json"), JSON.stringify(game("1")));
      await writeFile(path.join(root, "games.json"), "previous-root");
      await writeFile(path.join(root, "web", "public", "games.json"), "previous-web");

      await expect(mergeGameDirectory(root)).rejects.toThrow("does not match game ID");
      expect(await readFile(path.join(root, "games.json"), "utf8")).toBe("previous-root");
      expect(await readFile(path.join(root, "web", "public", "games.json"), "utf8")).toBe("previous-web");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
