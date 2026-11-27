import type { Game } from "../types";

export interface VerifiedRating {
  value: number;
  ratingCount: number;
}

/**
 * A score without a real sample count is not a user rating.
 * This also hides legacy ID-derived scores that older catalog snapshots stored.
 */
export function getVerifiedRating(
  game: Pick<Game, "rating" | "ratingCount">,
): VerifiedRating | null {
  const value = Number.parseFloat(game.rating ?? "");
  const ratingCount = game.ratingCount;

  if (!Number.isFinite(value) || value < 1 || value > 5) return null;
  if (!Number.isSafeInteger(ratingCount) || (ratingCount ?? 0) <= 0) return null;

  return { value, ratingCount: ratingCount as number };
}
