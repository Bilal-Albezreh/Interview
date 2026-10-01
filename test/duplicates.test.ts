import { describe, expect, it } from "vitest";
import { contentWords, findDuplicateQuestions } from "../src/duplicates";
import type { SlackMessage } from "../src/types";
import messages from "../data/messages.json";

const weekStart = new Date("2026-09-21T00:00:00Z");
const START = weekStart.getTime() / 1000;
const DAY = 24 * 60 * 60;

const groups = findDuplicateQuestions(messages as SlackMessage[], weekStart);
const groupFor = (text: string) => groups.find((g) => g.text === text);

// A top-level message `days` into the week.
let n = 0;
const ask = (days: number, user: string, text: string, extra: Partial<SlackMessage> = {}): SlackMessage => ({
  ts: (START + days * DAY + ++n / 1000).toFixed(6),
  user,
  text,
  ...extra,
});

describe("findDuplicateQuestions on data/messages.json", () => {
  it("finds the 8 questions asked more than once this week, most-asked first", () => {
    expect(groups.map((g) => [g.ts.length, g.askers.length, g.text])).toEqual([
      [3, 3, "Who owns community at your company, marketing or CS?"],
      [2, 2, "Would love to hear how others structure their channel list"],
      [2, 2, "Does anyone know if the member directory is searchable by job title"],
      [2, 2, "Are polls anonymous by default?"],
      [2, 2, "Wondering if there's a way to bulk-tag old posts"],
      [2, 2, "How do you all measure community health beyond DAU?"],
      [2, 2, "How do I change the default landing page for new members?"],
      [2, 2, "Curious how people handle offboarding members who leave their company"],
    ]);
  });

  it("returns the askers in order and every message's ts, oldest first", () => {
    expect(groupFor("Who owns community at your company, marketing or CS?")).toEqual({
      text: "Who owns community at your company, marketing or CS?",
      askers: ["U00QKFMKQQA", "U0ZVRMRFV97", "U0DHQD1DQCJ"],
      ts: ["1790145649.085130", "1790172730.037280", "1790302525.096750"],
    });
  });

  it("leaves out copies posted outside the week", () => {
    // Also asked on Sep 14 by U0U0YB5YLH7.
    expect(groupFor("Are polls anonymous by default?")).toEqual({
      text: "Are polls anonymous by default?",
      askers: ["U07566VFKGX", "U0WK1DEGZD8"],
      ts: ["1790129225.027500", "1790173303.097680"],
    });
  });

  it("does not merge a near-miss: same topic words, different question", () => {
    // Both are about "handling members", from different people, but one is offboarding and
    // the other is self-promotion. They share 2 of 8 content words (25%).
    const offboarding = groupFor("Curious how people handle offboarding members who leave their company");
    expect(offboarding?.ts).toEqual(["1790274443.083870", "1790530041.052180"]);
    expect(offboarding?.askers).not.toContain("U0ZVRMRFV97"); // the self-promotion asker
    expect(groups.flatMap((g) => g.ts)).not.toContain("1790315408.092490"); // the self-promotion question
  });

  it("ignores shared question scaffolding like 'is there a way to'", () => {
    // 33% of their raw words match, all filler; 0% of their content words do.
    expect(groups.map((g) => g.text)).not.toContain("Is there a way to schedule posts in advance?");
    expect(groups.map((g) => g.text)).not.toContain("Is there a way to see who RSVP'd but didn't attend?");
  });
});

describe("findDuplicateQuestions on hand-built messages", () => {
  it("merges the same question worded with different filler", () => {
    const result = findDuplicateQuestions(
      [ask(1, "U1", "How do I export members to a CSV?"), ask(2, "U2", "Is there a way to export members as CSV?")],
      weekStart,
    );
    expect(result).toHaveLength(1);
    expect(result[0].askers).toEqual(["U1", "U2"]);
  });

  it("does not merge export vs import, even with the rest of the words shared", () => {
    // {export, members, csv} vs {import, members, csv}: 2 of 4 words, under the 60% bar.
    const result = findDuplicateQuestions(
      [ask(1, "U1", "How do I export members to a CSV?"), ask(2, "U2", "How do I import members from a CSV?")],
      weekStart,
    );
    expect(result).toEqual([]);
  });

  it("only reports questions asked by two or more different people", () => {
    const result = findDuplicateQuestions(
      [ask(1, "U1", "Can I pin a message?"), ask(2, "U1", "Can I pin a message?")],
      weekStart,
    );
    expect(result).toEqual([]);
  });

  it("only looks at questions: not statements, bots, or replies inside threads", () => {
    const parent = ask(1, "U1", "Hosting an AMA Monday, drop your questions in this thread");
    const result = findDuplicateQuestions(
      [
        ask(1, "U1", "Tried the new poll feature, super easy"),
        ask(2, "U2", "Tried the new poll feature, super easy"),
        ask(3, "B1", "Got questions? Bring them!", { subtype: "bot_message" }),
        ask(4, "B2", "Got questions? Bring them!", { subtype: "bot_message" }),
        parent,
        ask(5, "U3", "Will this be recorded?", { thread_ts: parent.ts }),
        ask(6, "U4", "Will this be recorded?", { thread_ts: parent.ts }),
      ],
      weekStart,
    );
    expect(result).toEqual([]);
  });

  it("returns nothing for an empty channel", () => {
    expect(findDuplicateQuestions([], weekStart)).toEqual([]);
  });
});

describe("contentWords", () => {
  it("lowercases and drops punctuation, Slack markup and filler words", () => {
    expect(contentWords("Is there a way to schedule posts in advance?")).toEqual(new Set(["schedule", "posts", "advance"]));
    expect(contentWords("Does anyone know if <@U123> can see RSVP'd members?")).toEqual(new Set(["see", "rsvpd", "members"]));
  });
});
