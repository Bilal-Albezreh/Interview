import { describe, expect, it } from "vitest";
import { buildDigest } from "../src/digest";
import { communityHealth, weekHealth } from "../src/health";
import type { SlackMessage } from "../src/types";
import messages from "../data/messages.json";
import sampleMessages from "../data/sample-messages.json";

const weekStart = new Date("2026-09-21T00:00:00Z");
const START = weekStart.getTime() / 1000;
const HOUR = 60 * 60;

// Slack-style ts `hours` after weekStart (negative = before the week).
let n = 0;
const at = (hours: number) => (START + hours * HOUR + ++n / 1e6).toFixed(6);

function ask(hours: number, text: string, user = "U_ASKER"): SlackMessage {
  return { ts: at(hours), user, text };
}

function reply(q: SlackMessage, hours: number, text: string, user = "U_OTHER", extra: Partial<SlackMessage> = {}): SlackMessage {
  return { ts: (Number(q.ts) + hours * HOUR).toFixed(6), thread_ts: q.ts, user, text, ...extra };
}

const BOT_REPLY = "Thanks for your question! A team member usually replies within 1 business day.";

describe("weekHealth: answer rate", () => {
  it("counts a question as answered only after a real answer from someone else, within the week", () => {
    const answered = ask(10, "How do I export members?");
    const botOnly = ask(11, "Can I schedule posts?");
    const plusOneOnly = ask(12, "Can I see who RSVP'd?");
    const askerOnly = ask(13, "Why won't my domain verify?");
    const lateAnswer = ask(160, "Does the export include DMs?"); // Sunday afternoon
    const health = weekHealth(
      [
        answered,
        reply(answered, 2, "Settings > Export."),
        botOnly,
        reply(botOnly, 0.01, BOT_REPLY, "B_BOT", { subtype: "bot_message" }),
        plusOneOnly,
        reply(plusOneOnly, 1, "+1, same question"),
        askerOnly,
        reply(askerOnly, 1, "nvm figured it out", "U_ASKER"),
        lateAnswer,
        reply(lateAnswer, 10, "No, only public channels."), // lands after the week ends
      ],
      weekStart,
    );
    expect(health.questions).toBe(5);
    expect(health.answered).toBe(1);
    expect(health.answerRate).toBe(0.2);
  });

  it("only counts questions: not statements, bot posts, or questions inside threads", () => {
    const ama = ask(1, "Hosting an AMA Monday, drop your questions in this thread");
    const health = weekHealth(
      [
        ama,
        reply(ama, 1, "Will this be recorded?", "U_THREAD"),
        ask(2, "PSA: the new events page is live"),
        { ...ask(3, "Got questions? Bring them!", "B_BOT"), subtype: "bot_message" },
        ask(4, "Is there an API endpoint for events?"),
      ],
      weekStart,
    );
    expect(health.questions).toBe(1);
  });

  it("is null, not 0%, when nobody asked anything", () => {
    expect(weekHealth([ask(1, "PSA: office hours moved")], weekStart)).toEqual({
      questions: 0,
      answered: 0,
      answerRate: null,
      medianHoursToAnswer: null,
    });
  });
});

