import { describe, expect, it } from "vitest";
import { buildDigest } from "@core/digest";
import type { SlackMessage } from "@core/types";
import messages from "@data/messages.json";
import sampleMessages from "@data/sample-messages.json";
import { nudgeCounts } from "@/lib/nudges";

const weekStart = new Date("2026-09-21T00:00:00Z");

describe("nudgeCounts", () => {
  const all = messages as SlackMessage[];
  const digest = buildDigest(all, weekStart);
  const counts = nudgeCounts(all, weekStart, digest);
  const inOrder = digest.unanswered.map((q) => counts[q.ts]);

  it("has a count for every unanswered question and nothing else", () => {
    expect(Object.keys(counts).sort()).toEqual(digest.unanswered.map((q) => q.ts).sort());
  });

  it("agrees with buildDigest's order: counts never go up down the list", () => {
    for (let i = 1; i < inOrder.length; i++) expect(inOrder[i]).toBeLessThanOrEqual(inOrder[i - 1]);
  });

  it("matches the counts read off the export by hand", () => {
    // CSV import: "bump" + "anyone? still stuck on this"; then five questions with one each.
    expect(inOrder).toEqual([2, 1, 1, 1, 1, 1, ...Array(14).fill(0)]);
  });

  it("is zero for the sample's only unanswered question", () => {
    const sample = sampleMessages as SlackMessage[];
    const sampleDigest = buildDigest(sample, weekStart);
    expect(nudgeCounts(sample, weekStart, sampleDigest)).toEqual({ "1790271900.007090": 0 });
  });

  it("ignores bots and replies after the week ends", () => {
    const q = { ts: "1790000000.000000", user: "U1", text: "Anyone?" };
    const replies: SlackMessage[] = [
      { ts: "1790000100.000000", thread_ts: q.ts, user: "U2", text: "+1" },
      { ts: "1790000200.000000", thread_ts: q.ts, user: "B1", text: "+1", subtype: "bot_message" },
      { ts: "1790600000.000000", thread_ts: q.ts, user: "U1", text: "bump" }, // after Sep 28
    ];
    const digest = { topThreads: [], unanswered: [q] };
    expect(nudgeCounts([q, ...replies], weekStart, digest)).toEqual({ [q.ts]: 1 });
  });
});
