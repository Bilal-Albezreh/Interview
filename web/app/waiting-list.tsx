"use client";

import { useState } from "react";
import type { Digest } from "@core/types";
import { formatDay } from "@/lib/format";
import { Person } from "./person";

// The most-nudged questions come first, so a short list keeps the letter readable.
const SHOWN_AT_FIRST = 8;

export function WaitingList({ questions, nudges }: { questions: Digest["unanswered"]; nudges: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false);
  if (questions.length === 0) return <p className="empty">Every question posted this week got an answer.</p>;

  const visible = expanded ? questions : questions.slice(0, SHOWN_AT_FIRST);
  const hidden = questions.length - SHOWN_AT_FIRST;

  return (
    <>
      <ol className="waiting">
        {visible.map((q) => {
          const n = nudges[q.ts] ?? 0;
          return (
            <li key={q.ts} className="question">
              <Person user={q.user} />
              <div>
                <p className="row-text">{q.text}</p>
                <p className="meta">Asked {formatDay(q.ts)}</p>
              </div>
              <span className="count">
                {n > 0 && (
                  <>
                    <span className="num">{n}</span> {n === 1 ? "nudge" : "nudges"}
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <button className="more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show fewer" : `Show ${hidden} more`}
        </button>
      )}
    </>
  );
}
