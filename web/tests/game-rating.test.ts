import { describe, expect, test } from "bun:test";
import { getVerifiedRating } from "../src/lib/verified-rating";

describe("getVerifiedRating", () => {
  test("accepts a valid score with a positive provider-supplied sample count", () => {
    expect(getVerifiedRating({ rating: "4.6", ratingCount: 42 })).toEqual({
      value: 4.6,
      ratingCount: 42,
    });
  });

  test("hides legacy scores without a sample count", () => {
    expect(getVerifiedRating({ rating: "5.0" })).toBeNull();
  });

  test("rejects scores and sample counts outside the supported range", () => {
    expect(getVerifiedRating({ rating: "5.5", ratingCount: 4 })).toBeNull();
    expect(getVerifiedRating({ rating: "0", ratingCount: 4 })).toBeNull();
    expect(getVerifiedRating({ rating: "4.2", ratingCount: 0 })).toBeNull();
    expect(getVerifiedRating({ rating: "4.2", ratingCount: -1 })).toBeNull();
    expect(getVerifiedRating({ rating: "not-a-score", ratingCount: 4 })).toBeNull();
    expect(getVerifiedRating({ rating: "4.6 stars", ratingCount: 4 })).toBeNull();
  });
});
