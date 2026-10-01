import { isMeTooOrBump } from "@core/classify";
import type { Digest, SlackMessage } from "@core/types";

const WEEK_SECONDS = 7 * 24 * 60 * 60;

/**
 * How many "+1, same question" replies and bumps each unanswered question got.
 *
 * buildDigest sorts by this count but doesn't return it, and src/ stays unchanged, so it's
 * recounted here with the same rule: replies from people (no bots) posted before the week
 * ends that are a me-too or a bump. test/nudges.test.ts checks it agrees with buildDigest's order.
 */
export function nudgeCounts(messages: SlackMessage[], weekStart: Date, digest: Digest): Record<string, number> {
  const end = weekStart.getTime() / 1000 + WEEK_SECONDS;
  const counts: Record<string, number> = Object.fromEntries(digest.unanswered.map((q) => [q.ts, 0]));

  for (const m of messages) {
    const isReply = m.thread_ts !== undefined && m.thread_ts !== m.ts;
    if (m.subtype !== undefined || !isReply || !(m.thread_ts! in counts)) continue;
    if (Number(m.ts) < end && isMeTooOrBump(m.text)) counts[m.thread_ts!] += 1;
  }
  return counts;
}
