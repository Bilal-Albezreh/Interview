import { describe, expect, it } from "vitest";
import { buildDigest } from "../src/digest";
import type { SlackMessage } from "../src/types";

const weekStart = new Date("2026-09-21T00:00:00Z");
const START = weekStart.getTime() / 1000;
const DAY = 24 * 60 * 60;

// Slack-style ts `days` after weekStart (negative = before the week).
const at = (days: number) => (START + days * DAY).toFixed(6);

function post(days: number, text: string, extra: Partial<SlackMessage> = {}): SlackMessage {
  return { ts: at(days), user: "U_ASKER", text, ...extra };
}

function reply(parent: SlackMessage, days: number, text: string, user = "U_OTHER", extra: Partial<SlackMessage> = {}): SlackMessage {
  return { ts: at(days), thread_ts: parent.ts, user, text, ...extra };
}

const threadsOf = (messages: SlackMessage[]) =>
  buildDigest(messages, weekStart).topThreads.map((t) => [t.text, t.repliesThisWeek]);

const unansweredOf = (messages: SlackMessage[]) =>
  buildDigest(messages, weekStart).unanswered.map((q) => q.text);

describe("topThreads", () => {
  it("counts only replies posted this week and ignores the all-time reply_count", () => {
    const old = post(-3, "Old thread", { reply_count: 10 });
    const fresh = post(1, "Fresh thread");
    expect(
      threadsOf([
        old,
        reply(old, -2, "last week"),
        reply(old, -1, "last week"),
        reply(old, 2, "this week"),
        reply(old, 8, "next week"),
        fresh,
        reply(fresh, 1.5, "a"),
        reply(fresh, 2.5, "b"),
      ]),
    ).toEqual([
      ["Fresh thread", 2],
      ["Old thread", 1], // started last week, still counts for this week's replies
    ]);
  });

  it("counts the asker's own replies but not bot replies", () => {
    const p = post(1, "Thread");
    expect(
      threadsOf([
        p,
        reply(p, 1.1, "answer"),
        reply(p, 1.2, "thanks!", "U_ASKER"),
        reply(p, 1.3, "Auto-reply", "B_BOT", { subtype: "bot_message" }),
      ]),
    ).toEqual([["Thread", 2]]);
  });

  it("returns at most 3, most active first, ties going to the older thread", () => {
    const [a, b, c, d] = [1, 2, 3, 4].map((day) => post(day, `T${day}`));
    const replies = (p: SlackMessage, day: number, n: number) =>
      Array.from({ length: n }, (_, i) => reply(p, day + 0.01 * (i + 1), `r${i}`));
    const messages = [a, b, c, d, ...replies(a, 1, 1), ...replies(b, 2, 3), ...replies(c, 3, 1), ...replies(d, 4, 2)];
    // Newest first, like the real export, so input order alone can't break the tie.
    messages.sort((x, y) => Number(y.ts) - Number(x.ts));
    expect(threadsOf(messages)).toEqual([
      ["T2", 3],
      ["T4", 2],
      ["T1", 1], // T1 and T3 tie; T1 is older
    ]);
  });

  it("treats the week as [weekStart, weekStart + 7 days)", () => {
    const p = post(-1, "Thread");
    expect(threadsOf([p, reply(p, 0, "exactly at start"), reply(p, 7, "exactly at end")])).toEqual([["Thread", 1]]);
  });

  it("skips threads with no replies this week", () => {
    const p = post(1, "Quiet thread");
    expect(threadsOf([p])).toEqual([]);
  });

  it("keeps a thread whose parent isn't in the export, with empty text", () => {
    const missingParent = post(-30, "not exported");
    expect(threadsOf([reply(missingParent, 1, "reply")])).toEqual([["", 1]]);
  });
});

