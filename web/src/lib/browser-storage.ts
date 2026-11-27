import type { Game } from "../types";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface PlayCount {
  game: Game;
  playCount: number;
}

function isGame(value: unknown): value is Game {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.slug === "string";
}

/**
 * Accessing localStorage itself can throw in privacy-restricted contexts.
 * Keep this browser-only so importing the module during SSR is harmless.
 */
export function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(storage: StorageLike, key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(storage: StorageLike, key: string, value: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readGameList(storage: StorageLike, key: string): Game[] {
  const raw = readJson<unknown>(storage, key, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter(isGame);
}

export function readPlayCounts(storage: StorageLike): Record<string, PlayCount> {
  const raw = readJson<unknown>(storage, "most-played", {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const result: Record<string, PlayCount> = {};
  for (const [slug, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const candidate = value as Record<string, unknown>;
    const count = candidate.playCount;
    if (isGame(candidate.game) && typeof count === "number" &&
      Number.isSafeInteger(count) && count > 0) {
      result[slug] = { game: candidate.game, playCount: count };
    }
  }
  return result;
}

export function getMostPlayed(storage: StorageLike, limit = 6): Game[] {
  return Object.values(readPlayCounts(storage))
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, Math.max(0, limit))
    .map((entry) => entry.game);
}

export function recordGamePlay(storage: StorageLike, game: Game, historyLimit = 12): void {
  const recentlyPlayed = readGameList(storage, "recently-played")
    .filter((item) => item.slug !== game.slug);
  recentlyPlayed.unshift(game);
  writeJson(storage, "recently-played", recentlyPlayed.slice(0, Math.max(1, historyLimit)));

  const mostPlayed = readPlayCounts(storage);
  const previousCount = mostPlayed[game.slug]?.playCount ?? 0;
  mostPlayed[game.slug] = { game, playCount: previousCount + 1 };
  writeJson(storage, "most-played", mostPlayed);
}

export function toggleFavorite(storage: StorageLike, game: Game): boolean {
  const favorites = readGameList(storage, "favorites");
  const alreadyFavorite = favorites.some((item) => item.slug === game.slug);
  const next = alreadyFavorite
    ? favorites.filter((item) => item.slug !== game.slug)
    : [...favorites, game];

  writeJson(storage, "favorites", next);
  return !alreadyFavorite;
}
