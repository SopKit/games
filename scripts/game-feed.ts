import { randomUUID } from "node:crypto";
import {
  lstat,
  mkdtemp,
  mkdir,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

export interface GameRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  instructions: string;
  category: string;
  tags: string[];
  url: string;
  embedUrl: string;
  image: string;
  width: string;
  height: string;
}

export interface NormalizeResult {
  games: GameRecord[];
  skipped: Array<{ index: number; reason: string }>;
}

export interface FetchOptions {
  attempts?: number;
  timeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
}

function asText(value: unknown): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function safeHttpUrl(value: unknown): string | null {
  const raw = asText(value);
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const seen = new Set<string>();
  const tags: string[] = [];

  for (const entry of raw) {
    const tag = asText(entry);
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }

  return tags;
}

function dimension(value: unknown, fallback: string): string {
  const parsed = Number.parseInt(asText(value), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 10000
    ? String(parsed)
    : fallback;
}

export function normalizeGameFeed(payload: unknown): NormalizeResult {
  if (!Array.isArray(payload)) {
    throw new Error("Game feed must be a JSON array.");
  }

  const games: GameRecord[] = [];
  const skipped: NormalizeResult["skipped"] = [];
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  payload.forEach((raw: unknown, index: number) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      skipped.push({ index, reason: "Record is not an object." });
      return;
    }

    const item = raw as Record<string, unknown>;
    const id = asText(item.id);
    const name = asText(item.title);
    const url = safeHttpUrl(item.url);
    const image = safeHttpUrl(item.thumb);

    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      skipped.push({ index, reason: "Missing or unsafe game ID." });
      return;
    }
    if (!name) {
      skipped.push({ index, reason: "Missing game title." });
      return;
    }
    if (!url || !image) {
      skipped.push({ index, reason: "Game URL or thumbnail is not a valid HTTP(S) URL." });
      return;
    }
    if (seenIds.has(id)) {
      skipped.push({ index, reason: `Duplicate game ID: ${id}.` });
      return;
    }

    const baseSlug = slugify(name) || `game-${slugify(id)}`;
    let slug = baseSlug;
    if (seenSlugs.has(slug)) slug = `${baseSlug}-${slugify(id)}`;
    let suffix = 2;
    while (seenSlugs.has(slug)) slug = `${baseSlug}-${slugify(id)}-${suffix++}`;

    seenIds.add(id);
    seenSlugs.add(slug);

    games.push({
      id,
      name,
      slug,
      description: asText(item.description) || `Play ${name} online for free.`,
      instructions: asText(item.instructions) || "Use keyboard or mouse to play.",
      category: asText(item.category) || "Casual",
      tags: normalizeTags(item.tags),
      url,
      embedUrl: url,
      image,
      width: dimension(item.width, "800"),
      height: dimension(item.height, "600"),
    });
  });

  return { games, skipped };
}

export async function fetchJsonWithRetry(
  url: string,
  fetchImpl: typeof fetch = fetch,
  options: FetchOptions = {},
): Promise<unknown> {
  const attempts = Math.max(1, Math.floor(options.attempts ?? 3));
  const timeoutMs = Math.max(1, options.timeoutMs ?? 15_000);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 500);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 5_000);
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
        const error = new Error(`Feed request failed with HTTP ${response.status}.`);
        if (!retryable || attempt === attempts) throw error;
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(maxDelayMs, retryAfter * 1000)
          : Math.min(maxDelayMs, baseDelayMs * attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const delay = Math.min(maxDelayMs, baseDelayMs * attempt);
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    `Unable to fetch game feed after ${attempts} attempt(s): ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function persistGameRecords(
  games: GameRecord[],
  rootDirectory = process.cwd(),
  outputDirectory = "games",
): Promise<void> {
  if (games.length === 0) throw new Error("Refusing to replace the game catalog with an empty feed.");

  const outputPath = path.join(rootDirectory, outputDirectory);
  const stagingPath = await mkdtemp(path.join(rootDirectory, ".games-stage-"));
  const backupPath = path.join(rootDirectory, `.games-backup-${randomUUID()}`);
  let movedOldDirectory = false;

  try {
    for (const game of games) {
      await writeFile(
        path.join(stagingPath, `${game.id}.json`),
        JSON.stringify(game, null, 2) + "\n",
        { encoding: "utf8", flag: "wx" },
      );
    }

    if (await pathExists(outputPath)) {
      const info = await lstat(outputPath);
      if (!info.isDirectory() || info.isSymbolicLink()) {
        throw new Error(`Refusing to replace non-directory output path: ${outputPath}`);
      }
      await rename(outputPath, backupPath);
      movedOldDirectory = true;
    }

    try {
      await rename(stagingPath, outputPath);
    } catch (error) {
      if (movedOldDirectory) await rename(backupPath, outputPath);
      throw error;
    }

    if (movedOldDirectory) await rm(backupPath, { recursive: true, force: true });
  } finally {
    await rm(stagingPath, { recursive: true, force: true });
  }
}
