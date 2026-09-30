import { describe, expect, it } from "vitest";
import { isQuestion, isRealAnswer, isSelfResolved } from "../src/classify";

// Examples are taken from data/messages.json unless noted.
describe("isQuestion", () => {
  it.each([
    "Is there an API endpoint for creating events?",
    "Has anyone migrated from Circle? How painful was it?",
    "Happy Monday! What's everyone working on this week?",
    // no "?"
    "Anyone have a good onboarding checklist template",
    "Does anyone know if the member directory is searchable by job title",
    "Looking for recommendations on a good webinar tool",
    "Wondering if there's a way to bulk-tag old posts",
    "Curious how people handle offboarding members who leave their company",
    "Would love to hear how others structure their channel list",
  ])("question: %s", (text) => expect(isQuestion(text)).toBe(true));

  it.each([
    "PSA: the new events page is live",
    "Isn't it wild how much engagement a simple poll gets?",
    "Can you believe it's almost Q4 already?",
    "How cool is the new dark mode?",
    "Who else is hyped for the meetup Thursday?! 🎉",
    "Hosting an AMA with our head of product on Monday. Drop your questions in this thread",
    "Looking forward to Thursday!", // made up: "looking for" must not match "looking forward"
    "New guide is up: <https://example.com/guide?id=3|guide>", // made up: "?" inside a link
  ])("not a question: %s", (text) => expect(isQuestion(text)).toBe(false));
});

describe("isRealAnswer", () => {
  it.each([
    "There's a native integration under Settings > Integrations.",
    "No, only public channels.",
    "Livestorm!",
    "I don't think that's supported yet, but there's a feature request thread for it.",
  ])("answer: %s", (text) => expect(isRealAnswer(text)).toBe(true));

  it.each(["+1", "+1, same question", "+1 to all of the above", "Same here", "🔥", "congrats!!", "thanks!", "Saving this", "this is super helpful 🙏"])(
    "not an answer: %s",
    (text) => expect(isRealAnswer(text)).toBe(false),
  );
});

describe("isSelfResolved", () => {
  it("spots the asker solving it", () => {
    expect(isSelfResolved("nvm figured it out, TTL hadn't expired")).toBe(true);
    expect(isSelfResolved("never mind, got it working")).toBe(true);
  });

  it("doesn't treat bumps or thanks as solved", () => {
    expect(isSelfResolved("bump")).toBe(false);
    expect(isSelfResolved("anyone? still stuck on this")).toBe(false);
    expect(isSelfResolved("thanks both!")).toBe(false);
  });
});
