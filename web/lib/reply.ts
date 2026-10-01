import type { AnsweredBefore } from "@core/answered-before";
import { formatShortDate } from "./format";

/** Matches keyed by the waiting question's ts, for looking up under each row. */
export function byQuestion(matches: AnsweredBefore[]): Record<string, AnsweredBefore> {
  return Object.fromEntries(matches.map((m) => [m.question.ts, m]));
}

/** Where the earlier answer is from: "Answered before on Sep 25, in a thread from Sep 24". */
export function answeredBeforeLabel(match: AnsweredBefore): string {
  const answered = formatShortDate(match.answer.ts);
  const asked = formatShortDate(match.earlier.ts);
  return answered === asked ? `Answered before on ${answered}` : `Answered before on ${answered}, in a thread from ${asked}`;
}

/**
 * A short, friendly reply an admin can paste into the waiting question's thread. It quotes the
 * earlier answer and names no one, so pasting it never pings anybody. Nothing is sent from here.
 */
export function friendlyReply(match: AnsweredBefore): string {
  return (
    `Hi! This came up in a thread on ${formatShortDate(match.earlier.ts)}, and the answer there was: ` +
    `“${match.answer.text}” Hope that helps. If it doesn't, reply here and we'll dig in.`
  );
}
