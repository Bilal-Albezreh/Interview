import { describe, expect, it } from "vitest";
import { buildDigest } from "@core/digest";
import type { SlackMessage } from "@core/types";
import messages from "@data/messages.json";
import { AVATAR_TONES, avatarTone, initials } from "@/lib/avatar";

describe("initials", () => {
  it.each([
    ["U0P0KSYZ6HH", "PK"],
    ["U00QKFMKQQA", "QK"],
    ["U07566VFKGX", "VF"],
    ["U12345", "U1"], // no letters after the prefix: fall back to the ID itself
  ])("%s -> %s", (id, expected) => expect(initials(id)).toBe(expected));
});

describe("avatarTone", () => {
  it("is stable for an ID and stays in range", () => {
    expect(avatarTone("U0P0KSYZ6HH")).toBe(avatarTone("U0P0KSYZ6HH"));
    for (const id of ["U0P0KSYZ6HH", "U00QKFMKQQA", "U07566VFKGX", "x"]) {
      expect(avatarTone(id)).toBeGreaterThanOrEqual(0);
      expect(avatarTone(id)).toBeLessThan(AVATAR_TONES);
    }
  });

  it("spreads this week's askers across every tone", () => {
    const askers = new Set(buildDigest(messages as SlackMessage[], new Date("2026-09-21T00:00:00Z")).unanswered.map((q) => q.user));
    expect(new Set([...askers].map(avatarTone)).size).toBe(AVATAR_TONES);
  });
});
