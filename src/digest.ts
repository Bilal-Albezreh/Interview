import { isMeTooOrBump, isQuestion, isRealAnswer } from "./classify";
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
 *    nobody other than the asker gave a real answer. Most "+1 / same question" and
 *    bump replies first, then oldest first. (Reactions would be a better signal, but
 *    they aren't in the data.)
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
    .map((question) => {
      // Only replies sent before the digest goes out count.
      const replies = (repliesByThread.get(question.ts) ?? []).filter((r) => Number(r.ts) < end);
      return {
        question,
        answered: replies.some((r) => r.user !== question.user && isRealAnswer(r.text)),
        // "+1, same question" and "bump": people telling us this one matters.
        demand: replies.filter((r) => isMeTooOrBump(r.text)).length,
      };
    })
    .filter((q) => !q.answered)
    .sort((a, b) => b.demand - a.demand || byTs(a.question.ts, b.question.ts))
    .map(({ question: { ts, user, text } }) => ({ ts, user, text }));

  return { topThreads, unanswered };
}

// Parents also carry thread_ts (equal to their own ts), so check both.
function isReply(m: SlackMessage): m is SlackMessage & { thread_ts: string } {
  return m.thread_ts !== undefined && m.thread_ts !== m.ts;
}

function byTs(a: string, b: string): number {
  return Number(a) - Number(b);
}