describe("unanswered", () => {
  it("lists questions with no replies and skips statements, bots and joins", () => {
    expect(
      unansweredOf([
        post(1, "Is there an API endpoint for creating events?"),
        post(1.1, "PSA: the new events page is live"),
        post(1.2, "Got questions? Bring them!", { user: "B_BOT", subtype: "bot_message" }),
        post(1.3, "<@U1> has joined the channel", { subtype: "channel_join" }),
      ]),
    ).toEqual(["Is there an API endpoint for creating events?"]);
  });

  it("drops a question someone else answered", () => {
    const q = post(1, "How do I export members?");
    expect(unansweredOf([q, reply(q, 1.5, "Settings > Export.")])).toEqual([]);
  });

  it("keeps a question where only the asker replied (bumps)", () => {
    const q = post(1, "How do I export members?");
    expect(unansweredOf([q, reply(q, 2, "bump", "U_ASKER"), reply(q, 3, "anyone? still stuck", "U_ASKER")])).toEqual([
      "How do I export members?",
    ]);
  });

  it("keeps a question the asker solved themselves, so the admin can still see it", () => {
    const q = post(1, "Why won't my domain verify?");
    expect(unansweredOf([q, reply(q, 1.5, "nvm figured it out, TTL hadn't expired", "U_ASKER")])).toEqual([
      "Why won't my domain verify?",
    ]);
  });

  it("keeps a question whose only reply is a bot auto-response", () => {
    const q = post(1, "Can I schedule posts?");
    const bot = reply(q, 1.01, "Thanks for your question! A team member usually replies within 1 business day.", "B_BOT", {
      subtype: "bot_message",
    });
    expect(unansweredOf([q, bot])).toEqual(["Can I schedule posts?"]);
  });

  it("keeps a question whose only replies are me-toos or reactions", () => {
    const q = post(1, "Can I see who RSVP'd but didn't attend?");
    expect(unansweredOf([q, reply(q, 2, "+1, same question"), reply(q, 2.5, "🔥", "U_THIRD")])).toEqual([
      "Can I see who RSVP'd but didn't attend?",
    ]);
  });

  it("ignores answers that arrive after the week ends", () => {
    const q = post(6, "Does the analytics export include DMs?");
    expect(unansweredOf([q, reply(q, 7.5, "No, only public channels.")])).toEqual([
      "Does the analytics export include DMs?",
    ]);
  });

  it("only includes questions posted this week", () => {
    expect(
      unansweredOf([
        post(-0.5, "Asked last week?"),
        post(0, "Asked exactly at week start?"),
        post(7, "Asked exactly at week end?"),
      ]),
    ).toEqual(["Asked exactly at week start?"]);
  });

  it("ignores questions asked inside a thread", () => {
    const ama = post(6, "Hosting an AMA on Monday. Drop your questions in this thread");
    expect(unansweredOf([ama, reply(ama, 6.5, "Will this be recorded?")])).toEqual([]);
  });

  it("puts questions with the most me-toos and bumps first", () => {
    const none = post(1, "No one else cares?");
    const one = post(2, "One +1?");
    const two = post(3, "Bumped and +1'd?");
    expect(
      unansweredOf([
        none,
        one,
        reply(one, 2.5, "+1, same question"),
        two,
        reply(two, 3.5, "bump", "U_ASKER"),
        reply(two, 4, "Same here"),
      ]),
    ).toEqual(["Bumped and +1'd?", "One +1?", "No one else cares?"]);
  });

  it("breaks ties oldest first", () => {
    expect(unansweredOf([post(3, "Newer?"), post(1, "Older?")])).toEqual(["Older?", "Newer?"]);
  });

  it("doesn't count reactions or replies after the week as demand", () => {
    const reacted = post(1, "Got a 🔥 and a late bump?");
    const plusOned = post(2, "Got a +1?");
    expect(
      unansweredOf([
        reacted,
        reply(reacted, 1.5, "🔥"),
        reply(reacted, 7.5, "bump", "U_ASKER"),
        plusOned,
        reply(plusOned, 2.5, "+1"),
      ]),
    ).toEqual(["Got a +1?", "Got a 🔥 and a late bump?"]);
  });
});
