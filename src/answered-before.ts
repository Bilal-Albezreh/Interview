import { isQuestion, isRealAnswer } from "./classify";
import { buildDigest } from "./digest";
import { contentWords, MIN_OVERLAP, wordOverlap } from "./duplicates";
import type { SlackMessage } from "./types";

const WEEK_SECONDS = 7 * 24 * 60 * 60;

type Post = { ts: string; user: string; text: string };

export type AnsweredBefore = {
  question: Post; // still waiting for an answer this week
  earlier: Post; // the same question, asked earlier in the export
  answer: Post; // the earlier question's first real answer (its ts is the date to show)
};

/**
 * For each question buildDigest lists as unanswered, an earlier question in the export that
 * asked the same thing and already has a real answer, so an admin can point the asker to it.
 *
 * "Same thing" uses findDuplicateQuestions' normalisation and bar; "real answer" uses the
 * classify.ts rules (someone other than the asker, not a bot, not "+1" or a reaction), posted
 * before the week ends. With several matches, the closest wording wins, then the most recent.
 */
export function findAnsweredBefore(messages: SlackMessage[], weekStart: Date): AnsweredBefore[] {
  const end = weekStart.getTime() / 1000 + WEEK_SECONDS;
  const people = messages.filter((m) => m.subtype === undefined);

  const firstRealAnswer = (q: SlackMessage) =>
    people
      .filter((r) => r.thread_ts === q.ts && r.ts !== q.ts && r.user !== q.user && Number(r.ts) < end)
      .filter((r) => isRealAnswer(r.text))
      .sort((a, b) => Number(a.ts) - Number(b.ts))[0];

  // Every top-level question with a real answer by the end of the week, newest first.
  const answered = people
    .filter((m) => (m.thread_ts === undefined || m.thread_ts === m.ts) && Number(m.ts) < end && isQuestion(m.text))
    .map((q) => ({ q, words: contentWords(q.text), answer: firstRealAnswer(q) }))
    .filter((c): c is typeof c & { answer: SlackMessage } => c.answer !== undefined)
    .sort((a, b) => Number(b.q.ts) - Number(a.q.ts));

  const results: AnsweredBefore[] = [];
  for (const question of buildDigest(messages, weekStart).unanswered) {
    const words = contentWords(question.text);
    let best: (typeof answered)[number] | undefined;
    let bestScore = -1;
    for (const c of answered) {
      if (Number(c.q.ts) >= Number(question.ts)) continue; // only questions asked before this one
      const score = wordOverlap(words, c.words);
      if (score >= MIN_OVERLAP && score > bestScore) [best, bestScore] = [c, score]; // newest wins ties
    }
    if (best) results.push({ question, earlier: post(best.q), answer: post(best.answer) });
  }
  return results;
}

function post({ ts, user, text }: SlackMessage): Post {
  return { ts, user, text };
}
