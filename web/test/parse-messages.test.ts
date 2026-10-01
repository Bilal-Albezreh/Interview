import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatSize, MAX_INPUT_BYTES, parseMessages } from "@/lib/parse-messages";

const dataFile = (name: string) => readFileSync(path.join(__dirname, "../../data", name), "utf8");

describe("parseMessages", () => {
  it.each(["sample-messages.json", "messages.json"])("accepts the real export %s unchanged", (file) => {
    const result = parseMessages(dataFile(file));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.messages).toEqual(JSON.parse(dataFile(file)));
  });

  it("accepts an empty channel", () => {
    expect(parseMessages("[]")).toEqual({ ok: true, messages: [] });
  });

  it("drops fields buildDigest doesn't use", () => {
    const result = parseMessages('[{"ts":"1.0","user":"U1","text":"hi","reactions":[{"name":"eyes"}]}]');
    expect(result).toEqual({ ok: true, messages: [{ ts: "1.0", user: "U1", text: "hi" }] });
  });

  it.each([
    ["", "Paste a JSON array of messages, upload a file, or pick a preset."],
    ['{"ts":"1"}', 'Expected a JSON array of messages, like [{ "ts": "1789960000.000200", "user": "U123", "text": "Hi" }].'],
  ])("explains bad input: %j", (input, error) => {
    expect(parseMessages(input)).toEqual({ ok: false, errors: [error] });
  });

  it("reports invalid JSON with the parser's reason", () => {
    const result = parseMessages('[{"ts": }]');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0]).toMatch(/^This isn't valid JSON: /);
  });

  it("names the message and field for each problem", () => {
    const result = parseMessages(
      JSON.stringify([
        { ts: "1.0", user: "U1", text: "fine" },
        { user: "U2", text: "no ts" },
        { ts: "yesterday", user: "U3", text: "bad ts", subtype: "thread_broadcast" },
      ]),
    );
    expect(result).toEqual({
      ok: false,
      errors: [
        'Message 2, field "ts": is missing',
        'Message 3, field "ts": should be a Slack timestamp like "1789960000.000200"',
        expect.stringMatching(/^Message 3, field "subtype": /),
      ],
    });
  });

  it("shows the first 5 problems and counts the rest", () => {
    const result = parseMessages(JSON.stringify(Array.from({ length: 8 }, () => ({ user: "U1", text: "x" }))));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(6);
      expect(result.errors[5]).toBe("…and 3 more problems.");
    }
  });

  it("rejects input over 2 MB before parsing it", () => {
    const big = `["${"x".repeat(MAX_INPUT_BYTES)}"]`;
    expect(parseMessages(big)).toEqual({ ok: false, errors: ["Input is 2.0 MB. The limit is 2 MB."] });
  });
});

describe("formatSize", () => {
  it.each([
    [2, "2 bytes"],
    [80_000, "78 KB"],
    [2.2 * 1024 * 1024, "2.2 MB"],
  ])("%i -> %s", (bytes, text) => expect(formatSize(bytes)).toBe(text));
});
