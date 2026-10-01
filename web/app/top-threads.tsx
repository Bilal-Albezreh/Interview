import type { CSSProperties } from "react";
import type { Digest } from "@core/types";

/**
 * Each thread has an inline bar: a faint full-width track with a running-stitch fill whose length
 * is its replies this week, relative to the busiest thread. With `animate`, the stitches draw in
 * (CSS, skipped for reduced motion).
 */
export function TopThreads({ threads, animate = false }: { threads: Digest["topThreads"]; animate?: boolean }) {
  if (threads.length === 0) return <p className="empty">No thread had replies this week.</p>;
  const most = Math.max(...threads.map((t) => t.repliesThisWeek));

  return (
    <ol className={animate ? "threads animate" : "threads"}>
      {threads.map((t, i) => (
        <li key={t.thread_ts} className="thread">
          <p className="row-text">{t.text || <em>The thread&rsquo;s first message isn&rsquo;t in the export</em>}</p>
          <div className="bar-row">
            <div className="track" aria-hidden="true">
              {/* Width is rounded down to whole 10px stitches in CSS, so the fill never ends in a stub. */}
              <svg className="stitches" style={{ "--share": t.repliesThisWeek / most, "--i": i } as CSSProperties} height="3">
                <line x1="1.5" y1="1.5" x2="100%" y2="1.5" />
              </svg>
            </div>
            <span className="count">
              <span className="num">{t.repliesThisWeek}</span> {t.repliesThisWeek === 1 ? "reply" : "replies"}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}
