import type { DuplicateQuestion } from "@core/duplicates";
import type { Digest } from "@core/types";
import { formatDay } from "@/lib/format";

/** Questions several people asked this week, and how many of those posts still have no answer. */
export function DuplicateGroups({ groups, unanswered }: { groups: DuplicateQuestion[]; unanswered: Digest["unanswered"] }) {
  if (groups.length === 0) return null;
  const waiting = new Set(unanswered.map((q) => q.ts));

  return (
    <div className="duplicates">
      <h3>Asked more than once</h3>
      <p className="note">
        Questions two or more people asked this week in nearly the same words. One answer, linked from each post,
        covers them all.
      </p>
      <ul>
        {groups.map((g) => {
          const stillWaiting = g.ts.filter((ts) => waiting.has(ts)).length;
          const first = formatDay(g.ts[0]);
          const last = formatDay(g.ts[g.ts.length - 1]);
          return (
            <li key={g.ts[0]} className={stillWaiting > 0 ? "duplicate some-waiting" : "duplicate"}>
              <div className="row">
                <span className="row-text">{g.text}</span>
                <span className="askers">
                  <span className="num">{g.askers.length}</span> people
                </span>
              </div>
              <span className="meta">
                {first === last ? first : `${first} to ${last}`} by {g.askers.join(", ")}.{" "}
                {stillWaiting === 0
                  ? "All answered."
                  : stillWaiting === g.ts.length
                    ? "None answered yet."
                    : `${stillWaiting} of ${g.ts.length} still waiting.`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
