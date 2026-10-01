import { describe, expect, it } from "vitest";
import { findAnsweredBefore } from "../src/answered-before";
import type { SlackMessage } from "../src/types";
import messages from "../data/messages.json";

const weekStart = new Date("2026-09-21T00:00:00Z");
const START = weekStart.getTime() / 1000;
const HOUR = 60 * 60;

const results = findAnsweredBefore(messages as SlackMessage[], weekStart);
const resultFor = (ts: string) => results.find((r) => r.question.ts === ts);

describe("findAnsweredBefore on data/messages.json", () => {
  it("points the Sep 27 landing-page question to the one asked Sep 24, with its first real answer", () => {
    expect(resultFor("1790489591.045060")).toEqual({
      question: {
        ts: "1790489591.045060",
        user: "U0XDGAKGZBE",
        text: "How do I change the default landing page for new members?",
      },
      earlier: {
        ts: "1790274291.067100", // asked Thu Sep 24, 18:24 UTC
        user: "U04BE4W88NT",
        text: "How do I change the default landing page for new members?",
      },
      answer: {
        ts: "1790301448.079750", // Fri Sep 25, 01:57 UTC; the "+1" after it isn't an answer
        user: "U01FLLJBK5K",
        text: "Yes, there's an API endpoint for it, check the docs.",
      },
    });
  });

  it("does not match a near-miss with shared words", () => {
    // "How do you handle members who only ever post self-promotion?" (Sep 25) is answered, more
    // recent, and shares "handle" and "members" with the offboarding question, but it's a
    // different question. The offboarding question matches its own earlier copy (Sep 16) instead.
    const selfPromotion = "1790315408.092490";
    expect(results.map((r) => r.earlier.ts)).not.toContain(selfPromotion);
    expect(resultFor("1790530041.052180")?.earlier.ts).toBe("1789565846.091350");
  });

  it("only looks up questions that are still waiting, and only earlier ones", () => {
    for (const r of results) expect(Number(r.earlier.ts)).toBeLessThan(Number(r.question.ts));
    // Answered this week, so nothing to look up.
    expect(results.map((r) => r.question.text)).not.toContain("How are folks handling SSO with Okta?");
  });
});

describe("findAnsweredBefore on hand-built messages", () => {
  let n = 0;
  const ask = (hours: number, text: string, user = "U_ASKER"): SlackMessage => ({
    ts: (START + hours * HOUR + ++n / 1e6).toFixed(6),
    user,
    text,
  });
  const reply = (q: SlackMessage, hours: number, text: string, user = "U_HELPER", extra: Partial<SlackMessage> = {}): SlackMessage => ({
    ts: (Number(q.ts) + hours * HOUR).toFixed(6),
    thread_ts: q.ts,
    user,
    text,
    ...extra,
  });

  it("finds an earlier answer from a previous week, worded with different filler", () => {
    const earlier = ask(-72, "How do I export members to a CSV?", "U_FIRST");
    const later = ask(10, "Is there a way to export members as CSV?");
    const [result] = findAnsweredBefore([earlier, reply(earlier, 1, "Members > Export."), later], weekStart);
    expect(result.earlier.ts).toBe(earlier.ts);
    expect(result.answer.text).toBe("Members > Export.");
  });

  it("does not match export vs import, even with the other words shared", () => {
    const earlier = ask(-72, "How do I export members to a CSV?", "U_FIRST");
    const later = ask(10, "How do I import members from a CSV?");
    expect(findAnsweredBefore([earlier, reply(earlier, 1, "Members > Export."), later], weekStart)).toEqual([]);
  });

  it("only counts earlier questions with a real answer from someone else before the week ended", () => {
    const botOnly = ask(-50, "Can I pin a message?", "U1");
    const plusOneOnly = ask(-40, "Can I pin a message?", "U2");
    const askerOnly = ask(-30, "Can I pin a message?", "U3");
    const tooLate = ask(-20, "Can I pin a message?", "U4");
    const later = ask(10, "Can I pin a message?");
    const all = [
      botOnly,
      reply(botOnly, 0.01, "Thanks for your question!", "B_BOT", { subtype: "bot_message" }),
      plusOneOnly,
      reply(plusOneOnly, 1, "+1, same question"),
      askerOnly,
      reply(askerOnly, 1, "nvm figured it out", "U3"),
      tooLate,
      reply(tooLate, 200, "Yes, from the message menu."), // hour 180 of the week: after Sep 28
      later,
    ];
    expect(findAnsweredBefore(all, weekStart)).toEqual([]);
  });

  it("never points to a question asked after the one that's waiting", () => {
    const waiting = ask(10, "Can I pin a message?");
    const afterwards = ask(20, "Can I pin a message?", "U_LATER");
    expect(findAnsweredBefore([waiting, afterwards, reply(afterwards, 1, "Yes.")], weekStart)).toEqual([]);
  });

  it("prefers the closest wording, then the most recent", () => {
    const exact = ask(-100, "Can I pin a message to a channel?", "U1");
    const close = ask(-50, "Can I pin a message to a channel today?", "U2");
    const exactNewer = ask(-10, "Can I pin a message to a channel?", "U3");
    const waiting = ask(10, "Can I pin a message to a channel?");
    const result = findAnsweredBefore(
      [exact, reply(exact, 1, "Yes (1)."), close, reply(close, 1, "Yes (2)."), exactNewer, reply(exactNewer, 1, "Yes (3)."), waiting],
      weekStart,
    );
    expect(result[0].answer.text).toBe("Yes (3).");
  });

  it("uses the first real answer, skipping reactions and me-toos", () => {
    const earlier = ask(-30, "Can I pin a message?", "U1");
    const waiting = ask(10, "Can I pin a message?");
    const result = findAnsweredBefore(
      [earlier, reply(earlier, 1, "🔥"), reply(earlier, 2, "Same here"), reply(earlier, 3, "Yes, from the menu."), reply(earlier, 4, "Or the API."), waiting],
      weekStart,
    );
    expect(result[0].answer.text).toBe("Yes, from the menu.");
  });
});