describe("weekHealth: median time to first real answer", () => {
  it("skips bot, '+1' and the asker's own replies to find the first real answer", () => {
    const q = ask(10, "How do I bulk-import members?");
    const health = weekHealth(
      [
        q,
        reply(q, 0.1, BOT_REPLY, "B_BOT", { subtype: "bot_message" }),
        reply(q, 1, "+1, same question"),
        reply(q, 1.5, "me too", "U_THIRD"),
        reply(q, 2, "anyone? still stuck", "U_ASKER"),
        reply(q, 3, "Use the CSV importer under Members."),
        reply(q, 5, "Or the API."),
      ],
      weekStart,
    );
    expect(health.medianHoursToAnswer).toBeCloseTo(3, 6);
  });

  it("leaves out a question whose only reply is a bot", () => {
    const botOnly = ask(10, "Can I schedule posts?");
    const answered = ask(20, "Can I pin a message?");
    const health = weekHealth(
      [
        botOnly,
        reply(botOnly, 0.01, BOT_REPLY, "B_BOT", { subtype: "bot_message" }),
        answered,
        reply(answered, 4, "Yes, from the message menu."),
      ],
      weekStart,
    );
    expect(health.answered).toBe(1);
    expect(health.answerRate).toBe(0.5);
    expect(health.medianHoursToAnswer).toBeCloseTo(4, 6); // not dragged down by the bot's 36 seconds
  });

  it("takes the middle value, or the mean of the middle two", () => {
    const answeredAfter = (hours: number[]) =>
      hours.flatMap((h, i) => {
        const q = ask(i, `Question ${i}?`);
        return [q, reply(q, h, `Answer ${i}.`)];
      });
    expect(weekHealth(answeredAfter([10, 1, 3]), weekStart).medianHoursToAnswer).toBeCloseTo(3, 6);
    expect(weekHealth(answeredAfter([20, 1, 10, 3]), weekStart).medianHoursToAnswer).toBeCloseTo(6.5, 6);
  });

  it("is null when nothing was answered", () => {
    expect(weekHealth([ask(1, "Anyone?")], weekStart).medianHoursToAnswer).toBeNull();
  });
});

describe("communityHealth: this week against last week", () => {
  it("measures the previous 7 days the same way and reports the change", () => {
    const lastA = ask(-100, "Last week, answered?");
    const lastB = ask(-90, "Last week, unanswered?");
    const thisA = ask(10, "This week, quick?");
    const thisB = ask(20, "This week, slower?");
    const result = communityHealth(
      [lastA, reply(lastA, 4, "Answer."), lastB, thisA, reply(thisA, 1, "Answer."), thisB, reply(thisB, 3, "Answer.")],
      weekStart,
    );
    expect(result.thisWeek).toMatchObject({ questions: 2, answered: 2, answerRate: 1 });
    expect(result.lastWeek).toMatchObject({ questions: 2, answered: 1, answerRate: 0.5 });
    expect(result.thisWeek.medianHoursToAnswer).toBeCloseTo(2, 6);
    expect(result.lastWeek.medianHoursToAnswer).toBeCloseTo(4, 6);
    expect(result.change.answerRate).toBeCloseTo(0.5, 6); // up 50 points
    expect(result.change.medianHoursToAnswer).toBeCloseTo(-2, 6); // 2 hours faster
  });

  it("has no change to report when last week had no questions", () => {
    const q = ask(10, "Anyone?");
    expect(communityHealth([q, reply(q, 1, "Yes.")], weekStart).change).toEqual({
      answerRate: null,
      medianHoursToAnswer: null,
    });
  });
});

describe("communityHealth on the real exports", () => {
  const all = messages as SlackMessage[];
  const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * HOUR * 1000);

  it("agrees with buildDigest: questions minus answered = unanswered, this week and last", () => {
    const { thisWeek, lastWeek } = communityHealth(all, weekStart);
    expect(thisWeek.questions - thisWeek.answered).toBe(buildDigest(all, weekStart).unanswered.length);
    expect(lastWeek.questions - lastWeek.answered).toBe(buildDigest(all, lastWeekStart).unanswered.length);
    expect(thisWeek).toMatchObject({ questions: 45, answered: 25 });
  });

  it("times the sample's one answer at 40 minutes", () => {
    // HubSpot question at 1790093100; first real answer (Zapier) at 1790095500: 2,400 s.
    const { thisWeek } = communityHealth(sampleMessages as SlackMessage[], weekStart);
    expect(thisWeek).toMatchObject({ questions: 2, answered: 1, answerRate: 0.5 });
    expect(thisWeek.medianHoursToAnswer).toBeCloseTo(40 / 60, 3);
  });
});
