import { isQuestion, isRealAnswer, isSelfResolved } from "./classify";
import type { Digest, SlackMessage } from "./types";

const WEEK_SECONDS = 7 * 24 * 60 * 60;
const TOP_THREAD_COUNT = 3;

/**
 * Build the weekly digest for one Slack channel.
 *
 * The week starts at `weekStart` and runs for 7 days: [weekStart, weekStart + 7d).
 *
 * Returns:
 *  - topThreads: the 3 threads with the most replies posted this week, most first.
 *    Threads started before the week count too; `reply_count` is ignored because
 *    it's an all-time total. Ties go to the older thread.
 *  - unanswered: top-level questions posted this week where, by the end of the week,
 *    nobody else gave a real answer and the asker didn't say they solved it.
 *    Oldest first.
 *
 * Bot messages and channel joins are ignored everywhere.
 */
export function buildDigest(messages: SlackMessage[], weekStart: Date): Digest {
  const start = weekStart.getTime() / 1000; // Slack ts is in seconds
  const end = start + WEEK_SECONDS;
  const inWeek = (ts: string) => Number(ts) >= start && Number(ts) < end;

  const textByTs = new Map(messages.map((m) => [m.ts, m.text]));
  const people = messages.filter((m) => m.subtype === undefined);

  const repliesByThread = new Map<string, SlackMessage[]>();
  for (const m of people) {
    if (!isReply(m)) continue;
    const replies = repliesByThread.get(m.thread_ts) ?? [];
    replies.push(m);
    repliesByThread.set(m.thread_ts, replies);
  }

  const topThreads = [...repliesByThread]
    .map(([thread_ts, replies]) => ({
      thread_ts,
      text: textByTs.get(thread_ts) ?? "", // parent may be outside the export
      repliesThisWeek: replies.filter((r) => inWeek(r.ts)).length,
    }))
    .filter((t) => t.repliesThisWeek > 0)
    .sort((a, b) => b.repliesThisWeek - a.repliesThisWeek || byTs(a.thread_ts, b.thread_ts))
    .slice(0, TOP_THREAD_COUNT);

  const unanswered = people
    .filter((m) => !isReply(m) && inWeek(m.ts) && isQuestion(m.text))
    .filter((q) => {
      // Only replies sent before the digest goes out count as answers.
      const replies = (repliesByThread.get(q.ts) ?? []).filter((r) => Number(r.ts) < end);
      const answeredByOthers = replies.some((r) => r.user !== q.user && isRealAnswer(r.text));
      const solvedByAsker = replies.some((r) => r.user === q.user && isSelfResolved(r.text));
      return !answeredByOthers && !solvedByAsker;
    })
    .sort((a, b) => byTs(a.ts, b.ts))
    .map(({ ts, user, text }) => ({ ts, user, text }));

  return { topThreads, unanswered };
}

// Parents also carry thread_ts (equal to their own ts), so check both.
function isReply(m: SlackMessage): m is SlackMessage & { thread_ts: string } {
  return m.thread_ts !== undefined && m.thread_ts !== m.ts;
}

function byTs(a: string, b: string): number {
  return Number(a) - Number(b);
}
