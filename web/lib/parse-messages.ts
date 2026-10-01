import { z } from "zod";
import type { SlackMessage } from "@core/types";

export const MAX_INPUT_BYTES = 2 * 1024 * 1024; // 2 MB
const MAX_ERRORS_SHOWN = 5;

const slackTs = z.string().regex(/^\d+(\.\d+)?$/, { error: 'should be a Slack timestamp like "1789960000.000200"' });

// Mirrors SlackMessage in src/types.ts. Unknown fields (blocks, reactions, ...) are dropped.
const SlackMessageSchema = z.object({
  ts: slackTs,
  thread_ts: slackTs.optional(),
  user: z.string().min(1, { error: "should not be empty" }),
  text: z.string(),
  reply_count: z.number().int().nonnegative().optional(),
  subtype: z.enum(["bot_message", "channel_join"]).optional(),
});

export type ParseResult = { ok: true; messages: SlackMessage[] } | { ok: false; errors: string[] };

export function parseMessages(input: string): ParseResult {
  const bytes = new TextEncoder().encode(input).length;
  if (bytes > MAX_INPUT_BYTES) return fail(`Input is ${formatSize(bytes)}. The limit is 2 MB.`);
  if (input.trim() === "") return fail("Paste a JSON array of messages, upload a file, or pick a preset.");

  let json: unknown;
  try {
    json = JSON.parse(input);
  } catch (err) {
    return fail(`This isn't valid JSON: ${(err as Error).message}`);
  }
  if (!Array.isArray(json)) {
    return fail('Expected a JSON array of messages, like [{ "ts": "1789960000.000200", "user": "U123", "text": "Hi" }].');
  }

  const result = z.array(SlackMessageSchema).safeParse(json);
  if (result.success) return { ok: true, messages: result.data };

  const errors = result.error.issues.slice(0, MAX_ERRORS_SHOWN).map(describeIssue);
  const hidden = result.error.issues.length - errors.length;
  if (hidden > 0) errors.push(`…and ${hidden} more problem${hidden === 1 ? "" : "s"}.`);
  return { ok: false, errors };
}

// "Message 3, field "ts": is missing" instead of zod's raw path and message.
function describeIssue(issue: z.core.$ZodIssue): string {
  const [index, ...field] = issue.path;
  const where =
    typeof index === "number" ? `Message ${index + 1}${field.length ? `, field "${field.join(".")}"` : ""}` : "Input";
  const missing = issue.code === "invalid_type" && issue.message.endsWith("received undefined");
  return `${where}: ${missing ? "is missing" : issue.message}`;
}

function fail(error: string): ParseResult {
  return { ok: false, errors: [error] };
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
