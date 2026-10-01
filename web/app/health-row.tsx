import type { CommunityHealth } from "@core/health";
import { formatHours, formatRate, formatRateChange, formatTimeChange } from "@/lib/health-format";

/** One quiet row: answer rate and median time to first answer, each against last week. */
export function HealthRow({ health }: { health: CommunityHealth }) {
  const { thisWeek, change } = health;
  return (
    <dl className="health" aria-label="Community health this week">
      <div>
        <dt>Answer rate</dt>
        <dd>
          <span className="value">{formatRate(thisWeek.answerRate)}</span>
          <span className="change">
            {thisWeek.questions > 0 && `${thisWeek.answered} of ${thisWeek.questions} · `}
            {formatRateChange(change.answerRate)}
          </span>
        </dd>
      </div>
      <div>
        <dt>Median time to first answer</dt>
        <dd>
          <span className="value">{formatHours(thisWeek.medianHoursToAnswer)}</span>
          <span className="change">{formatTimeChange(change.medianHoursToAnswer)}</span>
        </dd>
      </div>
    </dl>
  );
}
