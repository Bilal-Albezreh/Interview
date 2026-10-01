import type { Digest } from "@core/types";
import { formatTs } from "@/lib/format";

export function DigestLists({ digest }: { digest: Digest }) {
  return (
    <div className="lists">
      <section>
        <h3>Top threads</h3>
        <p className="hint">Most replies posted this week</p>
        {digest.topThreads.length === 0 ? (
          <p className="empty">No thread had replies this week.</p>
        ) : (
          <ol>
            {digest.topThreads.map((t) => (
              <li key={t.thread_ts}>
                <span className="item-text">{t.text || <em>Thread start isn't in the export</em>}</span>
                <span className="meta">
                  {t.repliesThisWeek} {t.repliesThisWeek === 1 ? "reply" : "replies"} this week
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <section>
        <h3>
          Unanswered questions <span className="count">{digest.unanswered.length}</span>
        </h3>
        <p className="hint">Most &ldquo;+1&rdquo;s and bumps first, then oldest first</p>
        {digest.unanswered.length === 0 ? (
          <p className="empty">Every question posted this week got an answer.</p>
        ) : (
          <ol>
            {digest.unanswered.map((q) => (
              <li key={q.ts}>
                <span className="item-text">{q.text}</span>
                <span className="meta">
                  {formatTs(q.ts)} · {q.user}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
