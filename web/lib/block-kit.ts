import type { Digest } from "@core/types";
import { formatWeekOf } from "./format";

// Slack's documented limits.
const HEADER_MAX = 150;
const SECTION_MAX = 3000;
const MAX_BLOCKS = 50;

export type Block =
  | { type: "header"; text: { type: "plain_text"; text: string } }
  | { type: "section"; text: { type: "mrkdwn"; text: string } }
  | { type: "divider" };

/** Slack treats &, < and > as control characters; unescaped, "<!channel>" in a question would ping everyone. */
export function escapeMrkdwn(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The digest as a Block Kit message: header, the AI summary if there is one, then both lists. */
export function buildBlockKit(
  digest: Digest,
  nudges: Record<string, number>,
  weekStart: Date,
  summary?: string,
): { blocks: Block[] } {
  const blocks: Block[] = [
    { type: "header", text: { type: "plain_text", text: truncate(`Monday digest · ${formatWeekOf(weekStart)}`, HEADER_MAX) } },
  ];

  if (summary) blocks.push(...sections(escapeMrkdwn(summary).split("\n")), { type: "divider" });

  const threads = digest.topThreads.map(
    (t, i) =>
      `${i + 1}. ${escapeMrkdwn(t.text || "(thread start isn't in the export)")} · ${t.repliesThisWeek} ${t.repliesThisWeek === 1 ? "reply" : "replies"} this week`,
  );
  blocks.push(...sections(threads.length ? threads : ["No thread had replies this week."], "*Top threads*"));
  blocks.push({ type: "divider" });

  const waiting = digest.unanswered.map((q) => {
    const n = nudges[q.ts] ?? 0;
    return `• ${escapeMrkdwn(q.text)}${n > 0 ? ` _(${n} ${n === 1 ? "nudge" : "nudges"})_` : ""}`;
  });
  blocks.push(
    ...sections(waiting.length ? waiting : ["Every question posted this week got an answer."], "*Waiting for an answer*"),
  );

  return { blocks: blocks.slice(0, MAX_BLOCKS) };
}

// Packs lines into as few section blocks as fit the 3,000-character limit.
function sections(lines: string[], title?: string): Block[] {
  const out: Block[] = [];
  let current = title ?? "";
  for (const raw of lines) {
    const line = truncate(raw, SECTION_MAX);
    const joined = current ? `${current}\n${line}` : line;
    if (joined.length > SECTION_MAX) {
      out.push(section(current));
      current = line;
    } else {
      current = joined;
    }
  }
  if (current.trim()) out.push(section(current));
  return out;
}

function section(text: string): Block {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
