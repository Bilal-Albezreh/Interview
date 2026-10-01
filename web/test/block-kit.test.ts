import { describe, expect, it } from "vitest";
import { buildDigest } from "@core/digest";
import type { Digest, SlackMessage } from "@core/types";
import messages from "@data/messages.json";
import { buildBlockKit, escapeMrkdwn, type Block } from "@/lib/block-kit";
import { nudgeCounts } from "@/lib/nudges";

const weekStart = new Date("2026-09-21T00:00:00Z");
const all = messages as SlackMessage[];
const digest = buildDigest(all, weekStart);
const nudges = nudgeCounts(all, weekStart, digest);

// The structural rules Slack enforces for these block types.
function expectValidBlockKit(payload: { blocks: Block[] }) {
  expect(JSON.parse(JSON.stringify(payload))).toEqual(payload); // plain JSON
  expect(payload.blocks.length).toBeGreaterThan(0);
  expect(payload.blocks.length).toBeLessThanOrEqual(50);
  for (const block of payload.blocks) {
    expect(["header", "section", "divider"]).toContain(block.type);
    if (block.type === "header") {
      expect(block.text.type).toBe("plain_text");
      expect(block.text.text.length).toBeGreaterThan(0);
      expect(block.text.text.length).toBeLessThanOrEqual(150);
    }
    if (block.type === "section") {
      expect(block.text.type).toBe("mrkdwn");
      expect(block.text.text.trim().length).toBeGreaterThan(0);
      expect(block.text.text.length).toBeLessThanOrEqual(3000);
    }
    if (block.type === "divider") expect(Object.keys(block)).toEqual(["type"]);
  }
}

describe("buildBlockKit", () => {
  it("builds header, summary, top threads and the waiting list for the full export", () => {
    const payload = buildBlockKit(digest, nudges, weekStart, "Quiet week.\nTwo things need you.");
    expectValidBlockKit(payload);
    expect(payload.blocks.map((b) => b.type)).toEqual(["header", "section", "divider", "section", "divider", "section"]);
    expect(payload.blocks[0]).toEqual({
      type: "header",
      text: { type: "plain_text", text: "Monday digest · Week of September 21" },
    });
    const text = payload.blocks.map((b) => (b.type === "divider" ? "" : b.text.text));
    expect(text[1]).toBe("Quiet week.\nTwo things need you.");
    expect(text[3]).toContain("*Top threads*\n1. What's the best way to migrate our community from Discourse? · 11 replies this week");
    expect(text[5]).toContain("*Waiting for an answer*\n• How do I bulk-import members from a CSV? _(2 nudges)_");
    expect(text[5]).toContain("• Are polls anonymous by default? _(1 nudge)_");
    expect(text[5]).toContain("• What do you use for event registration, Luma or something else?\n"); // no count at zero
  });

  it("leaves the summary out until there is one", () => {
    const payload = buildBlockKit(digest, nudges, weekStart);
    expectValidBlockKit(payload);
    expect(payload.blocks.map((b) => b.type)).toEqual(["header", "section", "divider", "section"]);
  });

  it("says so when a list is empty", () => {
    const payload = buildBlockKit({ topThreads: [], unanswered: [] }, {}, weekStart);
    expectValidBlockKit(payload);
    const text = payload.blocks.flatMap((b) => (b.type === "section" ? [b.text.text] : []));
    expect(text).toEqual([
      "*Top threads*\nNo thread had replies this week.",
      "*Waiting for an answer*\nEvery question posted this week got an answer.",
    ]);
  });

  it("escapes Slack control characters so message text can't ping the channel", () => {
    const tricky: Digest = { topThreads: [], unanswered: [{ ts: "1", user: "U1", text: "<!channel> Q&A <b>now</b>?" }] };
    const payload = buildBlockKit(tricky, {}, weekStart);
    const waiting = payload.blocks.at(-1);
    expect(waiting?.type === "section" && waiting.text.text).toContain("• &lt;!channel&gt; Q&amp;A &lt;b&gt;now&lt;/b&gt;?");
    expect(escapeMrkdwn("a & b")).toBe("a &amp; b");
  });

  it("splits long lists across sections under 3,000 characters without losing a line", () => {
    const many: Digest = {
      topThreads: [],
      unanswered: Array.from({ length: 120 }, (_, i) => ({ ts: String(i), user: "U1", text: `Question ${i}? ${"x".repeat(60)}` })),
    };
    const payload = buildBlockKit(many, {}, weekStart);
    expectValidBlockKit(payload);
    const waitingText = payload.blocks
      .slice(3)
      .flatMap((b) => (b.type === "section" ? [b.text.text] : []))
      .join("\n");
    for (let i = 0; i < 120; i++) expect(waitingText).toContain(`Question ${i}?`);
    expect(payload.blocks.filter((b) => b.type === "section").length).toBeGreaterThan(2);
  });

  it("truncates a summary line that is longer than one section allows", () => {
    const payload = buildBlockKit(digest, nudges, weekStart, "y".repeat(5000));
    expectValidBlockKit(payload);
  });
});
