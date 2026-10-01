import { APIConnectionTimeoutError } from "openai";
import { describe, expect, it } from "vitest";
import type { Digest } from "@core/types";
import { promptPayload, toSummaryError, writeSummary, type ResponsesClient } from "@/lib/summarize";

const digest: Digest = {
  topThreads: [{ thread_ts: "1790093100.004410", text: "Has anyone connected HubSpot?", repliesThisWeek: 3 }],
  unanswered: [{ ts: "1790271900.007090", user: "U0G6RB9TXL", text: "Is there an API endpoint for events?" }],
};

function fakeClient(outputText: string) {
  const calls: Parameters<ResponsesClient["responses"]["create"]>[0][] = [];
  const client: ResponsesClient = {
    responses: {
      create: async (body) => {
        calls.push(body);
        return { output_text: outputText };
      },
    },
  };
  return { client, calls };
}

describe("promptPayload", () => {
  it("keeps the text and counts but drops Slack user IDs and timestamps", () => {
    expect(promptPayload(digest)).toEqual({
      topThreads: [{ text: "Has anyone connected HubSpot?", repliesThisWeek: 3 }],
      unansweredMostUrgentFirst: ["Is there an API endpoint for events?"],
    });
  });
});

describe("writeSummary", () => {
  it("sends the payload inside <digest> tags and returns the trimmed text", async () => {
    const { client, calls } = fakeClient("  Quiet week.  ");
    expect(await writeSummary(digest, client, "some-model")).toBe("Quiet week.");
    expect(calls[0].model).toBe("some-model");
    expect(calls[0].input).toBe(`<digest>\n${JSON.stringify(promptPayload(digest), null, 2)}\n</digest>`);
    expect(calls[0].input).not.toContain("U0G6RB9TXL");
  });

  it("treats an empty reply as an error", async () => {
    await expect(writeSummary(digest, fakeClient("   ").client, "m")).rejects.toMatchObject({
      status: 502,
      message: "The AI service returned an empty summary. Try again.",
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
