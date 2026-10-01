import { APIConnectionTimeoutError } from "openai";
import { describe, expect, it } from "vitest";
import type { Digest, SlackMessage } from "@core/types";
import {
  checkMood,
  promptPayload,
  realQuotes,
  toSummaryError,
  weekMessageTexts,
  writeSummary,
  type ResponsesClient,
} from "@/lib/summarize";

const weekStart = new Date("2026-09-21T00:00:00Z");
const START = weekStart.getTime() / 1000;

const digest: Digest = {
  topThreads: [{ thread_ts: "1790093100.004410", text: "Has anyone connected HubSpot?", repliesThisWeek: 3 }],
  unanswered: [{ ts: "1790271900.007090", user: "U0G6RB9TXL", text: "Is there an API endpoint for events?" }],
};
const texts = ["Has anyone connected HubSpot?", "We use a Zapier workflow for that, happy to share it.", "congrats!!"];

function fakeClient(output: unknown) {
  const calls: Parameters<ResponsesClient["responses"]["create"]>[0][] = [];
  const client: ResponsesClient = {
    responses: {
      create: async (body) => {
        calls.push(body);
        return { output_text: typeof output === "string" ? output : JSON.stringify(output) };
      },
    },
  };
  return { client, calls };
}

const mood = { level: "Upbeat", reason: "People thanked each other a lot.", quotes: ["congrats!!"] };

describe("weekMessageTexts", () => {
  it("keeps the text of this week's posts and replies from people, oldest first, and nothing else", () => {
    const at = (h: number) => (START + h * 3600).toFixed(6);
    const messages: SlackMessage[] = [
      { ts: at(5), user: "U2", text: "A reply", thread_ts: at(1) },
      { ts: at(1), user: "U1", text: "A question?" },
      { ts: at(2), user: "B1", text: "Reminder from a bot", subtype: "bot_message" },
      { ts: at(3), user: "U3", text: "<@U3> has joined the channel", subtype: "channel_join" },
      { ts: at(-1), user: "U4", text: "Last week" },
      { ts: at(24 * 7), user: "U5", text: "Next week (exactly at the end)" },
      { ts: at(4), user: "U6", text: "Thanks <@U0G6RB9TXL>, see <https://x.com/a?b=1|the docs>" },
    ];
    expect(weekMessageTexts(messages, weekStart)).toEqual(["A question?", "Thanks @someone, see the docs", "A reply"]);
  });
});

describe("promptPayload", () => {
  it("has the digest's text and counts plus this week's message text, without user IDs or timestamps", () => {
    const payload = promptPayload(digest, texts);
    expect(payload).toEqual({
      topThreads: [{ text: "Has anyone connected HubSpot?", repliesThisWeek: 3 }],
      unansweredMostUrgentFirst: ["Is there an API endpoint for events?"],
      messagesThisWeek: texts,
    });
    expect(JSON.stringify(payload)).not.toMatch(/U0G6RB9TXL|1790271900/);
  });
});

describe("writeSummary", () => {
  it("asks for the structured format in one call and returns the summary and mood", async () => {
    const { client, calls } = fakeClient({ summary: "  Quiet week.  ", mood });
    expect(await writeSummary(digest, texts, client, "some-model")).toEqual({
      summary: "Quiet week.",
      mood: { level: "Upbeat", reason: "People thanked each other a lot.", quotes: ["congrats!!"] },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toBe("some-model");
    expect(calls[0].text.format.type).toBe("json_schema");
    expect(calls[0].input).toBe(`<digest>\n${JSON.stringify(promptPayload(digest, texts), null, 2)}\n</digest>`);
  });

  it("drops quotes that don't appear in this week's messages", async () => {
    const { client } = fakeClient({
      summary: "Busy week.",
      mood: { ...mood, quotes: ["We use a Zapier workflow", "This community is the best!", "congrats!!"] },
    });
    expect((await writeSummary(digest, texts, client, "m")).mood?.quotes).toEqual(["We use a Zapier workflow", "congrats!!"]);
  });

  it("keeps the summary but drops a malformed mood", async () => {
    const { client } = fakeClient({ summary: "Busy week.", mood: { level: "Ecstatic", reason: "x", quotes: [] } });
    expect(await writeSummary(digest, texts, client, "m")).toEqual({ summary: "Busy week.", mood: null });
  });

  it("treats an empty summary or unreadable output as an error", async () => {
    await expect(writeSummary(digest, texts, fakeClient({ summary: "  ", mood }).client, "m")).rejects.toMatchObject({
      status: 502,
      message: "The AI service returned an empty summary. Try again.",
    });
    await expect(writeSummary(digest, texts, fakeClient("Quiet week, not JSON").client, "m")).rejects.toMatchObject({
      status: 502,
      message: "The AI service returned something we couldn't read. Try again.",
    });
  });
});

describe("realQuotes", () => {
  it("keeps exact quotes, whole or partial, and drops the rest", () => {
    expect(realQuotes(["congrats!!", "happy to share it", "Zapier is great"], texts)).toEqual(["congrats!!", "happy to share it"]);
  });

  it("allows for typographic quote marks, extra spaces, and quotes wrapped in quote marks", () => {
    expect(realQuotes(["“We use a Zapier  workflow”", "'congrats!!'"], texts)).toEqual(["We use a Zapier workflow", "congrats!!"]);
    expect(realQuotes(["Can’t wait"], ["Can't wait for Thursday"])).toEqual(["Can't wait"]);
  });

  it("drops repeats, scraps under 4 characters and non-strings, and keeps at most three", () => {
    const many = ["a b c d e f g h"];
    expect(realQuotes(["a b", "a b", 42, "a b c", "b c d", "c d e", "d e f"], many)).toEqual(["a b c", "b c d", "c d e"]);
  });

  it("doesn't let a quote stitch two messages together", () => {
    expect(realQuotes(["Has anyone connected HubSpot? We use a Zapier workflow"], texts)).toEqual([]);
  });
});

describe("checkMood", () => {
  it.each([[null], ["Upbeat"], [{ level: "Upbeat", reason: "", quotes: [] }], [{ level: "upbeat", reason: "x", quotes: [] }]])(
    "rejects %j",
    (bad) => expect(checkMood(bad, texts)).toBeNull(),
  );

  it("keeps a mood with no surviving quotes rather than inventing evidence", () => {
    expect(checkMood({ level: "Mixed", reason: "Some praise, some frustration.", quotes: ["made up"] }, texts)).toEqual({
      level: "Mixed",
      reason: "Some praise, some frustration.",
      quotes: [],
    });
  });
});

describe("toSummaryError", () => {
  it("maps a timeout to 504", () => {
    expect(toSummaryError(new APIConnectionTimeoutError())).toMatchObject({
      status: 504,
      message: "The AI service took too long to respond.",
    });
  });

  it("maps anything unexpected to a generic 502 and keeps the original as the cause", () => {
    const original = new Error("socket hang up");
    expect(toSummaryError(original)).toMatchObject({ status: 502, cause: original });
  });
});
