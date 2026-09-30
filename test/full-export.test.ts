import { describe, expect, it } from "vitest";
import { buildDigest } from "../src/digest";
import type { SlackMessage } from "../src/types";
import messages from "../data/messages.json";

// Spot checks on the real export. Expected values were worked out by reading the data,
// not by copying the function's output.
const digest = buildDigest(messages as SlackMessage[], new Date("2026-09-21T00:00:00Z"));
const unansweredText = digest.unanswered.map((q) => q.text);

describe("buildDigest on data/messages.json", () => {
  it("picks the three threads with the most replies this week", () => {
    expect(digest.topThreads).toEqual([
      // Posted Sept 19, before the week; 15 replies all-time, 11 this week.
      { thread_ts: "1789830000.068270", text: "What's the best way to migrate our community from Discourse?", repliesThisWeek: 11 },
      { thread_ts: "1790096400.033730", text: "We just crossed 10k members 🎉 sharing what worked for us in the thread", repliesThisWeek: 9 },
      { thread_ts: "1790179200.073050", text: "How are folks handling SSO with Okta?", repliesThisWeek: 7 },
    ]);
  });

  it("does not rank the AMA thread by its all-time reply_count", () => {
    expect(digest.topThreads.map((t) => t.text)).not.toContainEqual(expect.stringContaining("Hosting an AMA"));
  });

  it.each([
    "Anyone have a good onboarding checklist template", // no "?"
    "How do I bulk-import members from a CSV?", // only the asker bumped it
    "Is there a way to schedule posts in advance?", // only a bot auto-reply
    "Is there a way to see who RSVP'd but didn't attend?", // only "+1, same question"
    "Does the analytics export include DMs?", // answered after the week ended
  ])("lists %s", (text) => expect(unansweredText).toContain(text));

  it.each([
    "Why won't my custom domain verify? DNS looks right", // asker solved it
    "Will this be recorded?", // asked inside the AMA thread
    "Is the API rate limit per workspace?", // posted exactly at week end
    "Can you believe it's almost Q4 already?", // rhetorical
    "How are folks handling SSO with Okta?", // answered
  ])("does not list %s", (text) => expect(unansweredText).not.toContain(text));
});
