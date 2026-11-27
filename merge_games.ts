import { randomUUID } from "node:crypto";
import { lstat, mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export interface CatalogGame {
  id: string;
  name: string;
  slug: string;
  [key: string]: unknown;
}

function isCatalogGame(value: unknown): value is CatalogGame {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const game = value as Record<string, unknown>;
  return typeof game.id === "string" &&
    game.id.trim().length > 0 &&
    typeof game.name === "string" &&
    game.name.trim().length > 0 &&
    typeof game.slug === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(game.slug);
}

export function validateCatalogGames(values: unknown[]): CatalogGame[] {
  const ids = new Set<string>();
  const slugs = new Set<string>();

  return values.map((value, index) => {
    if (!isCatalogGame(value)) {
      throw new Error(`Invalid game record at catalog index ${index}.`);
    }
    if (ids.has(value.id)) throw new Error(`Duplicate game ID "${value.id}".`);
    if (slugs.has(value.slug)) throw new Error(`Duplicate game slug "${value.slug}".`);
    ids.add(value.id);
    slugs.add(value.slug);
    return value;
  });
}

export function serializeCatalog(games: CatalogGame[]): string {
  return JSON.stringify(games, null, 2) + "\n";
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function writeCatalogAtomically(
  targets: string[],
  content: string,
): Promise<void> {
  if (targets.length === 0) throw new Error("At least one catalog output path is required.");

  const token = randomUUID();
  const prepared = targets.map((target) => ({
    target,
    temporary: path.join(path.dirname(target), `.${path.basename(target)}.${token}.tmp`),
    backup: path.join(path.dirname(target), `.${path.basename(target)}.${token}.bak`),
    backedUp: false,
    installed: false,
  }));

  try {
    for (const item of prepared) {
      await mkdir(path.dirname(item.target), { recursive: true });
      await writeFile(item.temporary, content, { encoding: "utf8", flag: "wx" });
    }

    for (const item of prepared) {
      if (await exists(item.target)) {
        const info = await lstat(item.target);
        if (!info.isFile() || info.isSymbolicLink()) {
          throw new Error(`Refusing to replace non-regular output file: ${item.target}`);
        }
        await rename(item.target, item.backup);
        item.backedUp = true;
      }
      await rename(item.temporary, item.target);
      item.installed = true;
    }
  } catch (error) {
    for (const item of [...prepared].reverse()) {
      if (item.installed) await rm(item.target, { force: true }).catch(() => undefined);
      if (item.backedUp) await rename(item.backup, item.target).catch(() => undefined);
    }
    throw error;
  } finally {
    for (const item of prepared) {
      await rm(item.temporary, { force: true }).catch(() => undefined);
      if (item.installed && item.backedUp) {
        await rm(item.backup, { force: true }).catch(() => undefined);
      }
    }
  }
}

export async function mergeGameDirectory(rootDirectory = process.cwd()): Promise<CatalogGame[]> {
  const gamesDirectory = path.join(rootDirectory, "games");
  const entries = await readdir(gamesDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "en"));

  if (files.length === 0) throw new Error("No per-game JSON files were found; catalog outputs were not changed.");

  const parsed: unknown[] = [];
  for (const file of files) {
    const source = path.join(gamesDirectory, file);
    let value: unknown;
    try {
      value = JSON.parse(await readFile(source, "utf8"));
    } catch (error) {
      throw new Error(`Could not parse ${file}; refusing to publish an incomplete catalog. ${error instanceof Error ? error.message : String(error)}`);
    }
    parsed.push(value);
  }

  const games = validateCatalogGames(parsed);
  const content = serializeCatalog(games);
  await writeCatalogAtomically([
    path.join(rootDirectory, "games.json"),
    path.join(rootDirectory, "web", "public", "games.json"),
  ], content);

  return games;
}

if (import.meta.main) {
  mergeGameDirectory()
    .then((games) => console.log(`Wrote a validated catalog containing ${games.length} games.`))
    .catch((error) => {
      console.error("Catalog merge failed:", error);
      process.exitCode = 1;
    });
}
