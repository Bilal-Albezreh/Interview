// Words for the health row. Direction is spelled out ("down", "faster") rather than signed,
// because "-2 h" is ambiguous when lower is better.

/** 0.556 -> "56%" */
export function formatRate(rate: number | null): string {
  return rate === null ? "No questions" : `${Math.round(rate * 100)}%`;
}

/** 0.67 -> "40 min", 9.87 -> "9.9 hours" */
export function formatHours(hours: number | null): string {
  if (hours === null) return "No answers yet";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  return `${hours.toFixed(1)} hours`;
}

/** -0.147 -> "down 15 points from last week" */
export function formatRateChange(change: number | null): string {
  if (change === null) return "nothing to compare with last week";
  const points = Math.round(change * 100);
  if (points === 0) return "same as last week";
  return `${points > 0 ? "up" : "down"} ${Math.abs(points)} ${Math.abs(points) === 1 ? "point" : "points"} from last week`;
}

/** -2.02 -> "2.0 hours faster than last week" */
export function formatTimeChange(change: number | null): string {
  if (change === null) return "nothing to compare with last week";
  if (Math.abs(change) < 1 / 60) return "same as last week";
  return `${formatHours(Math.abs(change))} ${change < 0 ? "faster" : "slower"} than last week`;
}
