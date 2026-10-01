import { isQuestion } from "./classify";
import type { SlackMessage } from "./types";

const WEEK_SECONDS = 7 * 24 * 60 * 60;

// Share of words two questions must have in common (|shared| / |all|) to count as the same question.
export const MIN_OVERLAP = 0.6;

export type DuplicateQuestion = {
  text: string; // the first time it was asked this week
  askers: string[]; // distinct users, in the order they first asked
  ts: string[]; // every message in the group, oldest first
};

/**
 * Questions posted this week that two or more different people asked in nearly the same words.
 *
 * A deterministic first pass: it compares content words only (no stemming or synonyms), so it
 * catches reposts and light rewording but not a question asked a different way.
 */
export function findDuplicateQuestions(messages: SlackMessage[], weekStart: Date): DuplicateQuestion[] {
  const start = weekStart.getTime() / 1000;
  const end = start + WEEK_SECONDS;

  // The same questions buildDigest looks at: top-level posts from people, posted this week.
  const questions = messages
    .filter((m) => m.subtype === undefined && (m.thread_ts === undefined || m.thread_ts === m.ts))
    .filter((m) => Number(m.ts) >= start && Number(m.ts) < end && isQuestion(m.text))
    .sort((a, b) => Number(a.ts) - Number(b.ts));

  // Oldest first, each question joins the first group whose original it matches, or starts its own.
  // Comparing with the original (not the latest member) stops groups drifting from A to B to C.
  const groups: { words: Set<string>; members: SlackMessage[] }[] = [];
  for (const q of questions) {
    const words = contentWords(q.text);
    if (words.size === 0) continue;
    const group = groups.find((g) => wordOverlap(g.words, words) >= MIN_OVERLAP);
    if (group) group.members.push(q);
    else groups.push({ words, members: [q] });
  }

  return groups
    .map(({ members }) => ({
      text: members[0].text,
      askers: [...new Set(members.map((m) => m.user))],
      ts: members.map((m) => m.ts),
    }))
    .filter((g) => g.askers.length >= 2) // one person reposting isn't "asked by multiple users"
    .sort((a, b) => b.ts.length - a.ts.length || Number(a.ts[0]) - Number(b.ts[0]));
}

// Words that frame a question rather than say what it's about ("is there a way to", "does anyone know").
const FILLER = new Set([
  "a", "an", "the", "and", "or", "but", "if", "so", "of", "to", "in", "on", "at", "by", "for", "from",
  "with", "about", "into", "as", "than", "then",
  "is", "are", "was", "were", "be", "been", "am", "do", "does", "did", "have", "has", "had",
  "i", "im", "ive", "me", "my", "we", "our", "us", "you", "youre", "your", "they", "their", "them",
  "it", "its", "this", "that", "these", "those", "there", "theres", "here",
  "what", "whats", "which", "who", "how", "when", "where", "why",
  "can", "could", "would", "should", "will",
  "any", "anyone", "anybody", "someone", "everyone", "people", "folks", "others", "other", "all",
  "way", "best", "good", "know", "wondering", "curious", "love", "hear", "looking",
  "recommendations", "tips", "ideas", "advice", "thoughts",
  "just", "really", "still", "also", "even", "only", "ever", "usually",
  "dont", "doesnt", "didnt", "isnt", "arent", "cant", "wont",
]);

/** Lowercase, drop Slack markup, punctuation and filler words: what the question is about. */
export function contentWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/<[^>]*>/g, " ") // Slack links and mentions
    .replace(/['’]/g, "") // "what's" -> "whats", "rsvp'd" -> "rsvpd"
    .replace(/[^\p{L}\p{N}]+/gu, " ") // punctuation and emoji become spaces
    .split(" ")
    .filter((w) => w !== "" && !FILLER.has(w));
  return new Set(words);
}

/** Share of content words two questions have in common: |shared| / |all|, 0 to 1. */
export function wordOverlap(a: Set<string>, b: Set<string>): number {
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  const all = a.size + b.size - shared;
  return all === 0 ? 0 : shared / all;
}
