import { describe, expect, it } from "vitest";
import type { AnsweredBefore } from "@core/answered-before";
import { formatShortDate } from "@/lib/format";
import { answeredBeforeLabel, byQuestion, friendlyReply } from "@/lib/reply";

// The landing-page match from the full export.
const match: AnsweredBefore = {
  question: { ts: "1790489591.045060", user: "U0XDGAKGZBE", text: "How do I change the default landing page for new members?" },
  earlier: { ts: "1790274291.067100", user: "U04BE4W88NT", text: "How do I change the default landing page for new members?" },
  answer: { ts: "1790301448.079750", user: "U01FLLJBK5K", text: "Yes, there's an API endpoint for it, check the docs." },
};

describe("answeredBeforeLabel", () => {
  it("gives the answer's date, and the thread's date when they differ", () => {
    expect(answeredBeforeLabel(match)).toBe("Answered before on Sep 25, in a thread from Sep 24");
  });

  it("gives one date when the question was answered the same day", () => {
    expect(answeredBeforeLabel({ ...match, answer: { ...match.answer, ts: "1790280000.000000" } })).toBe("Answered before on Sep 24");
  });
});

describe("friendlyReply", () => {
  it("is short, friendly, quotes the earlier answer, and mentions no one", () => {
    const reply = friendlyReply(match);
    expect(reply).toBe(
      "Hi! This came up in a thread on Sep 24, and the answer there was: “Yes, there's an API endpoint for it, check the docs.” Hope that helps. If it doesn't, reply here and we'll dig in.",
    );
    expect(reply).not.toMatch(/<@|U0[A-Z0-9]{6,}/); // pasting it can't ping anyone
  });
});

describe("byQuestion", () => {
  it("keys matches by the waiting question's ts", () => {
    expect(byQuestion([match])).toEqual({ "1790489591.045060": match });
  });
});

describe("formatShortDate", () => {
  it("formats a Slack ts as month and day in UTC", () => {
    expect(formatShortDate("1790301448.079750")).toBe("Sep 25"); // 01:57 UTC
  });
});
