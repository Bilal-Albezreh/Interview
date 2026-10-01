// Text heuristics for the digest. These are plain rules, not NLP, so every
// list here was checked against data/messages.json and is meant to be extended.

// Slack wraps links and mentions in <...>. Drop them so a "?" inside a URL
// (https://x.com/page?id=1) doesn't make a message look like a question.
function stripSlackMarkup(text: string): string {
  return text.replace(/<[^>]*>/g, " ");
}

// Lowercase and drop emoji/punctuation so "congrats!!" and "🔥" compare cleanly.
function normalize(text: string): string {
  return stripSlackMarkup(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s+']/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Things people say with a "?" that aren't asking for anything.
const RHETORICAL = [
  /\?!/, // "Who else is hyped for Thursday?!"
  /^(isn['’]?t (it|this|that)|can you believe|who else is|guess what)\b/i,
  /^how (cool|awesome|great|amazing|fun) (is|was)\b/i,
];

// Ways people ask for help without a "?": "Anyone have a template",
// "Wondering if there's a way to...", "Looking for recommendations on...".
const ASKING_WITHOUT_QUESTION_MARK = [
  /^(anyone|anybody|does anyone|has anyone|can anyone|is there|are there|how do (i|we|you))\b/i,
  /\b(looking for|wondering (if|whether|how|what|why)|curious (if|whether|how|what|why)|would love (to hear|any|some)|any (recommendations|tips|advice|ideas|suggestions)|recommendations? (for|on)|does anyone know|need help)\b/i,
];

export function isQuestion(text: string): boolean {
  const t = stripSlackMarkup(text).trim();
  if (RHETORICAL.some((re) => re.test(t))) return false;
  if (t.includes("?")) return true;
  return ASKING_WITHOUT_QUESTION_MARK.some((re) => re.test(t));
}

// Replies saying "I need this answered too": a me-too from someone else
// ("+1, same question") or the asker bumping their own post ("anyone? still stuck").
const ME_TOO = new Set(["same", "same here", "same question", "me too", "following", "subscribing"]);
const BUMP = /^(bump|anyone|any ideas|any help|still stuck|still need)\b/;

export function isMeTooOrBump(text: string): boolean {
  const t = normalize(text);
  return t.startsWith("+1") || ME_TOO.has(t) || BUMP.test(t);
}

// Friendly replies that don't answer anything.
const REACTIONS = new Set([
  "thanks", "thank you", "saving this", "love this", "great idea", "this is awesome",
  "congrats", "nice", "this is super helpful",
]);

export function isRealAnswer(text: string): boolean {
  const t = normalize(text);
  if (t === "") return false; // emoji-only
  return !REACTIONS.has(t) && !isMeTooOrBump(text);
}
