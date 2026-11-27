import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface GameImageRecord {
  id?: string;
  slug: string;
  image: string;
}

export interface DownloadOptions {
  maxBytes?: number;
  concurrency?: number;
  fetchImpl?: typeof fetch;
  redirectLimit?: number;
}

const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_HOST = /(^|\.)gamemonetize\.com$/i;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export function validateImageUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Thumbnail URL is not a valid absolute URL.");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Thumbnail URL must use HTTPS without credentials or a custom port.");
  }
  if (!ALLOWED_HOST.test(url.hostname)) {
    throw new Error(`Thumbnail host is not an approved GameMonetize image host: ${url.hostname}`);
  }

  return url;
}

export function imageExtension(contentType: string | null): string {
  const mime = (contentType || "").split(";")[0]?.trim().toLowerCase() || "";
  const extension = MIME_EXTENSIONS[mime];
  if (!extension) throw new Error(`Unsupported image content type: ${mime || "missing"}`);
  return extension;
}

export function safeImageFilename(slug: string, extension: string): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Unsafe image slug: ${slug}`);
  }
  if (!Object.values(MIME_EXTENSIONS).includes(extension)) {
    throw new Error(`Unsupported image extension: ${extension}`);
  }
  return `${slug}${extension}`;
}

export function hasValidImageSignature(buffer: Uint8Array, contentType: string): boolean {
  const bytes = Buffer.from(buffer);
  switch ((contentType.split(";")[0] || "").trim().toLowerCase()) {
    case "image/jpeg":
      return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case "image/png":
      return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "image/gif":
      return bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
        bytes.subarray(0, 6).toString("ascii") === "GIF89a";
    case "image/webp":
      return bytes.length >= 12 &&
        bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP";
    case "image/avif":
      return bytes.length >= 12 &&
        bytes.subarray(4, 8).toString("ascii") === "ftyp" &&
        ["avif", "avis"].includes(bytes.subarray(8, 12).toString("ascii"));
    default:
      return false;
  }
}

export async function readBoundedBody(response: Response, maxBytes = DEFAULT_MAX_BYTES): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error(`Image exceeds the ${maxBytes}-byte download limit.`);
  }
  if (!response.body) throw new Error("Image response did not contain a body.");

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      total += chunk.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Image exceeds the ${maxBytes}-byte download limit.`);
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  if (total === 0) throw new Error("Image response was empty.");
  return Buffer.concat(chunks, total);
}

async function fetchImageResponse(
  rawUrl: string,
  fetchImpl: typeof fetch,
  redirectLimit: number,
): Promise<Response> {
  let current = validateImageUrl(rawUrl);

  for (let redirect = 0; redirect <= redirectLimit; redirect++) {
    const response = await fetchImpl(current, { redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;

    const location = response.headers.get("location");
    if (!location) throw new Error("Image redirect did not include a Location header.");
    if (redirect === redirectLimit) throw new Error("Image redirect limit exceeded.");

    current = validateImageUrl(new URL(location, current).toString());
  }

  throw new Error("Image redirect limit exceeded.");
}

async function downloadOne(
  game: GameImageRecord,
  imagesDirectory: string,
  options: Required<Pick<DownloadOptions, "maxBytes" | "fetchImpl" | "redirectLimit">>,
): Promise<"downloaded" | "skipped"> {
  const existingPathPrefix = path.resolve(imagesDirectory) + path.sep;
  const response = await fetchImageResponse(game.image, options.fetchImpl, options.redirectLimit);

  if (!response.ok) throw new Error(`Image request failed with HTTP ${response.status}.`);
  const contentType = (response.headers.get("content-type") || "").split(";")[0]?.trim().toLowerCase() || "";
  const extension = imageExtension(contentType);
  const filename = safeImageFilename(game.slug, extension);
  const destination = path.resolve(imagesDirectory, filename);
  if (!destination.startsWith(existingPathPrefix)) throw new Error("Resolved image path escaped the images directory.");

  try {
    const info = await fs.stat(destination);
    if (info.isFile() && info.size > 0) return "skipped";
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const content = await readBoundedBody(response, options.maxBytes);
  if (!hasValidImageSignature(content, contentType)) {
    throw new Error(`Image bytes do not match declared content type ${contentType}.`);
  }

  await fs.mkdir(imagesDirectory, { recursive: true });
  const temporary = path.join(imagesDirectory, `.${filename}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, content, { flag: "wx", mode: 0o644 });
    await fs.rename(temporary, destination);
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
  }

  return "downloaded";
}

export async function downloadImages(
  games: GameImageRecord[],
  imagesDirectory: string,
  options: DownloadOptions = {},
): Promise<{ downloaded: number; skipped: number; failed: number }> {
  const concurrency = Math.max(1, Math.min(12, Math.floor(options.concurrency ?? 8)));
  const settings = {
    maxBytes: Math.max(1, options.maxBytes ?? DEFAULT_MAX_BYTES),
    fetchImpl: options.fetchImpl ?? fetch,
    redirectLimit: Math.max(0, Math.min(5, Math.floor(options.redirectLimit ?? 3))),
  };
  let nextIndex = 0;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= games.length) return;
      const game = games[index];
      if (!game) continue;
      try {
        const outcome = await downloadOne(game, imagesDirectory, settings);
        if (outcome === "downloaded") downloaded += 1;
        else skipped += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed image for ${game.slug}:`, error);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, games.length) }, () => worker()));
  return { downloaded, skipped, failed };
}

async function main() {
  const gamesJsonPath = path.join(process.cwd(), "web", "public", "games.json");
  const imagesDirectory = path.join(process.cwd(), "images");
  console.log(`Reading games from ${gamesJsonPath}...`);

  const raw: unknown = JSON.parse(await fs.readFile(gamesJsonPath, "utf8"));
  if (!Array.isArray(raw)) throw new Error("games.json must contain an array.");

  const games: GameImageRecord[] = raw.filter((value): value is GameImageRecord => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const candidate = value as Record<string, unknown>;
    return typeof candidate.slug === "string" && typeof candidate.image === "string";
  });

  if (games.length !== raw.length) {
    console.warn(`Ignored ${raw.length - games.length} invalid catalog record(s).`);
  }

  const result = await downloadImages(games, imagesDirectory);
  console.log(`Image download complete: ${result.downloaded} downloaded, ${result.skipped} already present, ${result.failed} failed.`);
  if (result.failed > 0) process.exitCode = 1;
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Image download failed:", error);
    process.exitCode = 1;
  });
}
