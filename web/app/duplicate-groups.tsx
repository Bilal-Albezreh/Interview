import type { DuplicateQuestion } from "@core/duplicates";
import type { Digest } from "@core/types";
import { formatDay } from "@/lib/format";
import { Person } from "./person";

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
              <div>
                <p className="row-text">{g.text}</p>
                <p className="meta">
                  <span className="people">
                    {g.askers.map((user) => (
                      <Person key={user} user={user} small />
                    ))}
                  </span>
                  {first === last ? first : `${first} to ${last}`}.{" "}
                  {stillWaiting === 0
                    ? "All answered."
                    : stillWaiting === g.ts.length
                      ? "None answered yet."
                      : `${stillWaiting} of ${g.ts.length} still waiting.`}
                </p>
              </div>
              <span className="count">
                <span className="num">{g.askers.length}</span> people
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
