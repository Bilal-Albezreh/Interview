import { isQuestion, isRealAnswer } from "./classify";
import type { SlackMessage } from "./types";

const WEEK_SECONDS = 7 * 24 * 60 * 60;

export type WeekHealth = {
  questions: number; // questions posted this week
  answered: number; // ...that got a real answer from someone else before the week ended
  answerRate: number | null; // answered / questions, 0 to 1; null with no questions
  medianHoursToAnswer: number | null; // over answered questions; null when none were answered
};

export type CommunityHealth = {
  thisWeek: WeekHealth;
  lastWeek: WeekHealth;
  change: {
    answerRate: number | null; // this week minus last week, 0 to 1 scale (0.06 = 6 points)
    medianHoursToAnswer: number | null; // this week minus last week; negative is faster
  };
};

/** Answer rate and median time to first real answer for the week, compared with the week before. */
export function communityHealth(messages: SlackMessage[], weekStart: Date): CommunityHealth {
  const thisWeek = weekHealth(messages, weekStart);
  const lastWeek = weekHealth(messages, new Date(weekStart.getTime() - WEEK_SECONDS * 1000));
  return {
    thisWeek,
    lastWeek,
    change: {
      answerRate: difference(thisWeek.answerRate, lastWeek.answerRate),
      medianHoursToAnswer: difference(thisWeek.medianHoursToAnswer, lastWeek.medianHoursToAnswer),
    },
  };
}

/**
 * Uses the same rules as buildDigest: a question is a top-level post from a person that reads as a
 * question, and it's answered when someone other than the asker gives a real answer (not a bot,
 * not "+1" or "me too", not a reaction) before the week ends. So questions - answered always
 * equals the number of questions buildDigest lists as unanswered.
 */
export function weekHealth(messages: SlackMessage[], weekStart: Date): WeekHealth {
  const start = weekStart.getTime() / 1000;
  const end = start + WEEK_SECONDS;

  const people = messages.filter((m) => m.subtype === undefined);
  const questions = people.filter(
    (m) => (m.thread_ts === undefined || m.thread_ts === m.ts) && Number(m.ts) >= start && Number(m.ts) < end && isQuestion(m.text),
  );

  const hoursToAnswer: number[] = [];
  for (const q of questions) {
    const firstAnswer = people
      .filter((r) => r.thread_ts === q.ts && r.ts !== q.ts && Number(r.ts) < end)
      .filter((r) => r.user !== q.user && isRealAnswer(r.text))
      .sort((a, b) => Number(a.ts) - Number(b.ts))[0];
    if (firstAnswer) hoursToAnswer.push((Number(firstAnswer.ts) - Number(q.ts)) / 3600);
  }

  return {
    questions: questions.length,
    answered: hoursToAnswer.length,
    answerRate: questions.length > 0 ? hoursToAnswer.length / questions.length : null,
    medianHoursToAnswer: median(hoursToAnswer),
  };
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function difference(now: number | null, before: number | null): number | null {
  return now === null || before === null ? null : now - before;
}
