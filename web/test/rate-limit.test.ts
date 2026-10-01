import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("createRateLimiter", () => {
  it("allows `limit` requests per window, then blocks with a retry time", () => {
    const check = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(check("ip", 0)).toEqual({ ok: true });
    expect(check("ip", 10_000)).toEqual({ ok: true });
    expect(check("ip", 20_000)).toEqual({ ok: false, retryAfterSeconds: 40 }); // first hit expires at 60 s
  });

  it("lets requests through again once old ones leave the window", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(check("ip", 0).ok).toBe(true);
    expect(check("ip", 59_999).ok).toBe(false);
    expect(check("ip", 60_000).ok).toBe(true);
  });

  it("counts each key separately", () => {
    const check = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect(check("a", 0).ok).toBe(true);
    expect(check("b", 0).ok).toBe(true);
    expect(check("a", 1).ok).toBe(false);
  });
});
