import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  downloadImages,
  hasValidImageSignature,
  imageExtension,
  readBoundedBody,
  safeImageFilename,
  validateImageUrl,
} from "../download_images";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);

describe("image URL and filename validation", () => {
  test("accepts only HTTPS GameMonetize image hosts", () => {
    expect(validateImageUrl("https://img.gamemonetize.com/game/thumb.jpg").hostname)
      .toBe("img.gamemonetize.com");
    expect(() => validateImageUrl("http://img.gamemonetize.com/game.jpg")).toThrow("HTTPS");
    expect(() => validateImageUrl("https://example.com/game.jpg")).toThrow("approved");
    expect(() => validateImageUrl("https://user:pass@img.gamemonetize.com/game.jpg")).toThrow("credentials");
  });

  test("rejects path traversal and unsupported extensions", () => {
    expect(safeImageFilename("puzzle-hero", ".jpg")).toBe("puzzle-hero.jpg");
    expect(() => safeImageFilename("../outside", ".jpg")).toThrow("Unsafe image slug");
    expect(() => imageExtension("text/html")).toThrow("Unsupported image content type");
  });
});

describe("image content validation", () => {
  test("checks declared image type against the actual file signature", () => {
    expect(hasValidImageSignature(jpeg, "image/jpeg")).toBe(true);
    expect(hasValidImageSignature(jpeg, "image/png")).toBe(false);
  });

  test("enforces the size limit while reading a streamed response", async () => {
    const response = new Response(new Uint8Array(16), {
      headers: { "content-type": "image/jpeg" },
    });
    await expect(readBoundedBody(response, 8)).rejects.toThrow("download limit");
  });
});

describe("downloadImages", () => {
  test("downloads a validated image using its content type and atomic filename", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-images-"));
    try {
      const fakeFetch: typeof fetch = async () => new Response(jpeg, {
        status: 200,
        headers: { "content-type": "image/jpeg", "content-length": String(jpeg.length) },
      });
      const result = await downloadImages([{
        slug: "puzzle-hero",
        image: "https://img.gamemonetize.com/abc/thumbnail.jpg",
      }], root, { fetchImpl: fakeFetch, concurrency: 1 });

      expect(result).toEqual({ downloaded: 1, skipped: 0, failed: 0 });
      expect(await readdir(root)).toEqual(["puzzle-hero.jpg"]);
      expect(await readFile(path.join(root, "puzzle-hero.jpg"))).toEqual(jpeg);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("does not follow a redirect to an unapproved host", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-images-"));
    try {
      const fakeFetch: typeof fetch = async () => new Response(null, {
        status: 302,
        headers: { location: "https://attacker.example/payload.jpg" },
      });
      const result = await downloadImages([{
        slug: "puzzle-hero",
        image: "https://img.gamemonetize.com/abc/thumbnail.jpg",
      }], root, { fetchImpl: fakeFetch, concurrency: 1 });
      expect(result.failed).toBe(1);
      expect(await readdir(root)).toEqual([]);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  test("respects the configured concurrency limit", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "sopgames-images-"));
    let active = 0;
    let maximumActive = 0;
    try {
      const fakeFetch: typeof fetch = async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise((resolve) => setTimeout(resolve, 10));
        active -= 1;
        return new Response(jpeg, {
          status: 200,
          headers: { "content-type": "image/jpeg", "content-length": String(jpeg.length) },
        });
      };
      const games = Array.from({ length: 5 }, (_, index) => ({
        slug: `puzzle-${index}`,
        image: `https://img.gamemonetize.com/abc/${index}.jpg`,
      }));

      const result = await downloadImages(games, root, {
        fetchImpl: fakeFetch,
        concurrency: 2,
      });

      expect(result).toEqual({ downloaded: 5, skipped: 0, failed: 0 });
      expect(maximumActive).toBe(2);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

});
