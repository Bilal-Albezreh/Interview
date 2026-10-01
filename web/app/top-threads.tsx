import type { CSSProperties } from "react";
import type { Digest } from "@core/types";

// The busiest thread's line has this many stitches; the others get proportionally fewer.
const FULL_STITCHES = 36;
const DASH = 9;
const GAP = 6;

/**
 * Each thread gets a running stitch whose length is its replies this week, relative to the
 * busiest thread. With `animate`, the stitches draw in (CSS, skipped for reduced motion).
 */
export function TopThreads({ threads, animate = false }: { threads: Digest["topThreads"]; animate?: boolean }) {
  if (threads.length === 0) return <p className="empty">No thread had replies this week.</p>;
  const most = Math.max(...threads.map((t) => t.repliesThisWeek));

  return (
    <ol className={animate ? "threads animate" : "threads"}>
      {threads.map((t, i) => {
        const share = t.repliesThisWeek / most;
        const stitches = Math.max(1, Math.round(share * FULL_STITCHES));
        return (
          <li key={t.thread_ts} className="thread">
            <div className="row">
              <span className="row-text">{t.text || <em>The thread&rsquo;s first message isn&rsquo;t in the export</em>}</span>
              <span className="replies">
                <span className="num">{t.repliesThisWeek}</span> {t.repliesThisWeek === 1 ? "reply" : "replies"}
              </span>
            </div>
            <svg className="stitch" style={{ "--i": i } as CSSProperties} width="100%" height="6" aria-hidden="true">
              {/* pathLength makes the dash pattern fit the line exactly, so it ends on a whole stitch. */}
              <line x1="0" y1="3" x2={`${share * 100}%`} y2="3" pathLength={stitches * (DASH + GAP) - GAP} />
            </svg>
          </li>
        );
      })}
    </ol>
  );
}
