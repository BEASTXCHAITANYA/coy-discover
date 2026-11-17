import { describe, it, expect } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to the limit, blocks after, and resets in the next window", () => {
    let t = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t });
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("a")).toEqual({ allowed: false, retryAfterSeconds: 1 });
    expect(limiter.check("b").allowed).toBe(true); // other clients are unaffected
    t = 1000;
    expect(limiter.check("a").allowed).toBe(true);
  });
});
